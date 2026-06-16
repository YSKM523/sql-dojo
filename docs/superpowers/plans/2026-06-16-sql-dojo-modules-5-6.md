# 模块 5–6 + checkSql 判题扩展 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 SQL 道场加模块 5（建模/DDL，进阶）+ 模块 6（性能/优化，senior），并扩展判题器以支持 DDL 题（先建后验 checkSql）。

**Architecture:** 给 `Exercise` 加可选 `checkSql`：有则把"提交的 SQL"当 setup（`exec` 多语句）跑完后再跑 `checkSql`（`query`）取结果，与"solutionSql 当 setup + 同一 checkSql"的结果比对；无则维持现状。`SqlSession` 加 `runCheck`，`ExerciseJudge` 按 `checkSql` 分支。模块 5/6 是纯内容（content/exercises/module{5,6}.ts + modules/index.ts 的 ModuleDef/课程），React 组件零改动（数据驱动）。

**Tech Stack:** PGlite（真 Postgres/WASM）、Vitest（TDD）、Next.js 16、TypeScript。

参考 spec：`docs/superpowers/specs/2026-06-16-sql-dojo-modules-5-6-design.md`

---

## File Structure

**修改：**
- `lib/sql/types.ts` — `Exercise` 加 `checkSql?: string`；`TierKey` 加 `'advanced'`
- `components/ModuleCard.tsx` — `TIER_BADGE` 加 `advanced` 色（`Record<TierKey,string>`，tsc 会强制）
- `lib/sql/runner.ts` — `SqlSession` 加 `runCheck(setupSql, checkSql)`
- `lib/sql/judgeExercise.ts` — `ExerciseJudge` 按 `ex.checkSql` 分支
- `content/exercises/index.ts` — 注册 module5/module6
- `content/modules/index.ts` — 加 m5/m6 的 `ModuleDef`（含概念课）

**新建：**
- `lib/sql/runCheck.test.ts` — `runCheck` 单测
- `lib/sql/judgeCheckSql.test.ts` — checkSql 判题单测
- `content/exercises/module5.ts` — 模块 5 题库（8 题）
- `content/exercises/module6.ts` — 模块 6 题库（8 题）

**不改：** Playground/ExerciseList/学习页等组件——按数据驱动，新模块/段位自动出现。

约定：测试 `npx vitest run <file>`；提交信息中文、**不带 Co-Authored-By**（仓库身份 YSKM523）。

---

## Task 1: checkSql 字段 + advanced 段位 + 段位色

**Files:**
- Modify: `lib/sql/types.ts`
- Modify: `components/ModuleCard.tsx`

- [ ] **Step 1: 给 Exercise 加 checkSql、给 TierKey 加 advanced**

在 `lib/sql/types.ts`：把 `Exercise` 的 `hints?: string[];` 之前加一行 `checkSql`，并把 `TierKey` 改为含 `advanced`。

`Exercise` 接口改为（在 `orderMatters` 之后、`hints` 之前插入 checkSql）：

```ts
export interface Exercise {
  id: string;
  moduleId: string;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prompt: string; // 中文题面
  seedSql: string; // 建表+插数据，每次运行前重置
  starterSql?: string; // 编辑器初始内容
  solutionSql: string; // 标准答案，用于生成期望结果集
  orderMatters: boolean; // 是否要求特定行顺序
  // 有则判题=把"提交的 SQL"当 setup(exec 多语句)跑完→再跑 checkSql(query)取结果，
  // 与「solutionSql 当 setup + 同一 checkSql」比对。用于 DDL/写库类题。
  checkSql?: string;
  hints?: string[];
}
```

`TierKey` 改为：

```ts
export type TierKey = 'beginner' | 'intermediate' | 'advanced' | 'senior' | 'sprint';
```

- [ ] **Step 2: 给 ModuleCard 的 TIER_BADGE 补 advanced 色**

`components/ModuleCard.tsx` 的 `TIER_BADGE`（`Record<TierKey, string>`）加 `advanced` 一项（纯色、无渐变；进阶用橙）：

```ts
const TIER_BADGE: Record<TierKey, string> = {
  beginner: 'bg-emerald-600 text-white',
  intermediate: 'bg-amber-600 text-white',
  advanced: 'bg-orange-600 text-white',
  senior: 'bg-rose-600 text-white',
  sprint: 'bg-sky-600 text-white',
};
```

- [ ] **Step 3: 类型检查**

