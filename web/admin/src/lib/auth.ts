import { cookies } from 'next/headers';

const SESSION_COOKIE = 'pt_admin_session';

/**
 * Read ADMIN_PASSWORD at call-time rather than at module initialisation.
 *
 * Next.js evaluates module-level code during the build/bundle phase, before
 * runtime environment variables are injected. Reading the variable inside a
 * function guarantees we always get the live value from the process environment
 * when the function is actually invoked on the server.
 */
function getAdminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    console.warn(
      '[auth] ADMIN_PASSWORD environment variable is not set. ' +
        'Falling back to default password. ' +
        'Set ADMIN_PASSWORD in your Railway service variables.'
    );
    return 'changeme';
  }
  return pw;
}

export function isAuthenticated(): boolean {
  const store = cookies();
  const val = store.get(SESSION_COOKIE)?.value;
  return val === getAdminPassword();
}

export function verifyPassword(password: string): boolean {
  return password === getAdminPassword();
}

export { SESSION_COOKIE };
