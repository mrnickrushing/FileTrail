import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { MIGRATIONS } from './migrations.js';
import type { FiletrailStore, SyncPullOutput, SyncPushInput } from './storeInterface.js';
import type {
  AnalyticsRecord,
  EmailInboundRecord,
  ShareLinkCreateInput,
  ShareLinkRecord,
  ShareLinkStoreRecord,
  UserRecord,
} from './types.js';
import { toPublicShareLinkRecord } from './shareLinks.js';

const { Pool } = pg;

function newStorageAccessToken(): string {
  return randomUUID().replace(/-/g, '');
}

function placeholders(rowCount: number, columnCount: number): string {
  return Array.from({ length: rowCount }, (_row, rowIndex) => {
    const cols = Array.from({ length: columnCount }, (_col, colIndex) => `$${rowIndex * columnCount + colIndex + 1}`);
    return `(${cols.join(', ')})`;
  }).join(', ');
}

function flattenRows(rows: unknown[][]): unknown[] {
  return rows.flatMap((row) => row);
}

function bulkInsertSql(table: string, columns: string[], rowCount: number, conflictClause?: string): string {
  return [
    'INSERT INTO',
    table,
    `(${columns.join(', ')})`,
    'VALUES',
    placeholders(rowCount, columns.length),
    conflictClause,
  ].filter(Boolean).join(' ');
}

function userUpdateSetSql(columns: string[]): string {
  return columns.map((column, index) => `${column} = $${index + 1}`).join(', ');
}

