export interface User {
  id: string;
  fullName: string;
  email: string;
  provider: 'email' | 'apple';
  isPro: boolean;
  createdAt: string;
}

export interface AdminStats {
  userCount: number;
  documentCount: number;
  totalStorageBytes: number;
  eventCount: number;
  recentActiveUsers: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  recipientCount: number;
  filter: { isPro?: boolean } | null;
}

export interface AnalyticsEvent {
  id: string;
  event: string;
  deviceId?: string;
  userId?: string;
  properties?: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface ShareLink {
  token: string;
  documentId: string;
  title: string;
  expiresAt: string;
  passwordProtected: boolean;
  createdAt: string;
  expired?: boolean;
  url?: string;
}
