import type {
  AnalyticsRecord,
  DocumentRecord,
  EmailInboundRecord,
  ShareLinkCreateInput,
  FolderRecord,
  ShareLinkRecord,
  ShareLinkStoreRecord,
  TombstoneRecord,
} from './types.js';

export type SyncPushInput = {
  documents: DocumentRecord[];
  folders: FolderRecord[];
  deletedDocumentIds: string[];
  deletedFolderIds: string[];
};

export type SyncPullOutput = {
  syncVersion: number;
  documents: DocumentRecord[];
  folders: FolderRecord[];
  tombstones: TombstoneRecord[];
};

export interface FiletrailStore {
  init(): Promise<void>;
  push(input: SyncPushInput): Promise<{ syncVersion: number }>;
  pull(sinceVersion: number): Promise<SyncPullOutput>;
  createShareLink(input: ShareLinkCreateInput): Promise<ShareLinkRecord>;
  getShareLink(token: string): Promise<ShareLinkStoreRecord | null>;
  listShareLinks(limit?: number): Promise<ShareLinkRecord[]>;
  addInboundEmail(input: Omit<EmailInboundRecord, 'id' | 'receivedAt'>): Promise<EmailInboundRecord>;
  addAnalytics(events: Array<Omit<AnalyticsRecord, 'id' | 'createdAt'>>): Promise<number>;
  getAnalytics(limit?: number): Promise<AnalyticsRecord[]>;
}
