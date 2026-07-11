/**
 * Derives the local-part slug used for a user's inbound-email forwarding
 * address (`filetrail+{slug}@domain`). Lossy/one-way by design — resolving a
 * slug back to a user requires matching against `emailSlug(user.email)`,
 * not decoding it.
 */
export function emailSlug(email: string): string {
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 48);
}

/** Extracts the `{slug}` portion out of a `filetrail+{slug}@domain` recipient address, if present. */
export function slugFromRecipient(recipient: string | undefined): string | null {
  if (!recipient) return null;
  const match = recipient.match(/^[^+@]+\+([^@]+)@/);
  return match ? match[1].toLowerCase() : null;
}
