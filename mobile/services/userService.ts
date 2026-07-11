import { apiRequest, isBackendConfigured } from './api';

export { hashPassword, verifyPassword } from './hashUtils';

export type BackendAuthResult = {
  ok: boolean;
  userId?: string;
  storageAccessToken?: string;
  fullName?: string;
  email?: string;
  provider?: 'email' | 'apple';
  appleUserId?: string;
  createdAt?: string;
  isPro?: boolean;
  /** The backend's actual error message (e.g. "Email already registered"),
   * when the request reached the server but was rejected. Absent for
   * genuine network failures/timeouts. */
  error?: string;
};

function errorMessage(err: unknown): string | undefined {
  return err instanceof Error ? err.message : undefined;
}

export async function registerUserWithBackend(params: {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  provider: 'email' | 'apple';
  appleUserId?: string;
}): Promise<BackendAuthResult> {
  if (!isBackendConfigured()) return { ok: true };
  try {
    const result = await apiRequest<BackendAuthResult>('/v1/auth/register', {
      method: 'POST',
      body: params,
    });
    return result;
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function loginUserWithBackend(params: {
  email: string;
  password: string;
}): Promise<BackendAuthResult> {
  if (!isBackendConfigured()) return { ok: true };
  try {
    const result = await apiRequest<BackendAuthResult>('/v1/auth/login', {
      method: 'POST',
      body: params,
    });
    return result;
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function signInWithAppleBackend(params: {
  identityToken: string;
  nonce: string;
  email?: string;
  fullName?: string;
  appleUserId?: string;
}): Promise<BackendAuthResult> {
  if (!isBackendConfigured()) return { ok: true };
  try {
    return await apiRequest<BackendAuthResult>('/v1/auth/apple', {
      method: 'POST',
      body: params,
    });
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
