# SQL 道场 Phase 1 · Plan 1：地基与练习场内核 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出一个可上线的 Next.js 应用：游客打开练习页，在 CodeMirror 里写 SQL，点"运行"后对**浏览器内真实 Postgres(PGlite/WASM)** 执行，并按结果集自动判对错。

**Architecture:** 判题逻辑与 React UI 解耦——纯逻辑（结果集比对、PGlite 运行器、判题）放 `lib/sql/`，在 Node 环境用真实 PGlite 做 TDD；UI 组件（结果表、判定横幅、编辑器、练习场）在 jsdom 下测，重活（判题）在组件测试里 mock 掉。题目以结构化 TS 定义，判题以"标准答案结果集 vs 用户查询结果集"比对，全程浏览器本地、零后端。

**Tech Stack:** Next.js (App Router, TypeScript)、Tailwind CSS、`@electric-sql/pglite`(真 Postgres WASM)、`@uiw/react-codemirror` + `@codemirror/lang-sql`、Vitest + Testing Library、`@opennextjs/cloudflare` 部署到 Cloudflare。

**约定：** 纯色、无 CSS 渐变（用户全局偏好）；提交信息**不要** Co-Authored-By 行。

---

## 文件结构（本计划将创建/修改）

```
lib/sql/types.ts            Exercise / ResultSet / Verdict 类型（单一事实源）
lib/sql/compare.ts          compareResults() —— 纯函数，结果集比对（集合/有序）
lib/sql/runner.ts           runOnSeed() + SqlError —— PGlite 运行器（种子→跑→取结果）
lib/sql/judgeExercise.ts    judgeExercise() —— 组合 runner+compare 出判定
content/exercises/module1.ts  模块1样例题（4 题）
content/exercises/index.ts    题库注册表 + getExerciseById()
components/ResultTable.tsx   结果表（纯展示）
components/VerdictBanner.tsx 判定横幅 ✅/❌（纯展示）
components/SqlEditor.tsx     CodeMirror 薄封装（'use client'）
components/Playground.tsx    练习场：编辑器+运行+表+横幅（'use client'）
app/page.tsx                落地页（CTA → 第一题）
app/exercise/[id]/page.tsx  练习页路由
app/layout.tsx / app/globals.css  深色纯色底（修改）
vitest.config.ts / vitest.setup.ts  测试配置
wrangler.jsonc / open-next.config.ts  Cloudflare 部署
```

---

## Task 1：脚手架 + Tailwind + Vitest

**Files:**
- Create: 整个 Next.js 项目（在已存在 `.git` 与 `docs/` 的 `/home/ubuntu/sql-dojo` 内）
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Modify: `package.json`(脚本)

- [ ] **Step 1: 临时移开 docs 后用 create-next-app 脚手架**

create-next-app 拒绝非空目录，先把 `docs/` 挪走（`.git` 在其允许清单内，无需移动）。

Run:
```bash
cd /home/ubuntu/sql-dojo
mv docs /tmp/sqldojo-docs-backup
npx create-next-app@latest . --ts --tailwind --app --no-src-dir --eslint --use-npm --import-alias "@/*" --turbopack
mv /tmp/sqldojo-docs-backup docs
```
若交互式追问，全部接受上面 flag 对应的默认值。

- [ ] **Step 2: 安装运行依赖与测试依赖**

Run:
```bash
cd /home/ubuntu/sql-dojo
npm i @electric-sql/pglite @uiw/react-codemirror @codemirror/lang-sql
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom
```

- [ ] **Step 3: 写 Vitest 配置**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // 若 PGlite 在测试里报 ESM/WASM 错误，取消下一行注释：
    // server: { deps: { inline: ['@electric-sql/pglite'] } },
  },
});
```

Create `vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: 加测试脚本**

在 `package.json` 的 `"scripts"` 中加入：
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: 烟雾验证（空测试）**

Create `lib/sql/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
describe('smoke', () => {
  it('runs', () => { expect(1 + 1).toBe(2); });
});
```
Run: `npm test`
Expected: 1 passed。随后删除该文件：`rm lib/sql/smoke.test.ts`

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "chore: 脚手架 Next.js + Tailwind + Vitest"
```

---

## Task 2：领域类型与样例题库

**Files:**
- Create: `lib/sql/types.ts`
- Create: `content/exercises/module1.ts`
- Create: `content/exercises/index.ts`
- Test: `content/exercises/index.test.ts`

- [ ] **Step 1: 写类型（单一事实源）**

Create `lib/sql/types.ts`:
```ts
export interface Exercise {
  id: string;
  moduleId: string;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prompt: string;        // 中文题面
  seedSql: string;       // 建表+插数据，每次运行前重置
  starterSql?: string;   // 编辑器初始内容
  solutionSql: string;   // 标准答案，用于生成期望结果集
  orderMatters: boolean; // 是否要求特定行顺序
  hints?: string[];
}

