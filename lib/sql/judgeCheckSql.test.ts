import { describe, it, expect } from 'vitest';
import { judgeExercise } from '@/lib/sql/judgeExercise';
import type { Exercise } from '@/lib/sql/types';

const ddlEx: Exercise = {
  id: 'test-ddl',
  moduleId: 'mX',
  title: 't',
  difficulty: 1,
  prompt: '',
  seedSql: '',
  solutionSql: "CREATE TABLE p (id int, name text); INSERT INTO p VALUES (1,'a');",
  checkSql: 'SELECT id, name FROM p ORDER BY id;',
  orderMatters: false,
};

describe('checkSql 判题', () => {
  it('等价 setup 提交 → passed', async () => {
    const r = await judgeExercise(
      ddlEx,
      "CREATE TABLE p (id int, name text); INSERT INTO p VALUES (1,'a');",
    );
    expect(r.verdict.passed, r.verdict.reason).toBe(true);
  });

  it('数据不同 → failed', async () => {
    const r = await judgeExercise(
      ddlEx,
      "CREATE TABLE p (id int, name text); INSERT INTO p VALUES (1,'WRONG');",
    );
    expect(r.verdict.passed).toBe(false);
  });

  it('表名建错(checkSql 找不到表) → failed', async () => {
    const r = await judgeExercise(ddlEx, 'CREATE TABLE q (id int, name text);');
    expect(r.verdict.passed).toBe(false);
  });
});
