import * as SQLite from 'expo-sqlite';
import { Document, DocumentFolder, DocumentTag, DocumentComment } from '@/types';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('papertrail.db');
  }
  return _db;
}

// ─── Schema ────────────────────────────────────────────────────────────────────

export async function initDb(): Promise<void> {
  const db = getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS folders (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      icon        TEXT,
      color       TEXT,
      parent_id   TEXT REFERENCES folders(id) ON DELETE SET NULL,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id    TEXT PRIMARY KEY,
      name  TEXT NOT NULL UNIQUE,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS documents (
      id             TEXT PRIMARY KEY,
      title          TEXT NOT NULL,
      category       TEXT NOT NULL DEFAULT 'other',
      folder_id      TEXT REFERENCES folders(id) ON DELETE SET NULL,
      file_uri       TEXT NOT NULL,
      thumbnail_uri  TEXT,
      mime_type      TEXT NOT NULL,
      file_size      INTEGER NOT NULL DEFAULT 0,
      page_count     INTEGER,
      ocr_text       TEXT,
      ocr_status     TEXT NOT NULL DEFAULT 'pending',
      notes          TEXT,
      is_favorite    INTEGER NOT NULL DEFAULT 0,
      is_locked      INTEGER NOT NULL DEFAULT 0,
      expires_at     INTEGER,
      reminder_at    INTEGER,
      health_score   INTEGER,
      created_at     INTEGER NOT NULL,
      updated_at     INTEGER NOT NULL,
      synced_at      INTEGER,
      cloud_id       TEXT
    );

    CREATE TABLE IF NOT EXISTS document_tags (
      document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      tag_id       TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (document_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS document_comments (
      id           TEXT PRIMARY KEY,
      document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      text         TEXT NOT NULL,
      created_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_documents_folder    ON documents(folder_id);
    CREATE INDEX IF NOT EXISTS idx_documents_category  ON documents(category);
    CREATE INDEX IF NOT EXISTS idx_documents_created   ON documents(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_documents_favorite  ON documents(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_documents_ocr       ON documents(ocr_status);
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts
      USING fts5(id UNINDEXED, title, ocr_text, notes, content=documents, content_rowid=rowid);
  `);
}

// ─── Documents ─────────────────────────────────────────────────────────────────

export async function insertDocument(doc: Document): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO documents (
       id, title, category, folder_id, file_uri, thumbnail_uri, mime_type,
       file_size, page_count, ocr_text, ocr_status, notes,
       is_favorite, is_locked, expires_at, reminder_at, health_score,
       created_at, updated_at, synced_at, cloud_id
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      doc.id, doc.title, doc.category, doc.folderId ?? null,
      doc.fileUri, doc.thumbnailUri ?? null, doc.mimeType,
      doc.fileSize, doc.pageCount ?? null, doc.ocrText ?? null, doc.ocrStatus,
      doc.notes ?? null, doc.isFavorite ? 1 : 0, doc.isLocked ? 1 : 0,
      doc.expiresAt ?? null, doc.reminderAt ?? null, doc.healthScore ?? null,
      doc.createdAt, doc.updatedAt, doc.syncedAt ?? null, doc.cloudId ?? null,
    ],
  );
  if (doc.tags.length > 0) {
    for (const tagId of doc.tags) {
      await db.runAsync(
        'INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?,?)',
        [doc.id, tagId],
      );
    }
  }
}

export async function updateDocument(doc: Partial<Document> & { id: string }): Promise<void> {
  const db = getDb();
  const now = Date.now();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  const map: Record<string, keyof typeof doc> = {
    title: 'title', category: 'category', folder_id: 'folderId',
    thumbnail_uri: 'thumbnailUri', ocr_text: 'ocrText', ocr_status: 'ocrStatus',
    notes: 'notes', is_favorite: 'isFavorite', is_locked: 'isLocked',
    expires_at: 'expiresAt', reminder_at: 'reminderAt', health_score: 'healthScore',
    synced_at: 'syncedAt', cloud_id: 'cloudId',
  };

  for (const [col, key] of Object.entries(map)) {
    if (key in doc && doc[key] !== undefined) {
      fields.push(`${col} = ?`);
      const val = doc[key];
      if (typeof val === 'boolean') {
        values.push(val ? 1 : 0);
      } else {
        values.push(val as string | number | null);
      }
    }
  }

  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(now);
  values.push(doc.id);

  await db.runAsync(
    `UPDATE documents SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );

  if (doc.tags !== undefined) {
    await db.runAsync('DELETE FROM document_tags WHERE document_id = ?', [doc.id]);
    for (const tagId of doc.tags) {
      await db.runAsync(
        'INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?,?)',
        [doc.id, tagId],
      );
    }
  }
}

export async function deleteDocument(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM documents WHERE id = ?', [id]);
}

export async function getDocument(id: string): Promise<Document | null> {
  const db = getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM documents WHERE id = ?', [id],
  );
  if (!row) return null;
  return rowToDocument(db, row);
}

export async function listDocuments(
  folderId?: string | null,
  category?: string,
  limit = 50,
  offset = 0,
): Promise<Document[]> {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number | null)[] = [];

  if (folderId !== undefined) {
    conditions.push('folder_id IS ?');
    params.push(folderId);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM documents ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return Promise.all(rows.map((r) => rowToDocument(db, r)));
}

export async function searchDocuments(query: string): Promise<Document[]> {
  const db = getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT d.* FROM documents d
     JOIN documents_fts fts ON fts.id = d.id
     WHERE documents_fts MATCH ?
     ORDER BY rank LIMIT 50`,
    [query],
  );
  return Promise.all(rows.map((r) => rowToDocument(db, r)));
}

async function rowToDocument(
  db: SQLite.SQLiteDatabase,
  row: Record<string, unknown>,
): Promise<Document> {
  const tagRows = await db.getAllAsync<{ tag_id: string }>(
    'SELECT tag_id FROM document_tags WHERE document_id = ?',
    [row.id as string],
  );
  return {
    id:            row.id as string,
    title:         row.title as string,
    category:      row.category as Document['category'],
    folderId:      row.folder_id as string | null,
    tags:          tagRows.map((t) => t.tag_id),
    fileUri:       row.file_uri as string,
    thumbnailUri:  row.thumbnail_uri as string | null,
    mimeType:      row.mime_type as string,
    fileSize:      row.file_size as number,
    pageCount:     row.page_count as number | null,
    ocrText:       row.ocr_text as string | null,
    ocrStatus:     row.ocr_status as Document['ocrStatus'],
    notes:         row.notes as string | null,
    isFavorite:    Boolean(row.is_favorite),
    isLocked:      Boolean(row.is_locked),
    expiresAt:     row.expires_at as number | null,
    reminderAt:    row.reminder_at as number | null,
    healthScore:   row.health_score as number | null,
    createdAt:     row.created_at as number,
    updatedAt:     row.updated_at as number,
    syncedAt:      row.synced_at as number | null,
    cloudId:       row.cloud_id as string | null,
  };
}

// ─── Folders ───────────────────────────────────────────────────────────────────

export async function listFolders(): Promise<DocumentFolder[]> {
  const db = getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM folders ORDER BY name ASC',
  );
  return rows.map((r) => ({
    id:        r.id as string,
    name:      r.name as string,
    icon:      r.icon as string | undefined,
    color:     r.color as string | undefined,
    parentId:  r.parent_id as string | null,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number,
  }));
}

export async function insertFolder(folder: DocumentFolder): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'INSERT INTO folders (id, name, icon, color, parent_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [folder.id, folder.name, folder.icon ?? null, folder.color ?? null,
     folder.parentId ?? null, folder.createdAt, folder.updatedAt],
  );
}

export async function deleteFolder(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM folders WHERE id = ?', [id]);
}

// ─── Tags ──────────────────────────────────────────────────────────────────────

export async function listTags(): Promise<DocumentTag[]> {
  const db = getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM tags ORDER BY name ASC');
  return rows.map((r) => ({
    id:    r.id as string,
    name:  r.name as string,
    color: r.color as string | undefined,
  }));
}

export async function insertTag(tag: DocumentTag): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO tags (id, name, color) VALUES (?,?,?)',
    [tag.id, tag.name, tag.color ?? null],
  );
}

export async function deleteTag(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM tags WHERE id = ?', [id]);
}

// ─── Comments ──────────────────────────────────────────────────────────────────

export async function listComments(documentId: string): Promise<DocumentComment[]> {
  const db = getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM document_comments WHERE document_id = ? ORDER BY created_at ASC',
    [documentId],
  );
  return rows.map((r) => ({
    id:         r.id as string,
    documentId: r.document_id as string,
    text:       r.text as string,
    createdAt:  r.created_at as number,
  }));
}

export async function insertComment(comment: DocumentComment): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'INSERT INTO document_comments (id, document_id, text, created_at) VALUES (?,?,?,?)',
    [comment.id, comment.documentId, comment.text, comment.createdAt],
  );
}

export async function deleteComment(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM document_comments WHERE id = ?', [id]);
}
