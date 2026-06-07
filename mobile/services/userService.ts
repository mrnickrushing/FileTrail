import { apiRequest, isBackendConfigured } from './api';

export { hashPassword, verifyPassword } from './hashUtils';

export async function registerUserWithBackend(params: {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  provider: 'email' | 'apple';
  appleUserId?: string;
}): Promise<{ ok: boolean; userId?: string }> {
  if (!isBackendConfigured()) return { ok: true };
  try {
    const result = await apiRequest<{ ok: boolean; userId: string }>('/v1/auth/register', {
      method: 'POST',
      body: params,
    });
    return result;
  } catch {
    return { ok: false };
  }
}
