import { describe, it, expect } from 'vitest';
import { signSession, verifySession, type SessionPayload } from '@/lib/auth/session';

const SECRET = 'test-secret-please-change';
const base: SessionPayload = { uid: 'u1', email: 'a@b.com', exp: 2_000_000_000_000 };

describe('session HMAC', () => {
  it('签发后能验回原 payload', async () => {
    const token = await signSession(base, SECRET);
    const got = await verifySession(token, SECRET, 1_000);
    expect(got).toEqual(base);
  });

  it('换密钥验签失败', async () => {
    const token = await signSession(base, SECRET);
    expect(await verifySession(token, 'other-secret', 1_000)).toBeNull();
  });

  it('篡改 payload 验签失败', async () => {
    const token = await signSession(base, SECRET);
    const [, sig] = token.split('.');
    const forged = btoa('{"uid":"hacker","email":"x","exp":2000000000000}')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + '.' + sig;
    expect(await verifySession(forged, SECRET, 1_000)).toBeNull();
  });

  it('过期则验签失败', async () => {
    const token = await signSession({ ...base, exp: 5_000 }, SECRET);
    expect(await verifySession(token, SECRET, 10_000)).toBeNull();
  });

  it('垃圾串返回 null', async () => {
    expect(await verifySession('not-a-token', SECRET, 1_000)).toBeNull();
    expect(await verifySession('', SECRET, 1_000)).toBeNull();
  });
});