export class PostgresStore implements FiletrailStore {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    // `rejectUnauthorized: false` accepts the DB's certificate without
    // validating it, which permits MITM on an untrusted network path. Many
    // managed Postgres providers (including Railway) work fine with proper
    // validation; set PGSSL_STRICT=true once you've confirmed your provider
    // doesn't need the relaxed mode, and this will start rejecting invalid
    // certs. Left permissive by default here to avoid breaking an existing
    // deployment without warning.
    const sslStrict = process.env.PGSSL_STRICT === 'true';
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: sslStrict } : undefined,
    });
  }

  async init(): Promise<void> {
    await this.migrate();
  }

  async healthCheck(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id integer PRIMARY KEY,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await client.query('BEGIN');
      let migrationIndex = 0;
      while (migrationIndex < MIGRATIONS.length) {
        const migration = MIGRATIONS[migrationIndex];
        const existing = await client.query('SELECT id FROM schema_migrations WHERE id = $1', [migration.id]);
        if (!existing.rowCount) {
          await client.query(migration.sql);
          await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
        }
        migrationIndex += 1;
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async ensureUserStorageToken(id: string): Promise<string | null> {
    const existing = await this.getUserById(id);
    if (!existing) return null;
    if (existing.storageAccessToken) return existing.storageAccessToken;
    const token = newStorageAccessToken();
    await this.updateUser(id, { storageAccessToken: token });
    return token;
  }

  async push(input: SyncPushInput): Promise<{ syncVersion: number }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      let syncVersion = await this.currentVersion(client);

      const folderRows = input.folders.map((folder) => {
        syncVersion += 1;
        const payload = { ...folder, syncVersion };
        return [folder.id, JSON.stringify(payload), syncVersion, folder.updatedAt];
      });
      if (folderRows.length > 0) {
        await client.query(
          bulkInsertSql(
            'folders',
            ['id', 'payload', 'sync_version', 'updated_at'],
            folderRows.length,
            `ON CONFLICT (id) DO UPDATE
             SET payload = EXCLUDED.payload,
                 sync_version = EXCLUDED.sync_version,
                 updated_at = EXCLUDED.updated_at`,
          ),
          flattenRows(folderRows),
        );
      }

      const documentRows = input.documents.map((document) => {
        syncVersion += 1;
        const payload = { ...document, syncVersion };
        return [document.id, JSON.stringify(payload), syncVersion, document.updatedAt];
      });
      if (documentRows.length > 0) {
        await client.query(
          bulkInsertSql(
            'documents',
            ['id', 'payload', 'sync_version', 'updated_at'],
            documentRows.length,
            `ON CONFLICT (id) DO UPDATE
             SET payload = EXCLUDED.payload,
                 sync_version = EXCLUDED.sync_version,
                 updated_at = EXCLUDED.updated_at`,
          ),
          flattenRows(documentRows),
        );
      }

      if (input.deletedDocumentIds.length > 0) {
        await client.query('DELETE FROM documents WHERE id = ANY($1::text[])', [input.deletedDocumentIds]);
      }
      const deletedDocumentRows = input.deletedDocumentIds.map((id) => {
        syncVersion += 1;
        return [id, 'document', new Date().toISOString(), syncVersion];
      });

      if (input.deletedFolderIds.length > 0) {
        await client.query('DELETE FROM folders WHERE id = ANY($1::text[])', [input.deletedFolderIds]);
      }
      const deletedFolderRows = input.deletedFolderIds.map((id) => {
        syncVersion += 1;
        return [id, 'folder', new Date().toISOString(), syncVersion];
      });

      const tombstoneRows = [...deletedDocumentRows, ...deletedFolderRows];
      if (tombstoneRows.length > 0) {
        await client.query(
          bulkInsertSql(
            'tombstones',
            ['id', 'kind', 'deleted_at', 'sync_version'],
            tombstoneRows.length,
            `ON CONFLICT (id, kind) DO UPDATE
             SET deleted_at = EXCLUDED.deleted_at,
                 sync_version = EXCLUDED.sync_version`,
          ),
          flattenRows(tombstoneRows),
        );
      }

      await client.query('UPDATE sync_state SET sync_version = $1 WHERE id = true', [syncVersion]);
      await client.query('COMMIT');
      return { syncVersion };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async pull(sinceVersion: number): Promise<SyncPullOutput> {
    const [state, documents, folders, tombstones] = await Promise.all([
      this.pool.query<{ sync_version: string }>('SELECT sync_version FROM sync_state WHERE id = true'),
      this.pool.query<{ payload: unknown }>('SELECT payload FROM documents WHERE sync_version > $1 ORDER BY sync_version ASC', [sinceVersion]),
      this.pool.query<{ payload: unknown }>('SELECT payload FROM folders WHERE sync_version > $1 ORDER BY sync_version ASC', [sinceVersion]),
      this.pool.query<{ id: string; kind: 'document' | 'folder'; deleted_at: Date; sync_version: string }>(
        'SELECT id, kind, deleted_at, sync_version FROM tombstones WHERE sync_version > $1 ORDER BY sync_version ASC',
        [sinceVersion],
      ),
    ]);

    return {
      syncVersion: Number(state.rows[0]?.sync_version ?? 0),
      documents: documents.rows.map((row) => row.payload as SyncPullOutput['documents'][number]),
      folders: folders.rows.map((row) => row.payload as SyncPullOutput['folders'][number]),
      tombstones: tombstones.rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        deletedAt: row.deleted_at.toISOString(),
        syncVersion: Number(row.sync_version),
      })),
    };
  }

  async createShareLink(input: ShareLinkCreateInput): Promise<ShareLinkRecord> {
    const token = randomUUID().replace(/-/g, '');
    const createdAt = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO share_links (token, document_id, title, expires_at, password_protected, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [token, input.documentId, input.title, input.expiresAt, Boolean(input.passwordHash), input.passwordHash ?? null, createdAt],
    );
    return {
      token,
      documentId: input.documentId,
      title: input.title,
      expiresAt: input.expiresAt,
      passwordProtected: Boolean(input.passwordHash),
      createdAt,
    };
  }

  async getShareLink(token: string): Promise<ShareLinkStoreRecord | null> {
    const res = await this.pool.query<{
      token: string;
      document_id: string;
      title: string;
      expires_at: Date;
      password_protected: boolean;
      password_hash: string | null;
      created_at: Date;
    }>('SELECT * FROM share_links WHERE token = $1', [token]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      token: row.token,
      documentId: row.document_id,
      title: row.title,
      expiresAt: row.expires_at.toISOString(),
      passwordProtected: row.password_protected,
      passwordHash: row.password_hash ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  async listShareLinks(limit = 200): Promise<ShareLinkRecord[]> {
    const res = await this.pool.query<{
      token: string;
      document_id: string;
      title: string;
      expires_at: Date;
      password_protected: boolean;
      password_hash: string | null;
      created_at: Date;
    }>(
      `SELECT token, document_id, title, expires_at, password_protected, password_hash, created_at
       FROM share_links
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );

    return res.rows.map((row) => toPublicShareLinkRecord({
      token: row.token,
      documentId: row.document_id,
      title: row.title,
      expiresAt: row.expires_at.toISOString(),
      passwordProtected: row.password_protected,
      passwordHash: row.password_hash ?? undefined,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async addInboundEmail(input: Omit<EmailInboundRecord, 'id' | 'receivedAt'>): Promise<EmailInboundRecord> {
    const id = randomUUID();
    const receivedAt = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO inbound_emails (id, recipient, owner_user_id, owner_email, sender, subject, attachments, received_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        input.recipient ?? null,
        input.ownerUserId ?? null,
        input.ownerEmail ?? null,
        input.sender,
        input.subject,
        JSON.stringify(input.attachments),
        receivedAt,
      ],
    );
    return { ...input, id, receivedAt };
  }

  async listInboundEmails(limit = 100, ownerEmail?: string): Promise<EmailInboundRecord[]> {
    const res = await this.pool.query<{
      id: string;
      recipient: string | null;
      owner_user_id: string | null;
      owner_email: string | null;
      sender: string;
      subject: string;
      attachments: Array<{ filename: string; mimeType: string; sizeBytes: number }> | string;
      received_at: Date;
    }>(
      ownerEmail
        ? `SELECT id, recipient, owner_user_id, owner_email, sender, subject, attachments, received_at
           FROM inbound_emails
           WHERE owner_email = $2
           ORDER BY received_at DESC
           LIMIT $1`
        : `SELECT id, recipient, owner_user_id, owner_email, sender, subject, attachments, received_at
           FROM inbound_emails
           ORDER BY received_at DESC
           LIMIT $1`,
      ownerEmail ? [limit, ownerEmail.toLowerCase()] : [limit],
    );
    return res.rows.map((row) => ({
      id: row.id,
      recipient: row.recipient ?? undefined,
      ownerUserId: row.owner_user_id ?? undefined,
      ownerEmail: row.owner_email ?? undefined,
      sender: row.sender,
      subject: row.subject,
      attachments: Array.isArray(row.attachments) ? row.attachments : JSON.parse(row.attachments || '[]'),
      receivedAt: row.received_at.toISOString(),
    }));
  }

  async addAnalytics(events: Array<Omit<AnalyticsRecord, 'id' | 'createdAt'>>): Promise<number> {
    if (events.length === 0) return 0;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const rows = events.map((event) => [
        randomUUID(),
        event.event,
        event.deviceId ?? null,
        event.userId ?? null,
        event.properties ? JSON.stringify(event.properties) : null,
        new Date().toISOString(),
      ]);
      await client.query(
        bulkInsertSql(
          'analytics_events',
          ['id', 'event', 'device_id', 'user_id', 'properties', 'created_at'],
          rows.length,
        ),
        flattenRows(rows),
      );
      await client.query('COMMIT');
      return events.length;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAnalytics(limit = 500): Promise<AnalyticsRecord[]> {
    const res = await this.pool.query<{
      id: string; event: string; device_id: string | null; user_id: string | null;
      properties: string | null; created_at: string;
    }>(
      'SELECT id, event, device_id, user_id, properties, created_at FROM analytics_events ORDER BY created_at DESC LIMIT $1',
      [limit],
    );
    return res.rows.map(r => ({
      id: r.id,
      event: r.event,
      deviceId: r.device_id ?? undefined,
      userId: r.user_id ?? undefined,
      properties: r.properties ? JSON.parse(r.properties) : undefined,
      createdAt: r.created_at,
    }));
  }

  async registerUser(input: Omit<UserRecord, 'isPro' | 'createdAt'>): Promise<UserRecord> {
    const createdAt = new Date().toISOString();
    const inserted = await this.pool.query(
      `INSERT INTO users (id, full_name, email, password_hash, provider, apple_user_id, storage_access_token, is_pro, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8)
       ON CONFLICT (email) DO NOTHING`,
      [
        input.id,
        input.fullName,
        input.email,
        input.passwordHash,
        input.provider,
        input.appleUserId ?? null,
        input.storageAccessToken || newStorageAccessToken(),
        createdAt,
      ],
    );
    if (inserted.rowCount === 0) {
      throw new Error('Email already registered');
    }
    const existing = await this.getUserByEmail(input.email);
    if (!existing) throw new Error('Registration failed');
    if (!existing.storageAccessToken) {
      const token = newStorageAccessToken();
      await this.updateUser(existing.id, { storageAccessToken: token });
      return { ...existing, storageAccessToken: token };
    }
    return existing;
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    const res = await this.pool.query<{
      id: string; full_name: string; email: string; password_hash: string;
      provider: string; apple_user_id: string | null; storage_access_token: string | null; is_pro: boolean; created_at: Date;
    }>('SELECT * FROM users WHERE id = $1', [id]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      passwordHash: row.password_hash,
      provider: row.provider as 'email' | 'apple',
      appleUserId: row.apple_user_id ?? undefined,
      storageAccessToken: row.storage_access_token ?? '',
      isPro: row.is_pro,
      createdAt: row.created_at.toISOString(),
    };
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const res = await this.pool.query<{
      id: string; full_name: string; email: string; password_hash: string;
      provider: string; apple_user_id: string | null; storage_access_token: string | null; is_pro: boolean; created_at: Date;
    }>('SELECT * FROM users WHERE email = $1', [email]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      passwordHash: row.password_hash,
      provider: row.provider as 'email' | 'apple',
      appleUserId: row.apple_user_id ?? undefined,
      storageAccessToken: row.storage_access_token ?? '',
      isPro: row.is_pro,
      createdAt: row.created_at.toISOString(),
    };
  }

  async listUsers(limit = 500): Promise<UserRecord[]> {
    const res = await this.pool.query<{
      id: string; full_name: string; email: string; password_hash: string;
      provider: string; apple_user_id: string | null; storage_access_token: string | null; is_pro: boolean; created_at: Date;
    }>('SELECT * FROM users ORDER BY created_at DESC LIMIT $1', [limit]);
    return res.rows.map(row => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      passwordHash: row.password_hash,
      provider: row.provider as 'email' | 'apple',
      appleUserId: row.apple_user_id ?? undefined,
      storageAccessToken: row.storage_access_token ?? '',
      isPro: row.is_pro,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async updateUser(id: string, patch: { isPro?: boolean; fullName?: string; email?: string; storageAccessToken?: string; passwordHash?: string; provider?: UserRecord['provider']; appleUserId?: string }): Promise<UserRecord | null> {
    const columns: string[] = [];
    const values: unknown[] = [];
    if (patch.isPro !== undefined) { columns.push('is_pro'); values.push(patch.isPro); }
    if (patch.fullName !== undefined) { columns.push('full_name'); values.push(patch.fullName); }
    if (patch.email !== undefined) { columns.push('email'); values.push(patch.email); }
    if (patch.storageAccessToken !== undefined) { columns.push('storage_access_token'); values.push(patch.storageAccessToken); }
    if (patch.passwordHash !== undefined) { columns.push('password_hash'); values.push(patch.passwordHash); }
    if (patch.provider !== undefined) { columns.push('provider'); values.push(patch.provider); }
    if (patch.appleUserId !== undefined) { columns.push('apple_user_id'); values.push(patch.appleUserId); }
    if (columns.length === 0) return this.getUserById(id);
    values.push(id);
    const sql = ['UPDATE users SET', userUpdateSetSql(columns), `WHERE id = $${columns.length + 1}`].join(' ');
    await this.pool.query(sql, values);
    return this.getUserById(id);
  }

  async deleteUser(id: string): Promise<void> {
    await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
  }

  async deleteShareLink(token: string): Promise<void> {
    await this.pool.query('DELETE FROM share_links WHERE token = $1', [token]);
  }

  async adminStats(): Promise<{ userCount: number; documentCount: number; totalStorageBytes: number; eventCount: number; recentActiveUsers: number }> {
    const [users, docs, events, active] = await Promise.all([
      this.pool.query<{ count: string }>('SELECT COUNT(*) as count FROM users'),
      this.pool.query<{ doc_count: string; total_bytes: string }>(
        "SELECT COUNT(*) as doc_count, COALESCE(SUM((payload->>'fileSizeBytes')::bigint), 0) as total_bytes FROM documents"
      ),
      this.pool.query<{ count: string }>('SELECT COUNT(*) as count FROM analytics_events'),
      this.pool.query<{ count: string }>(
        "SELECT COUNT(DISTINCT user_id) as count FROM analytics_events WHERE user_id IS NOT NULL AND created_at > NOW() - INTERVAL '30 days'"
      ),
    ]);
    return {
      userCount: Number(users.rows[0]?.count ?? 0),
      documentCount: Number(docs.rows[0]?.doc_count ?? 0),
      totalStorageBytes: Number(docs.rows[0]?.total_bytes ?? 0),
      eventCount: Number(events.rows[0]?.count ?? 0),
      recentActiveUsers: Number(active.rows[0]?.count ?? 0),
    };
  }

  private async currentVersion(client: pg.PoolClient): Promise<number> {
    const res = await client.query<{ sync_version: string }>(
      'SELECT sync_version FROM sync_state WHERE id = true FOR UPDATE',
    );
    return Number(res.rows[0]?.sync_version ?? 0);
  }
}