Run: `cd /home/ubuntu/sql-dojo && npx tsc --noEmit`
Expected: 无报错（`Record<TierKey,...>` 已含 advanced，否则会报缺键）。

- [ ] **Step 4: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add lib/sql/types.ts components/ModuleCard.tsx
git commit -m "feat: Exercise 加 checkSql 字段 + advanced 段位(进阶)"
```

---

## Task 2: SqlSession.runCheck（TDD）

**Files:**
- Modify: `lib/sql/runner.ts`
- Test: `lib/sql/runCheck.test.ts`

- [ ] **Step 1: 写失败测试**

Create `lib/sql/runCheck.test.ts`:

```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/sql/runCheck.test.ts`
Expected: FAIL（`runCheck` 不存在）。

- [ ] **Step 3: 实现 runCheck**

在 `lib/sql/runner.ts` 的 `SqlSession` 类里，`run` 方法之后、`close` 方法之前，加 `runCheck`：

```ts
  // 先把 setupSql（可多语句 DDL）跑完，再跑 checkSql 取结果；全程 BEGIN/ROLLBACK 隔离，
  // 不污染种子。用于 DDL/写库类判题。出错抛 SqlError（与 run 一致）。
  async runCheck(setupSql: string, checkSql: string): Promise<ResultSet> {
    const db = await this.db();
    if (!this.seeded) {
      if (this.seedSql.trim()) await db.exec(this.seedSql);
      this.seeded = true;
    }
    try {
      await db.exec('BEGIN');
      if (setupSql.trim()) await db.exec(setupSql);
      const res = await db.query(checkSql);
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
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/sql/runCheck.test.ts`
Expected: PASS（3 用例）。

- [ ] **Step 5: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add lib/sql/runner.ts lib/sql/runCheck.test.ts
git commit -m "feat: SqlSession.runCheck(先建后验,多语句 setup + 校验查询)"
```

---

## Task 3: ExerciseJudge 的 checkSql 分支（TDD）

**Files:**
- Modify: `lib/sql/judgeExercise.ts`
- Test: `lib/sql/judgeCheckSql.test.ts`

- [ ] **Step 1: 写失败测试**

Create `lib/sql/judgeCheckSql.test.ts`:

```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/sql/judgeCheckSql.test.ts`
Expected: FAIL（判题器还没分支，checkSql 题被当普通题：跑 `db.query(多语句 solutionSql)` 多半报错或结果不符）。

- [ ] **Step 3: 给 ExerciseJudge 加 checkSql 分支**

在 `lib/sql/judgeExercise.ts`：把 `ensureExpected` 与 `judge` 改为按 `this.ex.checkSql` 分支。

`ensureExpected` 改为：

```ts
  private async ensureExpected(): Promise<ResultSet> {
    if (!this.expected) {
      this.expected = this.ex.checkSql
        ? await this.session.runCheck(this.ex.solutionSql, this.ex.checkSql)
        : await this.session.run(this.ex.solutionSql);
    }
    return this.expected;
  }
```

`judge` 里取 `actual` 的那行改为分支：

```ts
  async judge(userSql: string): Promise<JudgeResult> {
    const expected = await this.ensureExpected();
    let actual: ResultSet;
    try {
      actual = this.ex.checkSql
        ? await this.session.runCheck(userSql, this.ex.checkSql)
        : await this.session.run(userSql);
    } catch (e) {
      if (e instanceof SqlError) {
        return { verdict: { passed: false, reason: `SQL 报错：${e.message}` }, expected };
      }
      throw e;
    }
    return { verdict: compareResults(expected, actual, this.ex.orderMatters), actual, expected };
  }
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/sql/judgeCheckSql.test.ts`
Expected: PASS（3 用例）。

- [ ] **Step 5: 回归 + 提交**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/sql`
Expected: lib/sql 全绿（含原有 runner/judge/compare 测试不回归）。

```bash
cd /home/ubuntu/sql-dojo
git add lib/sql/judgeExercise.ts lib/sql/judgeCheckSql.test.ts
git commit -m "feat: 判题器支持 checkSql(DDL/写库类题先建后验)"
```

---

## Task 4: 模块 5「建模与 DDL」内容（8 题 + 概念课）

**Files:**
- Create: `content/exercises/module5.ts`
- Modify: `content/exercises/index.ts`
- Modify: `content/modules/index.ts`

> 约束验证用 `pg_constraint`（`contype`: `p`主键 / `u`唯一 / `f`外键 / `c`检查）；索引用 `pg_indexes`。这些是真 Postgres 系统目录，PGlite 支持。**实现后必跑 soundness（Step 3）；若某题 checkSql 在 PGlite 里返回的计数与期望不符，微调该 checkSql（如加 `contype`/列名过滤）使标准答案确定性通过，保持"验证该约束存在"的本意。**

- [ ] **Step 1: 写 module5.ts**

Create `content/exercises/module5.ts`:

```ts
import type { Exercise } from '@/lib/sql/types';

// 模块 5：建模与 DDL。多为空种子（用户从零建表），用 checkSql 先建后验。
// 约束类题用 pg_constraint 系统目录验证；数据类题直接读回数据比对。
export const module5Exercises: Exercise[] = [
  {
    id: 'm5-01',
    moduleId: 'm5',
    title: '建第一张表',
    difficulty: 2,
    prompt:
      "建一张叫 book 的表，字段：id 整数主键、title 文本、price 数值(numeric)、sold 布尔(boolean)。再插入两行：(1,'SQL入门',39.9,true) 和 (2,'数据建模',59.0,false)。",
    seedSql: '',
    starterSql:
      "CREATE TABLE book (\n  id integer PRIMARY KEY,\n  -- 补全 title / price / sold\n);\n-- INSERT INTO book VALUES ...",
    solutionSql:
      "CREATE TABLE book (id integer PRIMARY KEY, title text, price numeric, sold boolean); INSERT INTO book VALUES (1,'SQL入门',39.9,true),(2,'数据建模',59.0,false);",
    checkSql: 'SELECT id, title, price, sold FROM book ORDER BY id;',
    orderMatters: false,
    hints: ['CREATE TABLE 表名 (列名 类型, ...)；numeric 存小数、boolean 存 true/false。'],
  },
  {
    id: 'm5-02',
    moduleId: 'm5',
    title: '非空与默认值',
    difficulty: 3,
    prompt:
      "建表 account：id 整数主键、email 文本且非空(NOT NULL)、role 文本默认 'user'(DEFAULT)。只插入 id 和 email 两列（role 走默认值）：(1,'a@x.com')。",
    seedSql: '',
    starterSql:
      "CREATE TABLE account (\n  id integer PRIMARY KEY,\n  email text NOT NULL,\n  role text DEFAULT '...'\n);\n-- 只插 id 和 email",
    solutionSql:
      "CREATE TABLE account (id integer PRIMARY KEY, email text NOT NULL, role text DEFAULT 'user'); INSERT INTO account (id, email) VALUES (1,'a@x.com');",
    checkSql: 'SELECT id, email, role FROM account;',
    orderMatters: false,
    hints: ["插入时不给 role，它就用 DEFAULT 'user'；所以读回来 role 应是 'user'。"],
  },
  {
    id: 'm5-03',
    moduleId: 'm5',
    title: '唯一约束',
    difficulty: 3,
    prompt:
      '建表 member：id 整数主键、username 文本且唯一(UNIQUE)。（我们会查系统目录确认 username 上有一个 UNIQUE 约束。）',
    seedSql: '',
    starterSql: 'CREATE TABLE member (\n  id integer PRIMARY KEY,\n  username text UNIQUE\n);',
    solutionSql: 'CREATE TABLE member (id integer PRIMARY KEY, username text UNIQUE);',
    checkSql:
      "SELECT count(*)::int AS n FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE t.relname = 'member' AND c.contype = 'u';",
    orderMatters: false,
    hints: ['列后面加 UNIQUE 就是唯一约束；contype=u 在系统目录里代表 unique。'],
  },
  {
    id: 'm5-04',
    moduleId: 'm5',
    title: '外键关联',
    difficulty: 4,
    prompt:
      '建两张表：team(id 整数主键、name 文本) 和 player(id 整数主键、team_id 整数，外键 REFERENCES team(id))。（会查目录确认 player 上有外键。）',
    seedSql: '',
    starterSql:
      'CREATE TABLE team (id integer PRIMARY KEY, name text);\nCREATE TABLE player (\n  id integer PRIMARY KEY,\n  team_id integer REFERENCES team(id)\n);',
    solutionSql:
      'CREATE TABLE team (id integer PRIMARY KEY, name text); CREATE TABLE player (id integer PRIMARY KEY, team_id integer REFERENCES team(id));',
    checkSql:
      "SELECT count(*)::int AS n FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE t.relname = 'player' AND c.contype = 'f';",
    orderMatters: false,
    hints: ['team_id integer REFERENCES team(id) 就声明了外键；先建被引用的 team。'],
  },
  {
    id: 'm5-05',
    moduleId: 'm5',
    title: 'CHECK 约束',
    difficulty: 4,
    prompt:
      '建表 goods：id 整数主键、price 数值，并加一个 CHECK 约束保证 price > 0。（会查目录确认有 CHECK。）',
    seedSql: '',
    starterSql: 'CREATE TABLE goods (\n  id integer PRIMARY KEY,\n  price numeric CHECK (price > 0)\n);',
    solutionSql: 'CREATE TABLE goods (id integer PRIMARY KEY, price numeric CHECK (price > 0));',
    checkSql:
      "SELECT count(*)::int AS n FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE t.relname = 'goods' AND c.contype = 'c';",
    orderMatters: false,
    hints: ['CHECK (条件) 写在列后或表级；contype=c 代表 check 约束。'],
  },
  {
    id: 'm5-06',
    moduleId: 'm5',
    title: '范式化：拆掉冗余',
    difficulty: 4,
    prompt:
      "把'订单里重复存客户名'的反范式拆开：建 cust(id 主键、name) 和 ord(id 主键、cust_id 外键 REFERENCES cust(id)、amount 整数)。插入客户 (1,'A')(2,'B')；订单 (1,1,100)(2,1,50)(3,2,80)。",
    seedSql: '',
    starterSql:
      'CREATE TABLE cust (id integer PRIMARY KEY, name text);\nCREATE TABLE ord (id integer PRIMARY KEY, cust_id integer REFERENCES cust(id), amount integer);\n-- 两张表各插数据',
    solutionSql:
      "CREATE TABLE cust (id integer PRIMARY KEY, name text); CREATE TABLE ord (id integer PRIMARY KEY, cust_id integer REFERENCES cust(id), amount integer); INSERT INTO cust VALUES (1,'A'),(2,'B'); INSERT INTO ord VALUES (1,1,100),(2,1,50),(3,2,80);",
    checkSql:
      'SELECT c.name, sum(o.amount)::int AS total FROM cust c JOIN ord o ON o.cust_id = c.id GROUP BY c.name ORDER BY c.name;',
    orderMatters: false,
    hints: ['客户名只存在 cust 一处，ord 用 cust_id 外键引用；校验会 JOIN 两表按客户求和。'],
  },
  {
    id: 'm5-07',
    moduleId: 'm5',
    title: '建索引',
    difficulty: 3,
    prompt:
      "建表 log(id 整数主键、level 文本、ts 日期) 并插两行 (1,'INFO','2026-01-01')(2,'ERROR','2026-01-02')，然后在 level 列上建一个名为 idx_log_level 的索引。",
    seedSql: '',
    starterSql:
      "CREATE TABLE log (id integer PRIMARY KEY, level text, ts date);\nINSERT INTO log VALUES (1,'INFO','2026-01-01'),(2,'ERROR','2026-01-02');\nCREATE INDEX idx_log_level ON log(level);",
    solutionSql:
      "CREATE TABLE log (id integer PRIMARY KEY, level text, ts date); INSERT INTO log VALUES (1,'INFO','2026-01-01'),(2,'ERROR','2026-01-02'); CREATE INDEX idx_log_level ON log(level);",
    checkSql:
      "SELECT count(*)::int AS n FROM pg_indexes WHERE tablename = 'log' AND indexname = 'idx_log_level';",
    orderMatters: false,
    hints: ['CREATE INDEX 索引名 ON 表(列)；pg_indexes 里能查到刚建的索引。'],
  },
  {
    id: 'm5-08',
    moduleId: 'm5',
    title: 'Boss：设计博客 schema',
    difficulty: 5,
    prompt:
      "为迷你博客设计 schema：blog_user(id 主键、name) 和 post(id 主键、author_id 外键 REFERENCES blog_user(id)、title、likes 整数)。插入用户 (1,'Ann')(2,'Bob')；文章 (1,1,'Hello',5)(2,1,'World',3)(3,2,'Hi',10)。",
    seedSql: '',
    starterSql:
      'CREATE TABLE blog_user (id integer PRIMARY KEY, name text);\nCREATE TABLE post (\n  id integer PRIMARY KEY,\n  author_id integer REFERENCES blog_user(id),\n  title text,\n  likes integer\n);\n-- 两张表插数据',
    solutionSql:
      "CREATE TABLE blog_user (id integer PRIMARY KEY, name text); CREATE TABLE post (id integer PRIMARY KEY, author_id integer REFERENCES blog_user(id), title text, likes integer); INSERT INTO blog_user VALUES (1,'Ann'),(2,'Bob'); INSERT INTO post VALUES (1,1,'Hello',5),(2,1,'World',3),(3,2,'Hi',10);",
    checkSql:
      'SELECT u.name, sum(p.likes)::int AS likes FROM blog_user u JOIN post p ON p.author_id = u.id GROUP BY u.name ORDER BY u.name;',
    orderMatters: false,
    hints: ['先建被引用的 blog_user，再建 post 带外键；校验按作者汇总获赞数。'],
  },
];
```

- [ ] **Step 2: 注册 module5 + 加 ModuleDef/概念课**

`content/exercises/index.ts`：import 并并入 `allExercises`：

把顶部 import 区与 `allExercises` 改为（加 module5）：

```ts
import type { Exercise } from '@/lib/sql/types';
import { module1Exercises } from './module1';
import { module2Exercises } from './module2';
import { module3Exercises } from './module3';
import { module4Exercises } from './module4';
import { module5Exercises } from './module5';

export const allExercises: Exercise[] = [
  ...module1Exercises,
  ...module2Exercises,
  ...module3Exercises,
  ...module4Exercises,
  ...module5Exercises,
];
```

`content/modules/index.ts`：在 m4 那个对象之后、`];` 之前，加 m5 的 `ModuleDef`：

```ts
  {
    id: 'm5',
    order: 5,
    title: '建模与 DDL',
    tierKey: 'advanced',
    tierLabel: '进阶',
    summary: '把数据"存得对"：建表、约束、外键、索引、范式。',
    lesson: [
      '## 建模与 DDL：把数据"存得对"',
      '',
      'DDL 是定义数据结构的语言——建表、约束、索引。把结构设计对，数据才可靠。',
      '',
      '### 建表与类型',
      '',
      '```sql',
      'CREATE TABLE book (id integer PRIMARY KEY, title text, price numeric, sold boolean);',
      '```',
      '',
      '常用类型：`integer` 整数、`text` 文本、`numeric` 小数、`boolean` 真假、`date` 日期。',
      '',
      '### 约束 = 数据的护栏',
      '',
      '- `NOT NULL`：这列不能为空。',
      '- `DEFAULT v`：不给值时用默认值。',
      '- `PRIMARY KEY`：主键，唯一且非空，一行的身份证。',
      '- `UNIQUE`：该列不允许重复。',
      '- `FOREIGN KEY ... REFERENCES`：外键，保证引用的行真实存在。',
      '- `CHECK(条件)`：自定义校验，如 `CHECK (price > 0)`。',
      '',
      '### 范式 vs 反范式',
      '',
      '范式：拆表去冗余，改一处即可、靠外键关联（一致性强）。反范式：故意冗余换查询速度。先范式，再按需反范式。',
      '',
      '### 索引',
      '',
      '```sql',
      'CREATE INDEX idx_log_level ON log(level);',
      '```',
      '',
      '索引加速按该列查找，代价是占空间、拖慢写入。高频过滤/JOIN 的列才值得建。',
      '',
      '### 事务（了解）',
      '',
      '`BEGIN ... COMMIT` 把多步打包成"全成或全不成"（原子性），出错用 `ROLLBACK` 回滚。',
      '',
      '> 本模块练习你会亲手建表、加约束——"运行"会跑一个校验查询确认你建对了。',
    ].join('\n'),
  },
```

- [ ] **Step 3: 跑 soundness + integrity（验证每题 solution 自洽）**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run content/`
Expected: 全绿。**若某 checkSql 题失败**（多为 pg_constraint/pg_indexes 在 PGlite 里计数与期望不符）：读失败信息，微调该题 checkSql 使标准答案确定性通过（保持"验证该约束/索引存在"的本意，例如按 `contype` 或列名进一步过滤），再重跑直到全绿。不要改判题器逻辑。

- [ ] **Step 4: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add content/exercises/module5.ts content/exercises/index.ts content/modules/index.ts
git commit -m "feat: 模块5 建模与DDL(8题DDL+概念课,checkSql判题)"
```

---

## Task 5: 模块 6「性能与优化」内容（8 题 + 概念课）

**Files:**
- Create: `content/exercises/module6.ts`
- Modify: `content/exercises/index.ts`
- Modify: `content/modules/index.ts`

> 数据复用模块 2 导出的 `SHOP_SEED`（`customers(id,name,city)` + `orders(id,customer_id,amount,created_at)`）。多为结果集等价题；m6-06 用 checkSql 验证建索引。

- [ ] **Step 1: 写 module6.ts**

Create `content/exercises/module6.ts`:

```ts
import type { Exercise } from '@/lib/sql/types';
import { SHOP_SEED } from './module2';

// 模块 6：性能与优化。结果集等价的改写题（证明改写前后等价）+ 一道建索引(checkSql)。
export const module6Exercises: Exercise[] = [
  {
    id: 'm6-01',
    moduleId: 'm6',
    title: '相关子查询改成 JOIN',
    difficulty: 3,
    prompt:
      '下面这种"对每个订单都去查一次客户名"的相关子查询写法慢。请改写成 JOIN，输出订单 id、客户 name、amount。',
    seedSql: SHOP_SEED,
    starterSql:
      '-- 慢写法：SELECT id, (SELECT name FROM customers c WHERE c.id=o.customer_id) AS name, amount FROM orders o;\nSELECT o.id, c.name, o.amount\nFROM orders o\nJOIN customers c ON ...;',
    solutionSql: 'SELECT o.id, c.name, o.amount FROM orders o JOIN customers c ON c.id = o.customer_id;',
    orderMatters: false,
    hints: ['把子查询里的关联条件 c.id = o.customer_id 变成 JOIN ... ON。'],
  },
  {
    id: 'm6-02',
    moduleId: 'm6',
    title: '用 EXISTS 替代 IN',
    difficulty: 3,
    prompt: '找出"有订单"的客户 name。用 EXISTS 改写（比 IN 更稳，避免大子集与 NULL 陷阱）。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT name FROM customers c\nWHERE EXISTS (\n  SELECT 1 FROM orders o WHERE ...\n);',
    solutionSql:
      'SELECT name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);',
    orderMatters: false,
    hints: ['EXISTS (SELECT 1 FROM orders WHERE 关联条件) 一旦匹配就返回真。'],
  },
  {
    id: 'm6-03',
    moduleId: 'm6',
    title: '列裁剪：别 SELECT *',
    difficulty: 2,
    prompt: '只取需要的列：输出每位客户的 id 和 city（不要 SELECT *，避免白读 name 列）。',
    seedSql: SHOP_SEED,
    starterSql: 'SELECT id, city FROM customers;',
    solutionSql: 'SELECT id, city FROM customers;',
    orderMatters: false,
    hints: ['明确写出要的列，既省 IO 又让覆盖索引有机会生效。'],
  },
  {
    id: 'm6-04',
    moduleId: 'm6',
    title: '去重：DISTINCT',
    difficulty: 2,
    prompt: '列出"有订单的客户 id"，去重。输出 customer_id。',
    seedSql: SHOP_SEED,
    starterSql: 'SELECT DISTINCT customer_id FROM orders;',
    solutionSql: 'SELECT DISTINCT customer_id FROM orders;',
    orderMatters: false,
    hints: ['DISTINCT 去掉重复行；这里也可以用 GROUP BY customer_id。'],
  },
  {
    id: 'm6-05',
    moduleId: 'm6',
    title: 'sargable：别把列包在函数里',
    difficulty: 4,
    prompt:
      '查 2026 年 2 月的订单 id。不要用 EXTRACT(month FROM created_at)=2 这种"函数包裹列"的写法（索引用不上），改用日期范围。',
    seedSql: SHOP_SEED,
    starterSql:
      "-- 慢：WHERE EXTRACT(month FROM created_at)=2\nSELECT id FROM orders WHERE created_at >= '...' AND created_at < '...';",
    solutionSql:
      "SELECT id FROM orders WHERE created_at >= '2026-02-01' AND created_at < '2026-03-01';",
    orderMatters: false,
    hints: ['写成 created_at >= 月初 AND < 下月初，列没被函数包裹，索引才用得上（sargable）。'],
  },
  {
    id: 'm6-06',
    moduleId: 'm6',
    title: '加一个有用的索引',
    difficulty: 3,
    prompt:
      '为加速"按客户查订单"，给 orders 的 customer_id 建一个名为 idx_orders_cust 的索引。',
    seedSql: SHOP_SEED,
    starterSql: 'CREATE INDEX idx_orders_cust ON orders(customer_id);',
    solutionSql: 'CREATE INDEX idx_orders_cust ON orders(customer_id);',
    checkSql:
      "SELECT count(*)::int AS n FROM pg_indexes WHERE tablename = 'orders' AND indexname = 'idx_orders_cust';",
    orderMatters: false,
    hints: ['CREATE INDEX 索引名 ON orders(customer_id)；高频按客户过滤/JOIN 的列适合建。'],
  },
  {
    id: 'm6-07',
    moduleId: 'm6',
    title: '提前过滤：WHERE 不是 HAVING',
    difficulty: 4,
    prompt:
      '统计每位客户的订单数，但先把金额为 0 的订单用 WHERE 过滤掉再统计（提前减少要处理的行）。输出 customer_id 和 cnt。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT customer_id, count(*) AS cnt\nFROM orders\nWHERE amount > 0\nGROUP BY customer_id;',
    solutionSql:
      'SELECT customer_id, count(*)::int AS cnt FROM orders WHERE amount > 0 GROUP BY customer_id;',
    orderMatters: false,
    hints: ['过滤"行"用 WHERE（分组前），过滤"组"才用 HAVING；先 WHERE 减少行数更省。'],
  },
  {
    id: 'm6-08',
    moduleId: 'm6',
    title: 'Boss：重写慢查询',
    difficulty: 5,
    prompt:
      '把嵌套子查询重写得更清爽（用 CTE 或 JOIN），结果不变：找出"总额 ≥ 200"的客户 name 和总额 total。',
    seedSql: SHOP_SEED,
    starterSql:
      'WITH t AS (\n  SELECT customer_id, sum(amount) AS total\n  FROM orders GROUP BY customer_id HAVING sum(amount) >= 200\n)\nSELECT c.name, t.total\nFROM t JOIN customers c ON c.id = t.customer_id;',
    solutionSql:
      'WITH t AS (SELECT customer_id, sum(amount) AS total FROM orders GROUP BY customer_id HAVING sum(amount) >= 200) SELECT c.name, t.total::int AS total FROM t JOIN customers c ON c.id = t.customer_id;',
    orderMatters: false,
    hints: ['先用 CTE 算每个客户总额并 HAVING 过滤，再 JOIN 回 customers 取名字。'],
  },
];
```

- [ ] **Step 2: 注册 module6 + 加 ModuleDef/概念课**

`content/exercises/index.ts`：加 import 与并入（在 module5 之后）：

```ts
import { module6Exercises } from './module6';
```

并把 `allExercises` 末尾加 `...module6Exercises,`：

```ts
export const allExercises: Exercise[] = [
  ...module1Exercises,
  ...module2Exercises,
  ...module3Exercises,
  ...module4Exercises,
  ...module5Exercises,
  ...module6Exercises,
];
```

`content/modules/index.ts`：在 m5 对象之后、`];` 之前，加 m6 的 `ModuleDef`：

```ts
  {
    id: 'm6',
    order: 6,
    title: '性能与优化',
    tierKey: 'senior',
    tierLabel: 'Senior',
    summary: '让查询跑得快：EXPLAIN、索引、反模式、查询重写。',
    lesson: [
      '## 性能与优化：让查询跑得快',
      '',
      'senior 的分水岭——不只写对，还要写得快。',
      '',
      '### EXPLAIN：看数据库怎么执行',
      '',
      '在查询前加 `EXPLAIN` 看"执行计划"，`EXPLAIN ANALYZE` 还会真跑并报耗时：',
      '',
      '```sql',
      'EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 1;',
      '```',
      '',
      '- **Seq Scan**（全表扫描）vs **Index Scan**（走索引）：数据量大时差距巨大。',
      '- 在右边练习场里，对任意查询加 `EXPLAIN` 都能看到真实计划，动手试试。',
      '',
      '### 索引何时有用',
      '',
      '高频用于过滤/`JOIN` 的列适合建索引。但写法不对，索引就用不上（见下）。',
      '',
      '### 常见反模式',
      '',
      '- `SELECT *`：白读不需要的列。只取所需列。',
      '- **函数包裹被过滤列**（如 `EXTRACT(month FROM ts)=2`）：索引失效。改成范围 `ts >= ... AND ts < ...`（sargable）。',
      '- `IN` + 大子集 / `NOT IN` + `NULL`：优先用 `EXISTS` / `NOT EXISTS`。',
      '- 先聚合再过滤无关行：能用 `WHERE` 提前过滤就别拖到 `HAVING`。',
      '',
      '### 查询重写',
      '',
      '多层嵌套子查询 → `CTE (WITH)` 或 `JOIN`，更可读、也常更快。',
      '',
      '> 本模块的题：在结果不变的前提下，把查询改写得更优。',
    ].join('\n'),
  },
