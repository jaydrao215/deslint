import 'server-only';

export const SESSION_COOKIE_NAME = '__deslint_admin_session';
export const SESSION_MAX_AGE = 86_400; // 24 hours

const encoder = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  return bufToHex(new Uint8Array(digest));
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const candidateHash = await hashPassword(password);
  const a = encoder.encode(candidateHash);
  const b = encoder.encode(storedHash);
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

export async function createSessionToken(secret: string): Promise<string> {
  const timestamp = Date.now().toString(16);
  const signature = await hmacSign(secret, timestamp);
  return `${timestamp}.${signature}`;
}

export async function validateSessionToken(
  token: string,
  secret: string,
): Promise<boolean> {
  const dot = token.indexOf('.');
  if (dot === -1) return false;
  const timestamp = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = await hmacSign(secret, timestamp);
  if (!timingSafeEqual(signature, expected)) return false;
  const ms = parseInt(timestamp, 16);
  if (!Number.isFinite(ms)) return false;
  return Date.now() - ms < SESSION_MAX_AGE * 1000;
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return bufToHex(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  const ba = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ba.byteLength !== bb.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < ba.byteLength; i++) {
    diff |= ba[i]! ^ bb[i]!;
  }
  return diff === 0;
}

function bufToHex(buf: Uint8Array): string {
  let hex = '';
  for (const b of buf) {
    hex += b.toString(16).padStart(2, '0');
  }
  return hex;
}
