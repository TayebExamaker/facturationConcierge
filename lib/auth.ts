// Authentication helpers. Single-account gate: credentials live in env vars,
// session is an HMAC-signed cookie. Everything here must run in BOTH the Edge
// runtime (middleware) and the Node runtime (server actions), so we use the
// Web Crypto API exclusively — no `node:crypto`, no `Buffer`.

export const AUTH_COOKIE_NAME = "cog-session";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days, sliding

const ENC = new TextEncoder();

function requireSecret(): string {
  const s = process.env.AUTH_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "AUTH_SESSION_SECRET env var missing or too short (need ≥32 chars)",
    );
  }
  return s;
}

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? 0 : 4 - (padded.length % 4);
  const bin = atob(padded + "=".repeat(pad));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    ENC.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Build a fresh session token valid for AUTH_COOKIE_MAX_AGE_SECONDS.
 * Format: `<expSeconds>.<base64url(HMAC-SHA256(expSeconds))>`.
 */
export async function buildSessionToken(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + AUTH_COOKIE_MAX_AGE_SECONDS;
  const payload = String(exp);
  const key = await hmacKey(requireSecret());
  const sigBytes = await crypto.subtle.sign("HMAC", key, ENC.encode(payload));
  return `${payload}.${bytesToBase64Url(sigBytes)}`;
}

/**
 * Verify a session token. Returns true iff the HMAC matches AND `exp` is in
 * the future. Failure modes (missing, malformed, expired, bad signature) all
 * collapse to `false`.
 */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const idx = token.indexOf(".");
  if (idx <= 0 || idx === token.length - 1) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const exp = Number(payload);
  if (!Number.isFinite(exp)) return false;
  if (exp <= Math.floor(Date.now() / 1000)) return false;
  try {
    const key = await hmacKey(requireSecret());
    const sigBytes = base64UrlToBytes(sig);
    return await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as unknown as BufferSource,
      ENC.encode(payload) as unknown as BufferSource,
    );
  } catch {
    return false;
  }
}

/**
 * Constant-time string compare to avoid timing attacks on email/password match.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Check submitted credentials against the env-configured single account.
 * Throws (not returns false) if env vars are missing — that's a deploy bug,
 * not a wrong-password event.
 */
export function verifyCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.AUTH_USER_EMAIL;
  const expectedPassword = process.env.AUTH_USER_PASSWORD;
  if (!expectedEmail || !expectedPassword) {
    throw new Error(
      "AUTH_USER_EMAIL and AUTH_USER_PASSWORD env vars must both be set",
    );
  }
  const e = timingSafeEqual(
    email.trim().toLowerCase(),
    expectedEmail.trim().toLowerCase(),
  );
  // Compare password without normalizing — preserve case/whitespace exactly.
  const p = timingSafeEqual(password, expectedPassword);
  return e && p;
}
