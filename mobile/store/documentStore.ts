/**
 * documentStore.ts — Zustand store for documents + folders
 *
 * Phase 3 additions:
 *   - Folder CRUD (addFolder, updateFolder, deleteFolder)
 *   - moveDocumentToFolder
 *   - search() — full-text search across title + OCR + category + tags
 *   - getFolderDocuments(folderId)
 *   - getDocument(id) selector
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nanoid } from 'nanoid/non-secure';
import type { Document, Folder, SearchResult, DocumentCategory } from '@/types/document';
import { deleteDocumentFiles } from '@/services/fileStorage';

interface DocumentState {
  documents: Document[];
  folders: Folder[];

  // ─── Document actions ────────────────────────────────────────
  addDocument: (doc: Omit<Document, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDocument: (id: string, patch: Partial<Document>) => void;
  deleteDocument: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  moveDocumentToFolder: (documentId: string, folderId: string | null) => void;

  // ─── Folder actions ──────────────────────────────────────────
  addFolder: (name: string, color?: string) => Folder;
  updateFolder: (id: string, patch: Partial<Pick<Folder, 'name' | 'color'>>) => void;
  deleteFolder: (id: string, moveDocumentsToRoot?: boolean) => Promise<void>;

  // ─── Selectors ───────────────────────────────────────────────
  getDocument: (id: string) => Document | undefined;
  getFolderDocuments: (folderId: string | null) => Document[];
  search: (query: string) => SearchResult[];
}

/** Build a plain-text snippet around the first occurrence of `term` in `text` */
function buildSnippet(text: string, term: string, windowChars = 120): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());
  if (idx === -1) return text.slice(0, windowChars);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + term.length + 80);
  const raw = text.slice(start, end);
  const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return (start > 0 ? '…' : '') + raw.replace(re, '<mark>$1</mark>') + (end < text.length ? '…' : '');
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documents: [],
      folders: [],

      // ─── Document actions ──────────────────────────────────────
      addDocument: async (doc) => {
        const now = new Date().toISOString();
        const full: Document = { ...doc, createdAt: now, updatedAt: now };
        set(s => ({ documents: [full, ...s.documents] }));
      },

      updateDocument: (id, patch) => {
        set(s => ({
          documents: s.documents.map(d =>
            d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d
          ),
        }));
      },

      deleteDocument: async (id) => {
        const doc = get().documents.find(d => d.id === id);
        set(s => ({ documents: s.documents.filter(d => d.id !== id) }));
        if (doc) {
          await deleteDocumentFiles(id).catch(() => {/* best-effort */});
        }
      },

      toggleFavorite: (id) => {
        set(s => ({
          documents: s.documents.map(d =>
            d.id === id
              ? { ...d, isFavorite: !d.isFavorite, updatedAt: new Date().toISOString() }
              : d
          ),
        }));
      },

      moveDocumentToFolder: (documentId, folderId) => {
        set(s => ({
          documents: s.documents.map(d =>
            d.id === documentId
              ? { ...d, folderId, updatedAt: new Date().toISOString() }
              : d
          ),
        }));
      },

      // ─── Folder actions ────────────────────────────────────────
      addFolder: (name, color = '#F59E0B') => {
        const now = new Date().toISOString();
        const folder: Folder = { id: nanoid(), name, color, createdAt: now, updatedAt: now };
        set(s => ({ folders: [...s.folders, folder] }));
        return folder;
      },

      updateFolder: (id, patch) => {
        set(s => ({
          folders: s.folders.map(f =>
            f.id === id ? { ...f, ...patch, updatedAt: new Date().toISOString() } : f
          ),
        }));
      },

      deleteFolder: async (id, moveDocumentsToRoot = true) => {
        if (moveDocumentsToRoot) {
          set(s => ({
            folders: s.folders.filter(f => f.id !== id),
            documents: s.documents.map(d =>
              d.folderId === id ? { ...d, folderId: null, updatedAt: new Date().toISOString() } : d
            ),
          }));
        } else {
          // delete folder + all its documents
          const toDelete = get().documents.filter(d => d.folderId === id);
          set(s => ({
            folders: s.folders.filter(f => f.id !== id),
            documents: s.documents.filter(d => d.folderId !== id),
          }));
          await Promise.all(toDelete.map(d => deleteDocumentFiles(d.id).catch(() => {})));
        }
      },

      // ─── Selectors ─────────────────────────────────────────────
      getDocument: (id) => get().documents.find(d => d.id === id),

      getFolderDocuments: (folderId) =>
        get().documents.filter(d => d.folderId === folderId),

      search: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        const results: SearchResult[] = [];

        for (const doc of get().documents) {
          const matchedFields: SearchResult['matchedFields'] = [];
          let snippet: string | null = null;

          if (doc.title.toLowerCase().includes(q)) {
            matchedFields.push('title');
          }
          if (doc.category.toLowerCase().includes(q)) {
            matchedFields.push('category');
          }
          if (doc.tags.some(t => t.toLowerCase().includes(q))) {
            matchedFields.push('tags');
          }
          if (doc.ocrText && doc.ocrText.toLowerCase().includes(q)) {
            matchedFields.push('ocrText');
            snippet = buildSnippet(doc.ocrText, q);
          }

          if (matchedFields.length > 0) {
            results.push({ document: doc, snippet, matchedFields });
          }
        }

        // Sort: title matches first, then recency
        return results.sort((a, b) => {
          const aTitle = a.matchedFields.includes('title') ? 0 : 1;
          const bTitle = b.matchedFields.includes('title') ? 0 : 1;
          if (aTitle !== bTitle) return aTitle - bTitle;
          return b.document.updatedAt.localeCompare(a.document.updatedAt);
        });
      },
    }),
    {
      name: 'papertrail-documents-v2',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
