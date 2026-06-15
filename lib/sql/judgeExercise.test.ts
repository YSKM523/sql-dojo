import { describe, it, expect } from 'vitest';
import { judgeExercise } from '@/lib/sql/judgeExercise';
import { getExerciseById } from '@/content/exercises';

const ex = (id: string) => {
  const e = getExerciseById(id);
  if (!e) throw new Error('missing fixture ' + id);
  return e;
};

describe('judgeExercise', () => {
  it('passes the canonical solution', async () => {
    const r = await judgeExercise(ex('m1-01'), 'SELECT * FROM users');
    expect(r.verdict.passed).toBe(true);
    expect(r.actual?.rows.length).toBe(5);
  });

  it('fails a wrong answer', async () => {
    const r = await judgeExercise(ex('m1-02'), 'SELECT name, age FROM users');
    expect(r.verdict.passed).toBe(false);
  });

  it('reports sql errors as a failed verdict (not a throw)', async () => {
    const r = await judgeExercise(ex('m1-01'), 'SELECT nope FROM users');
    expect(r.verdict.passed).toBe(false);
    expect(r.verdict.reason).toContain('报错');
  });

  it('honours orderMatters for the sort exercise', async () => {
    const wrong = await judgeExercise(ex('m1-04'), 'SELECT name, age FROM users ORDER BY age ASC');
    expect(wrong.verdict.passed).toBe(false);
    const right = await judgeExercise(ex('m1-04'), 'SELECT name, age FROM users ORDER BY age DESC');
    expect(right.verdict.passed).toBe(true);
  });
});