```

- [ ] **Step 3: 跑 soundness + integrity**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run content/`
Expected: 全绿（含模块 5、6 全部新题）。失败处理同 Task 4 Step 3（仅微调 checkSql，不改判题器）。

- [ ] **Step 4: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add content/exercises/module6.ts content/exercises/index.ts content/modules/index.ts
git commit -m "feat: 模块6 性能与优化(8题改写/索引+概念课)"
```

---

## Task 6: 全量验证 + 部署 + 收尾

**Files:**（无新增）

- [ ] **Step 1: 全量测试 + 类型检查 + 构建**

Run:
```bash
cd /home/ubuntu/sql-dojo
npx vitest run
npx tsc --noEmit
npm run build
```
Expected: vitest 全绿（原有 112 + runCheck 3 + checkSql 判题 3 + 模块5/6 的 16 道 soundness + integrity）；tsc 干净；build 成功，`/learn/m5`、`/learn/m6`、`/exercise/m5-01` 等路由出现。

- [ ] **Step 2: 部署**

Run: `cd /home/ubuntu/sql-dojo && npm run deploy`
Expected: 部署成功，线上 URL `https://sql-dojo.pp-account.workers.dev`。

- [ ] **Step 3: 真浏览器抽查（线上）**

用 browser-harness（`new_tab`、`domcontentloaded`、PGlite 页 `wait_for_selector`）：
1. `/learn` 出现模块 5（🟠 进阶）、模块 6（🔴 Senior）两段位卡。
2. 进 `/exercise/m5-01`：把标准答案（建 book 表 + 插数）贴进编辑器→"运行"→显示校验查询结果（两行 book）+ 判通过 ✅。
3. 故意改错（如表名写成 books）→"运行"→判失败 ❌。
4. 进 `/exercise/m6-01`：写 JOIN 改写 → 判通过 ✅。
5. 进度计数随通关增加（如已登录则云端同步）。

