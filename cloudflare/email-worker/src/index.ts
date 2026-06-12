import PostalMime from 'postal-mime';

interface Env {
  BACKEND_URL: string;
  API_KEY?: string;
}

// Cloudflare Email Worker — receives emails forwarded by Email Routing and
// posts their metadata to the FileTrail backend /v1/email/inbound endpoint.
export default {
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    const raw = await new Response(message.raw).arrayBuffer();
    const parsed = await PostalMime.parse(raw);

    const attachments = (parsed.attachments ?? [])
      .map((att) => ({
        filename: att.filename ?? `attachment.${att.mimeType?.split('/')[1] ?? 'bin'}`,
        mimeType: att.mimeType ?? 'application/octet-stream',
        sizeBytes: att.content?.byteLength ?? 0,
      }))
      .filter((att) => att.filename && att.mimeType);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (env.API_KEY) headers['Authorization'] = `Bearer ${env.API_KEY}`;

    const resp = await fetch(`${env.BACKEND_URL}/v1/email/inbound`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender: message.from,
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
