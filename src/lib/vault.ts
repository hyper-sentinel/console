/**
 * Sentinel Vault — Client-Side Encryption
 *
 * Uses Web Crypto API (AES-GCM) to encrypt/decrypt config blobs.
 * The SecretKey (sdg-vault-xxx) is used to derive an AES key.
 * The server NEVER sees plaintext credentials.
 *
 * Storage format:
 * {
 *   exchanges: {
 *     hl: { wallet_address: "...", private_key: "..." },
 *     aster: { api_key: "...", api_secret: "..." },
 *     polymarket: { api_key: "...", api_secret: "...", passphrase: "..." },
 *     onchain: { private_key: "..." },
 *   },
 *   data_sources: {
 *     fred: { api_key: "..." },
 *     y2: { api_key: "..." },
 *     elfa: { api_key: "..." },
 *     x: { api_key: "...", api_secret: "..." },
 *     telegram: { api_id: "...", api_hash: "..." },
 *     discord: { bot_token: "..." },
 *   }
 * }
 */

export interface VaultConfig {
  ai_provider?: {
    provider: string;   // "claude" | "gpt" | "gemini" | "grok"
    api_key: string;    // The actual AI API key (sk-ant-xxx, etc.)
    model?: string;     // Default model for this provider
  };
  exchanges: {
    hl?: { wallet_address?: string; private_key?: string };
    aster?: { api_key?: string; api_secret?: string };
    polymarket?: { api_key?: string; api_secret?: string; passphrase?: string };
    onchain?: { private_key?: string };
  };
  data_sources: {
    fred?: { api_key?: string };
    y2?: { api_key?: string };
    elfa?: { api_key?: string };
    x?: { api_key?: string; api_secret?: string };
    telegram?: { api_id?: string; api_hash?: string };
    discord?: { bot_token?: string };
  };
}

const EMPTY_VAULT: VaultConfig = {
  exchanges: {},
  data_sources: {},
};

// ── Key derivation ────────────────────────────────────────

/**
 * Derive a 256-bit AES key from the sdg-vault-xxx secret key.
 * Uses PBKDF2 with a fixed salt (deterministic for the same secret key).
 */
async function deriveKey(secretKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Fixed salt derived from the product name — deterministic
  const salt = encoder.encode("sentinel-vault-v1");

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ── Encrypt / Decrypt ──────────────────────────────────────

/**
 * Encrypt a VaultConfig into a base64 blob + nonce.
 */
export async function encryptVault(
  config: VaultConfig,
  secretKey: string
): Promise<{ encrypted_blob: string; nonce: string }> {
  const key = await deriveKey(secretKey);
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(config));

  // Random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  return {
    encrypted_blob: arrayBufferToBase64(ciphertext),
    nonce: arrayBufferToBase64(iv.buffer as ArrayBuffer),
  };
}

/**
 * Decrypt a base64 blob + nonce back into a VaultConfig.
 */
export async function decryptVault(
  encryptedBlob: string,
  nonce: string,
  secretKey: string
): Promise<VaultConfig> {
  if (!encryptedBlob || !nonce) return { ...EMPTY_VAULT };

  const key = await deriveKey(secretKey);
  const ciphertext = base64ToArrayBuffer(encryptedBlob);
  const iv = base64ToArrayBuffer(nonce);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext)) as VaultConfig;
}

// ── Helpers ────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ── SecretKey management ──────────────────────────────────

const SECRET_KEY_STORAGE = "sentinel_secret_key";

export function getSecretKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SECRET_KEY_STORAGE);
}

export function setSecretKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SECRET_KEY_STORAGE, key);
}

export function clearSecretKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SECRET_KEY_STORAGE);
}

export function hasSecretKey(): boolean {
  return !!getSecretKey();
}

export function createEmptyVault(): VaultConfig {
  return { ...EMPTY_VAULT, exchanges: {}, data_sources: {} };
}
