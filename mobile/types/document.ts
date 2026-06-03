export type DocumentCategory =
  | 'receipt'
  | 'contract'
  | 'id'
  | 'warranty'
  | 'medical'
  | 'tax'
  | 'other';

export interface DocumentTag {
  id: string;
  name: string;
  color?: string;
}

export interface DocumentFolder {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Document {
  id: string;
  title: string;
  category: DocumentCategory;
  folderId?: string | null;
  tags: string[];          // tag IDs
  fileUri: string;         // local file:// URI
  thumbnailUri?: string | null;
  mimeType: string;        // 'application/pdf' | 'image/jpeg' | etc
  fileSize: number;        // bytes
  pageCount?: number | null;
  ocrText?: string | null; // extracted text for search
  ocrStatus: 'pending' | 'processing' | 'done' | 'failed' | 'skipped';
  notes?: string | null;
  isFavorite: boolean;
  isLocked: boolean;
  expiresAt?: number | null; // unix ms, optional expiry date
  reminderAt?: number | null;
  healthScore?: number | null; // 0-100
  createdAt: number;       // unix ms
  updatedAt: number;
  syncedAt?: number | null;  // null = not synced (Pro)
  cloudId?: string | null;   // remote ID (Pro)
}

export interface DocumentComment {
  id: string;
  documentId: string;
  text: string;
  createdAt: number;
}

export type SortField = 'title' | 'createdAt' | 'updatedAt' | 'fileSize' | 'category';
export type SortDirection = 'asc' | 'desc';

export interface SearchFilters {
  query?: string;
  category?: DocumentCategory;
  folderId?: string;
  tags?: string[];
  isFavorite?: boolean;
  sortBy?: SortField;
  sortDir?: SortDirection;
}
