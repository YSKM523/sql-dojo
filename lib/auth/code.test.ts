import { describe, it, expect } from 'vitest';
import { generateCode, evaluateCode, isValidEmail, MAX_CODE_ATTEMPTS } from '@/lib/auth/code';

describe('generateCode', () => {
  it('生成 6 位数字串', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe('isValidEmail', () => {
  it('接受正常邮箱', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
    expect(isValidEmail('x.y+z@sub.domain.cn')).toBe(true);
  });
  it('拒绝非法邮箱', () => {
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@')).toBe(false);
    expect(isValidEmail('@b.com')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('evaluateCode', () => {
  const now = 1_000_000;
  const fresh = { code: '123456', expiresAt: now + 1000, consumed: 0, attempts: 0 };

  it('正确码返回 ok', () => {
    expect(evaluateCode(fresh, '123456', now)).toBe('ok');
  });
  it('错码返回 wrong', () => {
    expect(evaluateCode(fresh, '000000', now)).toBe('wrong');
  });
  it('过期返回 expired', () => {
    expect(evaluateCode({ ...fresh, expiresAt: now - 1 }, '123456', now)).toBe('expired');
  });
  it('已用返回 consumed', () => {
    expect(evaluateCode({ ...fresh, consumed: 1 }, '123456', now)).toBe('consumed');
  });
  it('试次用尽返回 exhausted', () => {
    expect(evaluateCode({ ...fresh, attempts: MAX_CODE_ATTEMPTS }, '123456', now)).toBe('exhausted');
  });
});
