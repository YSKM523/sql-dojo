import { describe, it, expect } from 'vitest';
import { checkRateLimit, type KVLike } from '@/lib/ai/ratelimit';

function fakeKV(): KVLike {
  const m = new Map<string, string>();
  return {
    get: async (k) => m.get(k) ?? null,
    put: async (k, v) => void m.set(k, v),
  };
}

describe('checkRateLimit', () => {
  it('未超额放行并递减剩余', async () => {
    const kv = fakeKV();
    const a = await checkRateLimit(kv, 'ip1', '2026-06-15', 2);
    expect(a).toEqual({ allowed: true, remaining: 1 });
    const b = await checkRateLimit(kv, 'ip1', '2026-06-15', 2);
    expect(b).toEqual({ allowed: true, remaining: 0 });
  });

  it('超额拒绝', async () => {
    const kv = fakeKV();
    await checkRateLimit(kv, 'ip1', '2026-06-15', 1);
    const c = await checkRateLimit(kv, 'ip1', '2026-06-15', 1);
    expect(c.allowed).toBe(false);
  });

  it('不同 IP / 不同天 互不影响', async () => {
    const kv = fakeKV();
    await checkRateLimit(kv, 'ip1', '2026-06-15', 1);
    expect((await checkRateLimit(kv, 'ip2', '2026-06-15', 1)).allowed).toBe(true);
    expect((await checkRateLimit(kv, 'ip1', '2026-06-16', 1)).allowed).toBe(true);
  });
});