export interface ResultSet {
  columns: string[];
  rows: unknown[][];
}

export interface Verdict {
  passed: boolean;
  reason?: string;
}
```

- [ ] **Step 2: 写模块1样例题（4 题）**

Create `content/exercises/module1.ts`:
```ts
import type { Exercise } from '@/lib/sql/types';

const SEED = `
CREATE TABLE users (
  id integer PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL,
  age integer NOT NULL
);
INSERT INTO users (id, name, city, age) VALUES
  (1, '小明', '北京', 25),
  (2, '小红', '上海', 30),
  (3, '小刚', '北京', 28),
  (4, '小美', '广州', 22),
  (5, '阿强', '上海', 35);
`;

export const module1Exercises: Exercise[] = [
  {
    id: 'm1-01',
    moduleId: 'm1',
    title: '选出全部用户',
    difficulty: 1,
    prompt: '用 SELECT 选出 users 表里所有用户的所有列。',
    seedSql: SEED,
    starterSql: 'SELECT ... FROM users;',
    solutionSql: 'SELECT * FROM users;',
    orderMatters: false,
    hints: ['用 * 代表"所有列"。'],
  },
  {
    id: 'm1-02',
    moduleId: 'm1',
    title: '筛选成年达标用户',
    difficulty: 2,
    prompt: '选出 age 大于等于 28 的用户的 name 和 age 两列。',
    seedSql: SEED,
    starterSql: 'SELECT name, age FROM users WHERE ...;',
    solutionSql: 'SELECT name, age FROM users WHERE age >= 28;',
    orderMatters: false,
    hints: ['WHERE 后面写筛选条件。'],
  },
  {
    id: 'm1-03',
    moduleId: 'm1',
    title: '去重城市',
    difficulty: 2,
    prompt: '选出所有用户来自的城市（city），不要有重复。',
    seedSql: SEED,
    starterSql: 'SELECT ... city FROM users;',
    solutionSql: 'SELECT DISTINCT city FROM users;',
    orderMatters: false,
    hints: ['DISTINCT 去掉重复行。'],
  },
  {
    id: 'm1-04',
    moduleId: 'm1',
    title: '按年龄排序',
    difficulty: 2,
    prompt: '选出所有用户的 name 和 age，并按 age 从大到小排序。',
    seedSql: SEED,
    starterSql: 'SELECT name, age FROM users ORDER BY ...;',
    solutionSql: 'SELECT name, age FROM users ORDER BY age DESC;',
    orderMatters: true,
    hints: ['ORDER BY ... DESC 表示降序。'],
  },
];
```

- [ ] **Step 3: 写失败测试（注册表）**

Create `content/exercises/index.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { allExercises, getExerciseById } from '@/content/exercises';

