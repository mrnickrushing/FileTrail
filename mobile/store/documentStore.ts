import { create } from 'zustand';
import { Document, DocumentFolder, DocumentTag, SearchFilters } from '@/types';
import {
  listDocuments, insertDocument, updateDocument, deleteDocument,
  listFolders, insertFolder, deleteFolder,
  listTags, insertTag, deleteTag,
  searchDocuments,
} from '@/services/db';

interface DocumentState {
  documents:    Document[];
  folders:      DocumentFolder[];
  tags:         DocumentTag[];
  isLoading:    boolean;
  error:        string | null;
  filters:      SearchFilters;

  // Actions
  loadDocuments:  (filters?: SearchFilters) => Promise<void>;
  loadFolders:    () => Promise<void>;
  loadTags:       () => Promise<void>;
  addDocument:    (doc: Document) => Promise<void>;
  editDocument:   (doc: Partial<Document> & { id: string }) => Promise<void>;
  removeDocument: (id: string) => Promise<void>;
  addFolder:      (folder: DocumentFolder) => Promise<void>;
  removeFolder:   (id: string) => Promise<void>;
  addTag:         (tag: DocumentTag) => Promise<void>;
  removeTag:      (id: string) => Promise<void>;
  setFilters:     (filters: SearchFilters) => void;
  search:         (query: string) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  folders:   [],
  tags:      [],
  isLoading: false,
  error:     null,
  filters:   {},

  loadDocuments: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const f = filters ?? get().filters;
      let docs: Document[];
      if (f.query && f.query.trim().length > 0) {
        docs = await searchDocuments(f.query.trim());
      } else {
        docs = await listDocuments(f.folderId, f.category, 100, 0);
      }
      // Client-side sort
      const sortBy  = f.sortBy  ?? 'createdAt';
      const sortDir = f.sortDir ?? 'desc';
      docs.sort((a, b) => {
        const aVal = a[sortBy] as number | string;
        const bVal = b[sortBy] as number | string;
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
      if (f.isFavorite) docs = docs.filter((d) => d.isFavorite);
      set({ documents: docs, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  loadFolders: async () => {
    const folders = await listFolders();
    set({ folders });
  },

  loadTags: async () => {
    const tags = await listTags();
    set({ tags });
  },

  addDocument: async (doc) => {
    await insertDocument(doc);
    await get().loadDocuments();
  },

  editDocument: async (doc) => {
    await updateDocument(doc);
    await get().loadDocuments();
  },

  removeDocument: async (id) => {
    await deleteDocument(id);
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
  },

  addFolder: async (folder) => {
    await insertFolder(folder);
    await get().loadFolders();
  },

  removeFolder: async (id) => {
    await deleteFolder(id);
    set((s) => ({ folders: s.folders.filter((f) => f.id !== id) }));
  },

  addTag: async (tag) => {
    await insertTag(tag);
    await get().loadTags();
  },

  removeTag: async (id) => {
    await deleteTag(id);
    set((s) => ({ tags: s.tags.filter((t) => t.id !== id) }));
  },

  setFilters: (filters) => {
    set({ filters });
    get().loadDocuments(filters);
  },

  search: async (query) => {
    get().setFilters({ ...get().filters, query });
  },
}));
