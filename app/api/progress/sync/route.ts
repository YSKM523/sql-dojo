import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { readSession } from '@/lib/auth/cookie';
import { mergeProgress } from '@/lib/db/d1';
import { getExerciseById } from '@/content/exercises';

export async function POST(req: NextRequest) {
  const { env } = getCloudflareContext();
  if (!env.DB || !env.SESSION_SECRET) {
    return NextResponse.json({ error: '未配置' }, { status: 503 });
  }
  const s = await readSession(req, env.SESSION_SECRET);
  if (!s) return NextResponse.json({ error: '未登录' }, { status: 401 });
  let body: { ids?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const ids = Array.isArray(body.ids)
    ? (body.ids.filter((x) => typeof x === 'string' && getExerciseById(x)) as string[])
    : [];
  const merged = await mergeProgress(env.DB, s.uid, ids, Date.now());
  return NextResponse.json({ ids: merged });
}
