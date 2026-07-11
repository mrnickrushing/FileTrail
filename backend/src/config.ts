import 'dotenv/config';

export type RuntimeConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  corsOrigins: string[];
  apiKey: string | null;
  adminKey: string | null;
  dataDir: string;
  databaseUrl: string | null;
  publicAppUrl: string;
  inboundEmailDomain: string | null;
  inboundEmailSecret: string | null;
  appleClientIds: string[];
  integrations: {
    supabase: boolean;
    r2: boolean;
    openai: boolean;
    anthropic: boolean;
    postmark: boolean;
  };
};

function boolFromEnv(...keys: string[]): boolean {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}

export function loadConfig(): RuntimeConfig {
  const corsRaw = process.env.CORS_ORIGINS?.trim() || '*';
  const nodeEnv = process.env.NODE_ENV || 'development';
  const apiKey = process.env.API_KEY?.trim() || null;
  const adminKey = process.env.ADMIN_KEY?.trim() || null;
  const corsOrigins = corsRaw === '*' ? ['*'] : corsRaw.split(',').map((origin) => origin.trim()).filter(Boolean);
  const appleClientIds = (process.env.APPLE_CLIENT_IDS || process.env.APPLE_CLIENT_ID || 'com.papertraill.app')
    .split(',')
    .map((clientId) => clientId.trim())
    .filter(Boolean);

  if (nodeEnv === 'production') {
    const missing = [
      !adminKey ? 'ADMIN_KEY' : null,
      corsOrigins.includes('*') ? 'CORS_ORIGINS' : null,
      appleClientIds.length === 0 ? 'APPLE_CLIENT_ID or APPLE_CLIENT_IDS' : null,
    ].filter(Boolean);
    if (missing.length > 0) {
      throw new Error(`Production configuration is incomplete: ${missing.join(', ')}`);
    }
  }

  return {
    nodeEnv,
    host: process.env.HOST || '0.0.0.0',
    port: Number(process.env.PORT || 4000),
    corsOrigins,
    apiKey,
    adminKey,
    dataDir: process.env.DATA_DIR || '.data',
    databaseUrl: process.env.DATABASE_URL?.trim() || null,
    publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:4000',
    inboundEmailDomain: process.env.INBOUND_EMAIL_DOMAIN?.trim() || null,
    inboundEmailSecret: process.env.INBOUND_EMAIL_SECRET?.trim() || null,
    appleClientIds,
    integrations: {
      supabase: boolFromEnv('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'),
      r2: boolFromEnv(
        'CLOUDFLARE_R2_ACCOUNT_ID',
        'CLOUDFLARE_R2_ACCESS_KEY_ID',
        'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
        'CLOUDFLARE_R2_BUCKET',
      ),
      openai: boolFromEnv('OPENAI_API_KEY'),
      anthropic: boolFromEnv('ANTHROPIC_API_KEY'),
      postmark: boolFromEnv('POSTMARK_INBOUND_TOKEN'),
    },
  };
}
