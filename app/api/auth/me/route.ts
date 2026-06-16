import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { readSession } from '@/lib/auth/cookie';

export async function GET(req: NextRequest) {
  const { env } = getCloudflareContext();
  if (!env.SESSION_SECRET) return NextResponse.json({ user: null });
  const s = await readSession(req, env.SESSION_SECRET);
  return NextResponse.json({ user: s ? { email: s.email } : null });
}
