import { describe, it, expect } from 'vitest';
import { runOnSeed, SqlError } from '@/lib/sql/runner';

const SEED = `
CREATE TABLE t (id integer, name text);
INSERT INTO t VALUES (1, 'a'), (2, 'b');
`;

describe('runOnSeed', () => {
  it('returns columns and rows in field order', async () => {
    const r = await runOnSeed(SEED, 'SELECT id, name FROM t ORDER BY id');
    expect(r.columns).toEqual(['id', 'name']);
    expect(r.rows).toEqual([
      [1, 'a'],
      [2, 'b'],
    ]);
  });

  it('re-seeds fresh each call (no state leak)', async () => {
    await runOnSeed(SEED, "INSERT INTO t VALUES (3, 'c')");
    const r = await runOnSeed(SEED, 'SELECT count(*)::int AS n FROM t');
    expect(r.rows[0][0]).toBe(2);
  });

  it('throws SqlError on bad sql', async () => {
    await expect(runOnSeed(SEED, 'SELECT nope FROM t')).rejects.toBeInstanceOf(SqlError);
  });
});