describe('exercise registry', () => {
  it('exposes module1 exercises', () => {
    expect(allExercises.length).toBeGreaterThanOrEqual(4);
  });
  it('finds an exercise by id', () => {
    expect(getExerciseById('m1-01')?.title).toBe('选出全部用户');
  });
  it('returns undefined for unknown id', () => {
    expect(getExerciseById('nope')).toBeUndefined();
  });
  it('has unique ids', () => {
    const ids = allExercises.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 4: 运行测试，确认失败**

Run: `npx vitest run content/exercises/index.test.ts`
Expected: FAIL —— 找不到模块 `@/content/exercises`。

- [ ] **Step 5: 写注册表实现**

Create `content/exercises/index.ts`:
```ts
import type { Exercise } from '@/lib/sql/types';
import { module1Exercises } from './module1';

export const allExercises: Exercise[] = [...module1Exercises];

export function getExerciseById(id: string): Exercise | undefined {
  return allExercises.find((e) => e.id === id);
}
```

- [ ] **Step 6: 运行测试，确认通过**

Run: `npx vitest run content/exercises/index.test.ts`
Expected: PASS（4 passed）。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: 领域类型与模块1样例题库"
```

---

## Task 3：结果集比对（判题内核，纯函数 TDD）

**Files:**
- Create: `lib/sql/compare.ts`
- Test: `lib/sql/compare.test.ts`

- [ ] **Step 1: 写失败测试**

Create `lib/sql/compare.test.ts`:
```ts
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
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run lib/sql/compare.test.ts`
Expected: FAIL —— 找不到 `@/lib/sql/compare`。

- [ ] **Step 3: 写实现**

Create `lib/sql/compare.ts`:
```ts
import type { ResultSet, Verdict } from './types';

// 按值规范化（更宽容：忽略 JS 类型差异，NULL 单独成键）
function canon(v: unknown): string {
  if (v === null || v === undefined) return ' NULL';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'boolean') return v ? 't' : 'f';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function rowKey(row: unknown[]): string {
  return row.map(canon).join('');
}

export function compareResults(
  expected: ResultSet,
  actual: ResultSet,
  orderMatters: boolean,
): Verdict {
  if (actual.columns.length !== expected.columns.length) {
    return { passed: false, reason: `期望 ${expected.columns.length} 列，实际 ${actual.columns.length} 列` };
  }
  if (actual.rows.length !== expected.rows.length) {
    return { passed: false, reason: `期望 ${expected.rows.length} 行，实际 ${actual.rows.length} 行` };
  }

  if (orderMatters) {
    for (let i = 0; i < expected.rows.length; i++) {
      if (rowKey(expected.rows[i]) !== rowKey(actual.rows[i])) {
        return { passed: false, reason: `第 ${i + 1} 行与期望不一致（注意排序）` };
      }
    }
    return { passed: true };
  }

  const bag = new Map<string, number>();
  for (const r of expected.rows) {
    const k = rowKey(r);
    bag.set(k, (bag.get(k) ?? 0) + 1);
  }
  for (const r of actual.rows) {
    const k = rowKey(r);
    const n = bag.get(k);
    if (!n) return { passed: false, reason: '结果集内容与期望不一致' };
    bag.set(k, n - 1);
  }
  return { passed: true };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run lib/sql/compare.test.ts`
Expected: PASS（8 passed）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 结果集比对判题内核"
```

---

## Task 4：PGlite 运行器（真 Postgres，Node 下 TDD）

**Files:**
- Create: `lib/sql/runner.ts`
- Test: `lib/sql/runner.test.ts`

- [ ] **Step 1: 写失败测试（用真实 PGlite，跑在 Node）**

Create `lib/sql/runner.test.ts`:
```ts
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
    expect(r.rows).toEqual([[1, 'a'], [2, 'b']]);
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
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run lib/sql/runner.test.ts`
Expected: FAIL —— 找不到 `@/lib/sql/runner`。

- [ ] **Step 3: 写实现**

Create `lib/sql/runner.ts`:
```ts
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
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run lib/sql/runner.test.ts`
Expected: PASS（3 passed）。若报 ESM/WASM 错误，按 Task 1 Step 3 注释提示打开 `server.deps.inline` 后重跑。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: PGlite 真 Postgres 运行器"
```

---

## Task 5：判题（组合 runner + compare，Node 下 TDD）

**Files:**
- Create: `lib/sql/judgeExercise.ts`
- Test: `lib/sql/judgeExercise.test.ts`

- [ ] **Step 1: 写失败测试**

Create `lib/sql/judgeExercise.test.ts`:
```ts
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
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run lib/sql/judgeExercise.test.ts`
Expected: FAIL —— 找不到 `@/lib/sql/judgeExercise`。

- [ ] **Step 3: 写实现**

Create `lib/sql/judgeExercise.ts`:
```ts
import type { Exercise, ResultSet, Verdict } from './types';
import { runOnSeed, SqlError } from './runner';
import { compareResults } from './compare';

export interface JudgeResult {
  verdict: Verdict;
  actual?: ResultSet;
  expected?: ResultSet;
}

export async function judgeExercise(ex: Exercise, userSql: string): Promise<JudgeResult> {
  const expected = await runOnSeed(ex.seedSql, ex.solutionSql);
  let actual: ResultSet;
  try {
    actual = await runOnSeed(ex.seedSql, userSql);
  } catch (e) {
    if (e instanceof SqlError) {
      return { verdict: { passed: false, reason: `SQL 报错：${e.message}` }, expected };
    }
    throw e;
  }
  return { verdict: compareResults(expected, actual, ex.orderMatters), actual, expected };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run lib/sql/judgeExercise.test.ts`
Expected: PASS（4 passed）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 练习判题（运行器+比对）"
```

---

## Task 6：结果表组件（jsdom TDD）

**Files:**
- Create: `components/ResultTable.tsx`
- Test: `components/ResultTable.test.tsx`

- [ ] **Step 1: 写失败测试**

Create `components/ResultTable.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultTable } from '@/components/ResultTable';

describe('ResultTable', () => {
  it('renders column headers and cells', () => {
    render(<ResultTable result={{ columns: ['id', 'name'], rows: [[1, '小明']] }} />);
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('小明')).toBeInTheDocument();
  });

  it('renders NULL marker for null cells', () => {
    render(<ResultTable result={{ columns: ['c'], rows: [[null]] }} />);
    expect(screen.getByText('NULL')).toBeInTheDocument();
  });

  it('shows an empty-result message', () => {
    render(<ResultTable result={{ columns: ['c'], rows: [] }} />);
    expect(screen.getByText(/没有返回任何行/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run components/ResultTable.test.tsx`
Expected: FAIL —— 找不到 `@/components/ResultTable`。

- [ ] **Step 3: 写实现（纯色，无渐变）**

Create `components/ResultTable.tsx`:
```tsx
import type { ResultSet } from '@/lib/sql/types';

export function ResultTable({ result }: { result: ResultSet }) {
  if (result.rows.length === 0) {
    return <p className="text-sm text-slate-400">查询成功，但没有返回任何行。</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-slate-800">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-900">
          <tr>
            {result.columns.map((c, i) => (
              <th key={i} className="border-b border-slate-700 px-3 py-2 font-mono text-slate-200">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, ri) => (
            <tr key={ri} className="odd:bg-slate-950 even:bg-slate-900">
              {row.map((cell, ci) => (
                <td key={ci} className="border-b border-slate-800 px-3 py-2 font-mono text-slate-300">
                  {cell === null ? <span className="text-slate-600">NULL</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run components/ResultTable.test.tsx`
Expected: PASS（3 passed）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 结果表组件"
```

---

## Task 7：判定横幅组件（jsdom TDD）

**Files:**
- Create: `components/VerdictBanner.tsx`
- Test: `components/VerdictBanner.test.tsx`

- [ ] **Step 1: 写失败测试**

Create `components/VerdictBanner.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerdictBanner } from '@/components/VerdictBanner';

describe('VerdictBanner', () => {
  it('shows a success status when passed', () => {
    render(<VerdictBanner verdict={{ passed: true }} />);
    expect(screen.getByRole('status')).toHaveTextContent('通过');
  });

  it('shows an alert with the reason when failed', () => {
    render(<VerdictBanner verdict={{ passed: false, reason: '期望 5 行，实际 4 行' }} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('期望 5 行，实际 4 行');
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run components/VerdictBanner.test.tsx`
Expected: FAIL —— 找不到 `@/components/VerdictBanner`。

- [ ] **Step 3: 写实现（纯色，无渐变）**

Create `components/VerdictBanner.tsx`:
```tsx
import type { Verdict } from '@/lib/sql/types';

export function VerdictBanner({ verdict }: { verdict: Verdict }) {
  if (verdict.passed) {
    return (
      <div role="status" className="rounded-md bg-emerald-600 px-4 py-3 text-white">
        ✅ 通过！答案正确。
      </div>
    );
  }
  return (
    <div role="alert" className="rounded-md bg-rose-600 px-4 py-3 text-white">
      ❌ 还不对：{verdict.reason ?? '结果与期望不一致'}
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run components/VerdictBanner.test.tsx`
Expected: PASS（2 passed）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 判定横幅组件"
```

---

## Task 8：SQL 编辑器 + 练习场（mock 判题做 wiring 测试）

**Files:**
- Create: `components/SqlEditor.tsx`
- Create: `components/Playground.tsx`
- Test: `components/Playground.test.tsx`

- [ ] **Step 1: 写 CodeMirror 薄封装**

Create `components/SqlEditor.tsx`:
```tsx
'use client';
import CodeMirror from '@uiw/react-codemirror';
import { sql, PostgreSQL } from '@codemirror/lang-sql';

export function SqlEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-800">
      <CodeMirror
        value={value}
        height="180px"
        theme="dark"
        extensions={[sql({ dialect: PostgreSQL })]}
        onChange={onChange}
        basicSetup={{ lineNumbers: true }}
      />
    </div>
  );
}
```

- [ ] **Step 2: 写失败测试（mock 掉 CodeMirror 与判题）**

Create `components/Playground.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// 用普通 textarea 替换 CodeMirror（jsdom 下不易驱动 contenteditable）
vi.mock('@/components/SqlEditor', () => ({
  SqlEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const judgeExercise = vi.fn();
vi.mock('@/lib/sql/judgeExercise', () => ({ judgeExercise: (...a: unknown[]) => judgeExercise(...a) }));

import { Playground } from '@/components/Playground';
import type { Exercise } from '@/lib/sql/types';

const EX: Exercise = {
  id: 'x', moduleId: 'm1', title: 't', difficulty: 1, prompt: 'p',
  seedSql: '', solutionSql: 'SELECT 1', orderMatters: false, starterSql: 'SELECT 1',
};

beforeEach(() => judgeExercise.mockReset());

describe('Playground', () => {
  it('judges the current sql on run and shows a passing verdict', async () => {
    judgeExercise.mockResolvedValue({
      verdict: { passed: true },
      actual: { columns: ['n'], rows: [[1]] },
    });
    render(<Playground exercise={EX} />);
    fireEvent.click(screen.getByRole('button', { name: /运行/ }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('通过'));
    expect(judgeExercise).toHaveBeenCalledWith(EX, 'SELECT 1');
  });

  it('shows a failing verdict with reason', async () => {
    judgeExercise.mockResolvedValue({ verdict: { passed: false, reason: '期望 1 行' } });
    render(<Playground exercise={EX} />);
    fireEvent.click(screen.getByRole('button', { name: /运行/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('期望 1 行'));
  });
});
```

- [ ] **Step 3: 运行测试，确认失败**

Run: `npx vitest run components/Playground.test.tsx`
Expected: FAIL —— 找不到 `@/components/Playground`。

- [ ] **Step 4: 写练习场实现**

Create `components/Playground.tsx`:
```tsx
'use client';
import { useState } from 'react';
import type { Exercise } from '@/lib/sql/types';
import { judgeExercise, type JudgeResult } from '@/lib/sql/judgeExercise';
import { SqlEditor } from './SqlEditor';
import { ResultTable } from './ResultTable';
import { VerdictBanner } from './VerdictBanner';

export function Playground({ exercise }: { exercise: Exercise }) {
  const [code, setCode] = useState(exercise.starterSql ?? '');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      setResult(await judgeExercise(exercise, code));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <SqlEditor value={code} onChange={setCode} />
      <button
        onClick={run}
        disabled={running}
        className="rounded-md bg-sky-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {running ? '运行中…' : '运行 ▶'}
      </button>
      {error && <div role="alert" className="text-sm text-rose-400">运行出错：{error}</div>}
      {result && <VerdictBanner verdict={result.verdict} />}
      {result?.actual && <ResultTable result={result.actual} />}
    </div>
  );
}
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `npx vitest run components/Playground.test.tsx`
Expected: PASS（2 passed）。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: SQL 编辑器与练习场组件"
```

---

## Task 9：页面路由（落地页 + 练习页）

**Files:**
- Create: `app/exercise/[id]/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`, `app/globals.css`

- [ ] **Step 1: 写练习页路由**

Create `app/exercise/[id]/page.tsx`:
```tsx
import { getExerciseById } from '@/content/exercises';
import { Playground } from '@/components/Playground';
import { notFound } from 'next/navigation';

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exercise = getExerciseById(id);
  if (!exercise) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-sky-400">
          {exercise.moduleId} · 难度 {exercise.difficulty}
        </p>
        <h1 className="text-2xl font-bold text-slate-100">{exercise.title}</h1>
      </header>
      <p className="leading-relaxed text-slate-300">{exercise.prompt}</p>
      <Playground exercise={exercise} />
    </main>
  );
}
```

- [ ] **Step 2: 改落地页为 CTA**

Replace `app/page.tsx` 全部内容：
```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-slate-100">SQL 道场</h1>
      <p className="text-lg text-slate-300">
        在浏览器里跑真实 Postgres，边练边和 AI 结对，从小白到 senior。
      </p>
      <Link
        href="/exercise/m1-01"
        className="inline-block rounded-md bg-sky-600 px-6 py-3 text-white"
      >
        立即开练 ▶
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: 设深色纯色底**

在 `app/globals.css` 末尾追加（覆盖默认）：
```css
body {
  background-color: #020617; /* slate-950，纯色，无渐变 */
  color: #e2e8f0;            /* slate-200 */
}
```
若 `app/layout.tsx` 的 `<body>` 带有 create-next-app 默认的字体/渐变类，保留字体类、删掉任何 `bg-gradient-*`。

- [ ] **Step 4: 本地手动验证**

Run: `npm run dev`，浏览器开 `http://localhost:3000`
Expected: 落地页 → 点"立即开练" → `/exercise/m1-01`；编辑器输入 `SELECT * FROM users;` → 点"运行" → 看到 5 行结果 + 绿色"✅ 通过"。再试 `m1-04` 升序应判❌、降序判✅。确认 PGlite 首次运行时按需加载（Network 里出现 .wasm）。验证完 Ctrl-C。

- [ ] **Step 5: 跑全量测试 + 构建**

Run: `npm test && npm run build`
Expected: 全部测试 PASS；`next build` 成功无类型错误。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 落地页与练习页路由"
```

---

## Task 10：部署到 Cloudflare（OpenNext）

**Files:**
- Create: `open-next.config.ts`, `wrangler.jsonc`
- Modify: `package.json`(脚本)、`.gitignore`

> 执行前查 `cloudflare` / `wrangler` skill 校准当前命令与配置字段；下面是当前形态。Plan 1 无后端绑定（无 D1/KV/密钥），部署最简。

- [ ] **Step 1: 安装适配器**

Run:
```bash
cd /home/ubuntu/sql-dojo
npm i -D @opennextjs/cloudflare wrangler
```

- [ ] **Step 2: 写 OpenNext 配置**

Create `open-next.config.ts`:
```ts
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig({});
```

- [ ] **Step 3: 写 wrangler 配置**

Create `wrangler.jsonc`:
```jsonc
{
  "name": "sql-dojo",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-03-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" }
}
```

- [ ] **Step 4: 加部署脚本与忽略产物**

`package.json` 的 `"scripts"` 加：
```json
"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
```
`.gitignore` 末尾加：
```
.open-next/
.wrangler/
```

- [ ] **Step 5: 构建并部署**

Run:
```bash
cd /home/ubuntu/sql-dojo
npm run deploy
```
若提示登录，让用户在会话里执行 `! npx wrangler login`（交互式登录）。
Expected: 输出一个 `*.workers.dev` URL。

- [ ] **Step 6: 线上验证**

打开部署 URL → `/exercise/m1-01` → 输入 `SELECT * FROM users;` → 运行 → 线上同样出 5 行 + ✅（确认 .wasm 在生产环境正常加载）。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "chore: Cloudflare(OpenNext) 部署配置"
```

---

## 自检（Spec 覆盖 / 占位符 / 类型一致性）

**Spec 覆盖（对照 §13 Phase 1，本计划只认领"练习场内核 + 上线"这一片）：**
- §13.1 脚手架/部署 → Task 1、Task 10 ✅
- §13.3 练习场（编辑器+PGlite+结果+报错）→ Task 4、Task 6、Task 8、Task 9 ✅
- §13.4 判题引擎（§9 格式 + 集合/有序 + ✅❌ + 差异）→ Task 2、Task 3、Task 5、Task 7 ✅
- §13.5 题库内容 → 本计划仅模块1的 4 道样例题（**全量模块1–4 题库属 Plan 2**，非本计划缺口）
- §13.2 鉴权 / §13.6 路线图 / §13.7 AI / §13.8 进度 → **不属本计划**（Plan 2/3/4），已在文首声明拆分，非缺口。

**占位符扫描：** 无 TBD/TODO；每个改代码的步骤都给了完整代码与确切命令、预期输出。✅

**类型一致性：** `Exercise/ResultSet/Verdict`（Task 2）贯穿 compare（T3）、runner（T4）、judge（T5）、组件（T6–T8）；`JudgeResult` 在 Task 5 定义并由 Playground（T8）引用；`runOnSeed/SqlError/compareResults/judgeExercise/getExerciseById` 名称在定义与使用处一致。✅

**交付物（Plan 1 完成时）：** 一个已部署在 Cloudflare 的应用——游客打开练习页，对浏览器内真实 Postgres 写并运行 SQL，按结果集即时判对错。后续 Plan 2/3/4 在此地基上叠加内容、鉴权与 AI。
