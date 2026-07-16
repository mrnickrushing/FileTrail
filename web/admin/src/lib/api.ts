const headers = () => {
  const key = process.env.BACKEND_API_KEY ?? '';
  if (!key) {
    console.warn('[api] BACKEND_API_KEY is not set — requests will be rejected with 401');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
};

// /v1/admin/* routes are gated by the backend's ADMIN_KEY, not the regular
// API_KEY — set BACKEND_ADMIN_KEY when they're different secrets. Falls
// back to BACKEND_API_KEY so existing deployments that use one shared
// value for both keep working unchanged.
const adminHeaders = () => {
  const key = process.env.BACKEND_ADMIN_KEY || process.env.BACKEND_API_KEY || '';
  if (!key) {
    console.warn('[api] BACKEND_ADMIN_KEY/BACKEND_API_KEY is not set — admin requests will be rejected');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
};

async function doFetch<T>(path: string, init: RequestInit | undefined, headerFn: () => Record<string, string>): Promise<T> {
  const base = process.env.BACKEND_URL ?? 'http://localhost:4000';
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...headerFn(), ...(init?.headers ?? {}) } });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return doFetch<T>(path, init, headers);
}

export async function adminApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return doFetch<T>(path, init, adminHeaders);
}

export type HealthResponse = {
  ok: boolean;
  service: string;
  time: string;
  integrations: Record<string, boolean>;
};

export type ConfigResponse = {
  apiVersion: number;
  features: Record<string, boolean>;
  integrations: Record<string, boolean>;
};

export type AdminStatsResponse = {
  userCount: number;
  documentCount: number;
  totalStorageBytes: number;
  eventCount: number;
  recentActiveUsers: number;
};

export type ShareLink = {
  token: string;
  documentId: string;
  title: string;
  expiresAt: string;
  passwordProtected: boolean;
  createdAt: string;
};

export type ShareLinkSummary = ShareLink & {
  url: string;
  expired: boolean;
};

export type AnalyticsEvent = {
  id: string;
  event: string;
  deviceId?: string;
  userId?: string;
  properties?: Record<string, string | number | boolean>;
  createdAt: string;
};

export async function getHealth() {
  // Backend /health verifies its store dependency (PostgresStore runs SELECT 1).
  return apiFetch<HealthResponse>('/health');
}

export async function getConfig() {
  return apiFetch<ConfigResponse>('/v1/config');
}

// Aggregate backend stats. Uses the admin-authed /v1/admin/stats endpoint
// (gated by ADMIN_KEY) — NOT /v1/sync/pull, which is a per-user storage
// endpoint that requires an individual user's storage token and returns
// "Storage access denied" for the dashboard.
export async function getAdminStats() {
  return adminApiFetch<AdminStatsResponse>('/v1/admin/stats');
}

export async function getShareLinks() {
  return adminApiFetch<{ shareLinks: ShareLinkSummary[] }>('/v1/admin/share-links');
}

export async function broadcastNotification(title: string, body: string, filter?: { isPro?: boolean }) {
  return adminApiFetch<{ ok: boolean; recipientCount: number; notificationId: string }>(
    '/v1/admin/notifications/broadcast',
    { method: 'POST', body: JSON.stringify({ title, body, filter }) },
  );
}

export type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  provider: string;
  isPro: boolean;
  createdAt: string;
};

export async function getUsers() {
  return adminApiFetch<{ users: UserRecord[] }>('/v1/admin/users');
}

export async function deleteUser(id: string) {
  return adminApiFetch<{ ok: boolean }>(`/v1/admin/users/${id}`, { method: 'DELETE' });
}
