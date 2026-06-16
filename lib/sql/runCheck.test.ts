import { describe, it, expect } from 'vitest';
import { SqlSession } from '@/lib/sql/runner';

describe('SqlSession.runCheck', () => {
  it('先 exec 多语句 setup, 再 query checkSql 取结果', async () => {
    const s = new SqlSession('');
    const r = await s.runCheck(
      "CREATE TABLE t (id int, v text); INSERT INTO t VALUES (1,'a'),(2,'b');",
      'SELECT id, v FROM t ORDER BY id;',
    );
    expect(r.columns).toEqual(['id', 'v']);
    expect(r.rows).toEqual([
      [1, 'a'],
      [2, 'b'],
    ]);
    await s.close();
  });

  it('ROLLBACK 隔离：连跑两次互不影响（第二次建表不报已存在）', async () => {
    const s = new SqlSession('');
    const setup = 'CREATE TABLE t (id int); INSERT INTO t VALUES (1);';
    const r1 = await s.runCheck(setup, 'SELECT count(*)::int AS n FROM t;');
    const r2 = await s.runCheck(setup, 'SELECT count(*)::int AS n FROM t;');
    expect(r1.rows).toEqual([[1]]);
    expect(r2.rows).toEqual([[1]]);
    await s.close();
  });

  it('setup 出错抛 SqlError', async () => {
    const s = new SqlSession('');
    await expect(s.runCheck('CREATE TABLE bad (', 'SELECT 1;')).rejects.toThrow();
    await s.close();
  });
});
