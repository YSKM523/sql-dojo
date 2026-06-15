import type { PGlite as PGliteInstance } from '@electric-sql/pglite';
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

type PGliteCtor = new (...args: unknown[]) => PGliteInstance;

// 关键：浏览器端动态 import 同源、未经打包器处理的原始 PGlite ESM（/pglite/index.js）。
// 它会自己相对加载 ./pglite.wasm / ./pglite.data / ./initdb.wasm。
// 绝不能用静态 import——那样 Turbopack 会把 Emscripten 胶水 minify 坏。
// Node（vitest/SSR）则从 node_modules 加载。
let ctorPromise: Promise<PGliteCtor> | null = null;

function getCtor(): Promise<PGliteCtor> {
  if (!ctorPromise) {
    ctorPromise = (async () => {
      if (typeof window === 'undefined') {
        const pkg = '@electric-sql/pglite';
        const mod = await import(/* @vite-ignore */ /* turbopackIgnore: true */ pkg);
        return (mod as { PGlite: PGliteCtor }).PGlite;
      }
      const url = '/pglite/index.js';
      const mod = await import(/* @vite-ignore */ /* turbopackIgnore: true */ url);
      return (mod as { PGlite: PGliteCtor }).PGlite;
    })();
  }
  return ctorPromise;
}

async function createDb(): Promise<PGliteInstance> {
  const PGlite = await getCtor();
  return new PGlite();
}

/**
 * 一个练习一个会话：启动一次 PGlite + 种子一次，之后每次 run() 都在
 * BEGIN/ROLLBACK 事务里执行用户查询，既隔离了写操作、又复用同一个实例。
 */
export class SqlSession {
  private dbPromise: Promise<PGliteInstance> | null = null;
  private readonly seedSql: string;
  private seeded = false;

  constructor(seedSql: string) {
    this.seedSql = seedSql;
  }

  private db(): Promise<PGliteInstance> {
    if (!this.dbPromise) this.dbPromise = createDb();
    return this.dbPromise;
  }

  async run(userSql: string): Promise<ResultSet> {
    const db = await this.db();
    if (!this.seeded) {
      if (this.seedSql.trim()) await db.exec(this.seedSql);
      this.seeded = true;
    }
    try {
      await db.exec('BEGIN');
      const res = await db.query(userSql);
      await db.exec('ROLLBACK');
      return toResultSet(res);
    } catch (e) {
      try {
        await db.exec('ROLLBACK');
      } catch {
        /* 事务可能未开启，忽略 */
      }
      throw new SqlError(e instanceof Error ? e.message : String(e));
    }
  }

  async close(): Promise<void> {
    if (this.dbPromise) {
      const db = await this.dbPromise;
      await db.close();
      this.dbPromise = null;
    }
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
