import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { readSession } from '@/lib/auth/cookie';
import { listProgress, upsertProgress } from '@/lib/db/d1';
import { getExerciseById } from '@/content/exercises';

export async function GET(req: NextRequest) {
  const { env } = getCloudflareContext();
  if (!env.DB || !env.SESSION_SECRET) {
    return NextResponse.json({ error: '未配置' }, { status: 503 });
  }
  const s = await readSession(req, env.SESSION_SECRET);
  if (!s) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const ids = await listProgress(env.DB, s.uid);
  return NextResponse.json({ ids });
}

export async function POST(req: NextRequest) {
  const { env } = getCloudflareContext();
  if (!env.DB || !env.SESSION_SECRET) {
    return NextResponse.json({ error: '未配置' }, { status: 503 });
  }
  const s = await readSession(req, env.SESSION_SECRET);
  if (!s) return NextResponse.json({ error: '未登录' }, { status: 401 });
  let body: { exerciseId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
  const id = (body.exerciseId ?? '').trim();
  if (!id || !getExerciseById(id)) {
    return NextResponse.json({ error: '无效 exerciseId' }, { status: 400 });
  }
  await upsertProgress(env.DB, s.uid, id, Date.now());
  return NextResponse.json({ ok: true });
}
