import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { checkRateLimit } from '@/lib/ai/ratelimit';
import { generateCode, isValidEmail } from '@/lib/auth/code';
import { buildOtpEmail } from '@/lib/auth/email';
import { sendMail } from '@/lib/mail/send';
import { insertLoginCode } from '@/lib/db/d1';

const CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_DAILY = 8;
const IP_DAILY = 30;

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
  const email = (body.email ?? '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: '邮箱格式不对' }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  if (!env.DB || !env.MAIL_API_URL || !env.MAIL_API_SECRET) {
    return NextResponse.json({ error: '登录暂未配置' }, { status: 503 });
  }

  if (env.AI_RATELIMIT) {
    const ip = req.headers.get('cf-connecting-ip') ?? 'anon';
    const day = new Date().toISOString().slice(0, 10);
    const a = await checkRateLimit(env.AI_RATELIMIT, 'otp-email:' + email, day, EMAIL_DAILY);
    const b = await checkRateLimit(env.AI_RATELIMIT, 'otp-ip:' + ip, day, IP_DAILY);
    if (!a.allowed || !b.allowed) {
      return NextResponse.json({ error: '验证码发送太频繁，请稍后再试' }, { status: 429 });
    }
  }

  const code = generateCode();
  const now = Date.now();
  await insertLoginCode(env.DB, email, code, now + CODE_TTL_MS, now);
  try {
    await sendMail(
      { MAIL_API_URL: env.MAIL_API_URL, MAIL_API_SECRET: env.MAIL_API_SECRET },
      { to: email, ...buildOtpEmail(code) },
    );
  } catch {
    return NextResponse.json({ error: '验证码发送失败，请稍后再试' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
