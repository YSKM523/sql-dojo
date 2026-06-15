import { PGlite } from '@electric-sql/pglite';
import type { ResultSet } from './types';

export class SqlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SqlError';
  }
}

// 每次调用都新建内存实例 → 幂等、无状态泄漏。
export async function runOnSeed(seedSql: string, userSql: string): Promise<ResultSet> {
  const db = new PGlite();
  try {
    if (seedSql.trim()) await db.exec(seedSql);
    const res = await db.query(userSql);
    const columns = (res.fields ?? []).map((f: { name: string }) => f.name);
    const rows = (res.rows as Record<string, unknown>[]).map((row) =>
      columns.map((c) => row[c]),
    );
    return { columns, rows };
  } catch (e) {
    throw new SqlError(e instanceof Error ? e.message : String(e));
  } finally {
    await db.close();
  }
}
