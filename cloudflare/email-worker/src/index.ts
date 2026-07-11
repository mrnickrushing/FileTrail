import PostalMime from 'postal-mime';

interface Env {
  BACKEND_URL: string;
  API_KEY?: string;
  INBOUND_EMAIL_SECRET?: string;
}

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20 MB per attachment

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// postal-mime only returns string content when `attachmentEncoding` is set
// explicitly (we don't set it, so this is always ArrayBuffer/Uint8Array in
// practice) — handled for type-correctness against the library's declared type.
function attachmentSizeBytes(content: string | ArrayBuffer | Uint8Array, encoding?: 'base64' | 'utf8'): number {
  if (typeof content !== 'string') return content.byteLength;
  return encoding === 'base64' ? content.length : new TextEncoder().encode(content).byteLength;
}

function attachmentToBase64(content: string | ArrayBuffer | Uint8Array, encoding?: 'base64' | 'utf8'): string {
  if (typeof content === 'string') {
    return encoding === 'base64' ? content : bytesToBase64(new TextEncoder().encode(content));
  }
  return bytesToBase64(content instanceof Uint8Array ? content : new Uint8Array(content));
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    const raw = await new Response(message.raw).arrayBuffer();
    const parsed = await PostalMime.parse(raw);

    const attachments = (parsed.attachments ?? [])
      .filter((att) => att.filename && att.mimeType && att.content)
      .map((att) => {
        const entry: {
          filename: string;
          mimeType: string;
          sizeBytes: number;
          content?: string;
        } = {
          filename: att.filename ?? `attachment.${att.mimeType?.split('/')[1] ?? 'bin'}`,
          mimeType: att.mimeType ?? 'application/octet-stream',
          sizeBytes: att.content ? attachmentSizeBytes(att.content, att.encoding) : 0,
        };
        if (att.content && entry.sizeBytes <= MAX_ATTACHMENT_BYTES) {
          entry.content = attachmentToBase64(att.content, att.encoding);
        }
        return entry;
      });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (env.API_KEY) headers['Authorization'] = `Bearer ${env.API_KEY}`;
    // Proves this request actually came from the worker, not just anyone
    // holding the public API key — see backend/src/app.ts's /v1/email/inbound
    // handler for why the API key alone isn't sufficient here.
    if (env.INBOUND_EMAIL_SECRET) headers['X-FileTrail-Inbound-Secret'] = env.INBOUND_EMAIL_SECRET;

    const resp = await fetch(`${env.BACKEND_URL}/v1/email/inbound`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender: message.from,
        recipient: message.to,
        subject: parsed.subject ?? '',
        attachments,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`FileTrail backend returned ${resp.status}: ${body}`);
    }
  },
};