Expected: 1–5 全过。失败用 systematic-debugging 定位。

- [ ] **Step 4: 收尾**

- 更新记忆 `project_sql_dojo.md`：模块 5–6 上线（建模/DDL + 性能/优化）、checkSql 判题扩展（先建后验，pg_constraint/pg_indexes 验证 DDL）、TierKey 加 advanced；模块 7–8 留下一 spec。
- `git push origin main`（先合并分支，见执行收尾）。
- 向用户汇报：模块 5–6 上线、线上 URL、抽查结果；模块 7–8（实战/面试）为下一 spec。

---

## Self-Review（写完计划的回查）

**Spec 覆盖：**
- §3 checkSql 判题扩展（types/runner/judge）→ Task 1/2/3 ✓
- §4 受影响文件（types/ModuleCard/runner/judge/index/modules）→ Task 1–5 覆盖 ✓
- §5 模块 5（8 题 DDL + 概念课，空种子 + checkSql，约束用目录验证、Boss schema）→ Task 4 ✓
- §6 模块 6（8 题，改写等价 + 索引 checkSql，EXPLAIN 在概念课）→ Task 5 ✓
- §7 TierKey 加 advanced + ModuleCard 段位色 → Task 1 ✓
- §8 测试（runCheck/checkSql 单测 + soundness/integrity 覆盖新题）→ Task 2/3/4/5 ✓
- §9 验收（路线图两段位卡、DDL 判对错、build 干净）→ Task 6 ✓
- §2 非目标（EXPLAIN 实验室/事务出题/模块7-8）→ 计划未触碰，正确 ✓

**占位扫描：** 无 TODO/TBD；每道题给了完整 prompt/solutionSql/checkSql/hints。catalog-checkSql 计数有"soundness 失败则微调 checkSql"的明确指引（确定性 oracle，非占位）。

**类型一致性：** `checkSql?: string`（Task 1 定义，Task 4/5 使用一致）；`runCheck(setupSql, checkSql)`（Task 2 定义，Task 3 使用一致）；`TierKey` 加 `'advanced'`（Task 1）→ ModuleCard `TIER_BADGE` 同步加键（Task 1）→ m5 `tierKey:'advanced'`（Task 4）一致；模块注册 `module5Exercises`/`module6Exercises` 命名与 import 一致。
