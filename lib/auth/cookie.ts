import type { NextRequest } from 'next/server';
import { verifySession, type SessionPayload } from './session';

export const COOKIE_NAME = 'sdsess';

interface CookieSpec {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}

export function sessionCookie(value: string, maxAgeSec: number): CookieSpec {
  return {
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec,
  };
}

export function clearCookie(): CookieSpec {
  return { ...sessionCookie('', 0) };
}

export async function readSession(
  req: NextRequest,
  secret: string,
): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token, secret, Date.now());
}
