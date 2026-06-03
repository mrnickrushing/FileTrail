/**
 * documentStore.ts — Zustand store for documents, folders, tags
 *
 * Updated in Phase 2 to add:
 * - addDocument() — persists to DB + file storage, updates in-memory list
 * - updateDocument() — partial update (for post-OCR updates)
 * - Maintains existing Phase 1 API (loadDocuments, removeDocument, etc.)
 */

import { create } from 'zustand';
import { db } from '@/services/db';
import { deleteDocumentFiles } from '@/services/fileStorage';
import type { Document, DocumentFolder, DocumentTag } from '@/types/document';

interface NewDocumentInput {
  id: string;
  title: string;
  category: Document['category'];
  fileUri: string;
  thumbnailUri: string | null;
  mimeType: string;
  fileSizeBytes: number;
  pageCount: number;
  ocrText?: string;
  ocrStatus: Document['ocrStatus'];
  isFavorite: boolean;
  folderId: string | null;
  tags: string[];
}

interface DocumentState {
  documents: Document[];
  folders: DocumentFolder[];
  tags: DocumentTag[];
  isLoading: boolean;
  searchQuery: string;
  activeCategory: Document['category'] | null;

  loadDocuments: () => Promise<void>;
  addDocument: (input: NewDocumentInput) => Promise<void>;
  updateDocument: (id: string, patch: Partial<Document>) => Promise<void>;
  removeDocument: (id: string) => Promise<void>;

  loadFolders: () => Promise<void>;
  addFolder: (name: string, color?: string) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;

  setSearchQuery: (q: string) => void;
  setActiveCategory: (cat: Document['category'] | null) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  folders: [],
  tags: [],
  isLoading: false,
  searchQuery: '',
  activeCategory: null,

  loadDocuments: async () => {
    set({ isLoading: true });
    try {
      const docs = await db.getDocuments();
      set({ documents: docs });
    } finally {
      set({ isLoading: false });
    }
  },

  addDocument: async (input: NewDocumentInput) => {
    const now = new Date().toISOString();
    const doc: Document = {
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    await db.insertDocument(doc);
    set(s => ({ documents: [doc, ...s.documents] }));
  },

  updateDocument: async (id: string, patch: Partial<Document>) => {
    await db.updateDocument(id, patch);
    set(s => ({
      documents: s.documents.map(d =>
        d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d
      ),
    }));
  },

  removeDocument: async (id: string) => {
    await db.deleteDocument(id);
    await deleteDocumentFiles(id);
    set(s => ({ documents: s.documents.filter(d => d.id !== id) }));
  },

  loadFolders: async () => {
    const folders = await db.getFolders();
    set({ folders });
  },

  addFolder: async (name: string, color = '#6B7280') => {
    const folder = await db.insertFolder(name, color);
    set(s => ({ folders: [...s.folders, folder] }));
  },

  removeFolder: async (id: string) => {
    await db.deleteFolder(id);
    set(s => ({ folders: s.folders.filter(f => f.id !== id) }));
  },

  setSearchQuery: (q: string) => set({ searchQuery: q }),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
}));
