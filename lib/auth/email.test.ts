import { describe, it, expect } from 'vitest';
import { buildOtpEmail } from '@/lib/auth/email';

describe('buildOtpEmail', () => {
  it('主题/正文都含验证码与品牌', () => {
    const m = buildOtpEmail('246813');
    expect(m.subject).toContain('246813');
    expect(m.subject).toContain('SQL 道场');
    expect(m.text).toContain('246813');
    expect(m.text).toContain('SQL 道场');
    expect(m.html).toContain('246813');
    expect(m.html).toContain('SQL 道场');
  });

  it('html 不含 CSS 渐变', () => {
    const m = buildOtpEmail('111111');
    expect(m.html.toLowerCase()).not.toContain('gradient');
  });
});
