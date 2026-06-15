export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface RateResult {
  allowed: boolean;
  remaining: number;
}

export async function checkRateLimit(
  kv: KVLike,
  ip: string,
  day: string,
  limit: number,
): Promise<RateResult> {
  const key = `rl:${ip}:${day}`;
  const cur = parseInt((await kv.get(key)) ?? '0', 10) || 0;
  if (cur >= limit) return { allowed: false, remaining: 0 };
  await kv.put(key, String(cur + 1), { expirationTtl: 60 * 60 * 26 });
  return { allowed: true, remaining: limit - cur - 1 };
}
