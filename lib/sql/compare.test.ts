import { describe, it, expect } from 'vitest';
import { compareResults } from '@/lib/sql/compare';
import type { ResultSet } from '@/lib/sql/types';

const rs = (columns: string[], rows: unknown[][]): ResultSet => ({ columns, rows });

describe('compareResults', () => {
  it('passes identical sets ignoring order when orderMatters=false', () => {
    const exp = rs(['c'], [[1], [2], [3]]);
    const act = rs(['c'], [[3], [1], [2]]);
    expect(compareResults(exp, act, false).passed).toBe(true);
  });

  it('fails when order differs and orderMatters=true', () => {
    const exp = rs(['c'], [[1], [2]]);
    const act = rs(['c'], [[2], [1]]);
    expect(compareResults(exp, act, true).passed).toBe(false);
  });

  it('passes when order matches and orderMatters=true', () => {
    const exp = rs(['c'], [[1], [2]]);
    const act = rs(['c'], [[1], [2]]);
    expect(compareResults(exp, act, true).passed).toBe(true);
  });

  it('fails on different row count', () => {
    const v = compareResults(rs(['c'], [[1]]), rs(['c'], [[1], [2]]), false);
    expect(v.passed).toBe(false);
    expect(v.reason).toContain('行');
  });

  it('fails on different column count', () => {
    const v = compareResults(rs(['a', 'b'], [[1, 2]]), rs(['a'], [[1]]), false);
    expect(v.passed).toBe(false);
    expect(v.reason).toContain('列');
  });

  it('treats NULL distinctly from empty string', () => {
    const exp = rs(['c'], [[null]]);
    const act = rs(['c'], [['']]);
    expect(compareResults(exp, act, false).passed).toBe(false);
  });

  it('respects multiset counts (duplicates matter)', () => {
    const exp = rs(['c'], [[1], [1], [2]]);
    const act = rs(['c'], [[1], [2], [2]]);
    expect(compareResults(exp, act, false).passed).toBe(false);
  });

  it('compares by value ignoring js type (1 == "1")', () => {
    const exp = rs(['c'], [[1]]);
    const act = rs(['c'], [['1']]);
    expect(compareResults(exp, act, false).passed).toBe(true);
  });
});
