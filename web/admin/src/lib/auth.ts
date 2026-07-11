import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE = 'pt_admin_session';

/**
 * Read ADMIN_PASSWORD at call-time rather than at module initialisation.
 *
 * Next.js evaluates module-level code during the build/bundle phase, before
 * runtime environment variables are injected. Reading the variable inside a
 * function guarantees we always get the live value from the process environment
 * when the function is actually invoked on the server.
 */
function getAdminPassword(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    console.warn(
      '[auth] ADMIN_PASSWORD environment variable is not set. ' +
        'Admin login is disabled until ADMIN_PASSWORD is set.'
    );
    return null;
  }
  return pw;
}

/**
 * Session token derived from ADMIN_PASSWORD via a keyed hash — never the
 * password itself, so a cookie leak (log capture, XSS, browser extension)
 * doesn't hand over the literal admin credential. Rotating ADMIN_PASSWORD
 * automatically invalidates all existing sessions.
 */
function sessionToken(password: string): string {
  return createHmac('sha256', password).update('filetrail-admin-session').digest('hex');
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const val = store.get(SESSION_COOKIE)?.value;
  const password = getAdminPassword();
  if (!password || !val) return false;
  const expected = sessionToken(password);
  const a = Buffer.from(val);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyPassword(password: string): boolean {
  const configuredPassword = getAdminPassword();
  return Boolean(configuredPassword && password === configuredPassword);
}

export function createSessionToken(password: string): string {
  return sessionToken(password);
}

export { SESSION_COOKIE };
