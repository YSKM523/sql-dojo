import { PGlite } from '@electric-sql/pglite';
import type { ResultSet } from './types';

export class SqlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SqlError';
  }
}

function toResultSet(res: { fields?: { name: string }[]; rows: unknown[] }): ResultSet {
  const columns = (res.fields ?? []).map((f) => f.name);
  const rows = (res.rows as Record<string, unknown>[]).map((row) =>
    columns.map((c) => row[c]),
  );
  return { columns, rows };
}

/**
 * 一个练习一个会话：启动一次 PGlite + 种子一次，之后每次 run() 都在
 * BEGIN/ROLLBACK 事务里执行用户查询，既隔离了写操作、又复用同一个实例
 * （避免每次查询都重启内嵌 Postgres 的高开销）。
 */
export class SqlSession {
  private db: PGlite;
  private readonly seedSql: string;
  private seeded = false;

  constructor(seedSql: string) {
    this.db = new PGlite();
    this.seedSql = seedSql;
  }

  private async ensureSeeded(): Promise<void> {
    if (this.seeded) return;
    if (this.seedSql.trim()) await this.db.exec(this.seedSql);
    this.seeded = true;
  }

  async run(userSql: string): Promise<ResultSet> {
    await this.ensureSeeded();
    try {
      await this.db.exec('BEGIN');
      const res = await this.db.query(userSql);
      await this.db.exec('ROLLBACK');
      return toResultSet(res);
    } catch (e) {
      try {
        await this.db.exec('ROLLBACK');
      } catch {
        /* 事务可能未开启，忽略 */
      }
      throw new SqlError(e instanceof Error ? e.message : String(e));
    }
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}

// 便捷一次性 API（启动→种子→跑→关闭），用于测试与一次性场景。
export async function runOnSeed(seedSql: string, userSql: string): Promise<ResultSet> {
  const session = new SqlSession(seedSql);
  try {
    return await session.run(userSql);
  } finally {
    await session.close();
  }
}
