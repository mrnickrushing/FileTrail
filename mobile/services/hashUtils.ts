/**
 * hashUtils.ts — Password hashing with salt + iterations.
 *
 * Format: `pbkdf2$<iterations>$<saltBase64>$<hashBase64>`
 *
 * Note: expo-crypto does not expose native PBKDF2, so we approximate it by
 * iterating SHA-256(salt + previous). This is significantly stronger than
 * unsalted single SHA-256 (defeats rainbow tables and slows brute force by
 * the iteration factor), even though it isn't bcrypt-grade.
 *
 * Legacy migration: accounts created before salting stored a raw SHA-256
 * digest. `verifyPassword` accepts both formats so the login screen can
 * transparently rehash to the new format on success.
 */

import * as Crypto from 'expo-crypto';

const HASH_VERSION = 'pbkdf2';
const DEFAULT_ITERATIONS = 1000;
const SALT_BYTES = 16;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is available in the RN/Hermes runtime via the JS polyfill.
  return btoa(binary);
}

async function generateSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(SALT_BYTES);
  return bytesToBase64(bytes);
}

async function deriveHash(
  password: string,
  saltBase64: string,
  iterations: number,
): Promise<string> {
  let current = `${saltBase64}:${password}`;
  for (let i = 0; i < iterations; i++) {
    current = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      current,
    );
  }
  return current;
}

/**
 * Hashes a password with a fresh random salt.
 * Returns the serialized hash string ready for storage.
 */
export async function hashPassword(password: string): Promise<string> {
  const saltBase64 = await generateSalt();
  const digest = await deriveHash(password, saltBase64, DEFAULT_ITERATIONS);
  return `${HASH_VERSION}$${DEFAULT_ITERATIONS}$${saltBase64}$${digest}`;
}

/**
 * Verifies a password against a stored hash.
 * - New format (`pbkdf2$...`): salt + iterated SHA-256.
 * - Legacy format (raw SHA-256, 64 hex chars): unsalted single SHA-256.
 *
 * Returns `{ ok, needsRehash }`. When `needsRehash` is true the caller should
 * call `hashPassword(password)` and persist the new hash to upgrade the user.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (storedHash.startsWith(`${HASH_VERSION}$`)) {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return { ok: false, needsRehash: false };
    const iterations = parseInt(parts[1], 10);
    const saltBase64 = parts[2];
    const expected = parts[3];
    if (!Number.isFinite(iterations) || iterations <= 0) {
      return { ok: false, needsRehash: false };
    }
    const computed = await deriveHash(password, saltBase64, iterations);
    return { ok: constantTimeEqual(computed, expected), needsRehash: false };
  }

  // Legacy: unsalted single SHA-256
  const legacy = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password,
  );
  const ok = constantTimeEqual(legacy, storedHash);
  return { ok, needsRehash: ok };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** @deprecated Kept for one-off callers; prefer hashPassword/verifyPassword. */
export async function createHash(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}
