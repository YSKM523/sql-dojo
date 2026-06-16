// 无状态 HMAC-SHA256 会话令牌：`${base64url(payload)}.${base64url(hmac)}`。
// 用 Web Crypto，Worker 与 Node 测试环境通用。
const enc = new TextEncoder();
const dec = new TextDecoder();

export interface SessionPayload {
  uid: string;
  email: string;
  exp: number; // epoch ms
}

function b64urlBytes(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlStr(str: string): string {
  return b64urlBytes(enc.encode(str));
}

function unb64urlStr(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return dec.decode(bytes);
}

async function hmac(payloadB64: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  return b64urlBytes(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const p = b64urlStr(JSON.stringify(payload));
  const sig = await hmac(p, secret);
  return `${p}.${sig}`;
}

export async function verifySession(
  token: string,
  secret: string,
  now: number,
): Promise<SessionPayload | null> {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const p = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(p, secret);
  if (!timingSafeEqual(sig, expected)) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(unb64urlStr(p));
  } catch {
    return null;
  }
  if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
  if (typeof payload.uid !== 'string' || typeof payload.email !== 'string') return null;
  return payload;
}
