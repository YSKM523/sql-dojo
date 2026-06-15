import { describe, it, expect } from 'vitest';
import { buildMessages } from '@/lib/ai/prompts';

describe('buildMessages', () => {
  it('hint：系统提示强约束不给完整答案，用户消息带题面与 SQL', () => {
    const msgs = buildMessages('hint', { title: 'T', prompt: 'P', sql: 'SELECT 1' });
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('不要直接给出完整答案');
    expect(msgs[1].content).toContain('P');
    expect(msgs[1].content).toContain('SELECT 1');
  });

  it('explain：用户消息含被解释的 SQL', () => {
    const msgs = buildMessages('explain', { sql: 'SELECT * FROM t' });
    expect(msgs[1].content).toContain('SELECT * FROM t');
  });

  it('debug：用户消息含报错信息', () => {
    const msgs = buildMessages('debug', { sql: 'SELECT x', errorMsg: 'column x not found' });
    expect(msgs[1].content).toContain('column x not found');
  });
});
