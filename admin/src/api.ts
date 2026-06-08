const BACKEND = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://papertrail-production-de23.up.railway.app';

export const KEY_NAME = 'ft_admin_key';
export const getKey = () => sessionStorage.getItem(KEY_NAME);
export const setKey = (k: string) => sessionStorage.setItem(KEY_NAME, k);
export const clearKey = () => sessionStorage.removeItem(KEY_NAME);

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = getKey();
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 401) {
    clearKey();
    window.location.hash = '#/';
    throw new Error('Session expired — please log in again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

import type { AdminStats, AnalyticsEvent, Notification, ShareLink, User } from './types';

export const api = {
  getConfig: () => req<{ apiVersion: number }>('GET', '/v1/config'),
  getStats: () => req<AdminStats>('GET', '/v1/admin/stats'),
  listUsers: () => req<{ users: User[] }>('GET', '/v1/admin/users'),
  updateUser: (id: string, patch: Partial<User>) => req<{ ok: boolean; user: User }>('PATCH', `/v1/admin/users/${id}`, patch),
  deleteUser: (id: string) => req<{ ok: boolean }>('DELETE', `/v1/admin/users/${id}`),
  getNotifications: () => req<{ notifications: Notification[] }>('GET', '/v1/notifications'),
  broadcast: (payload: { title: string; body: string; filter?: { isPro?: boolean } }) =>
    req<{ ok: boolean; recipientCount: number; notificationId: string }>('POST', '/v1/notifications/broadcast', payload),
  getAnalytics: () => req<{ events: AnalyticsEvent[] }>('GET', '/v1/analytics/events'),
  listShareLinks: () => req<{ shareLinks: ShareLink[] }>('GET', '/v1/share-links'),
  deleteShareLink: (token: string) => req<{ ok: boolean }>('DELETE', `/v1/admin/share-links/${token}`),
};
