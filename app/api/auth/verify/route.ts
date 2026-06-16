import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { isValidEmail, evaluateCode, type CodeVerdict } from '@/lib/auth/code';
import { signSession } from '@/lib/auth/session';
import { sessionCookie } from '@/lib/auth/cookie';
import { latestCode, bumpCodeAttempts, consumeCode, upsertUserByEmail } from '@/lib/db/d1';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const VERDICT_MSG: Record<Exclude<CodeVerdict, 'ok'>, string> = {
  wrong: '验证码不对',
  expired: '验证码已过期，请重新获取',
  consumed: '验证码已用过，请重新获取',
  exhausted: '尝试次数太多，请重新获取',
};

export async function POST(req: NextRequest) {
  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
  const email = (body.email ?? '').trim().toLowerCase();
  const code = (body.code ?? '').trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: '邮箱或验证码格式不对' }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  if (!env.DB || !env.SESSION_SECRET) {
    return NextResponse.json({ error: '登录暂未配置' }, { status: 503 });
  }

  const now = Date.now();
  const row = await latestCode(env.DB, email);
  if (!row) {
    return NextResponse.json({ error: '请先获取验证码' }, { status: 400 });
  }
  const verdict = evaluateCode(
    { code: row.code, expiresAt: row.expires_at, consumed: row.consumed, attempts: row.attempts },
    code,
    now,
  );
  if (verdict !== 'ok') {
    if (verdict === 'wrong') await bumpCodeAttempts(env.DB, row.rowid);
    return NextResponse.json({ error: VERDICT_MSG[verdict] }, { status: 400 });
  }

  await consumeCode(env.DB, row.rowid);
  const user = await upsertUserByEmail(env.DB, email, now);
  const token = await signSession(
    { uid: user.id, email: user.email, exp: now + SESSION_TTL_MS },
    env.SESSION_SECRET,
  );
  const res = NextResponse.json({ user: { email: user.email, displayName: user.display_name } });
  res.cookies.set(sessionCookie(token, SESSION_TTL_MS / 1000));
  return res;
}
