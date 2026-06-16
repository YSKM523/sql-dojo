export const MAX_CODE_ATTEMPTS = 5;

export type CodeVerdict = 'ok' | 'wrong' | 'expired' | 'consumed' | 'exhausted';

export function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, '0');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function evaluateCode(
  row: { code: string; expiresAt: number; consumed: number; attempts: number },
  input: string,
  now: number,
): CodeVerdict {
  if (row.consumed) return 'consumed';
  if (row.attempts >= MAX_CODE_ATTEMPTS) return 'exhausted';
  if (now >= row.expiresAt) return 'expired';
  return input === row.code ? 'ok' : 'wrong';
}
