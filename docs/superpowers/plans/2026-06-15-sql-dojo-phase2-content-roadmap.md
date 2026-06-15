# SQL 道场 Phase 2 · Plan 2：课程内容与路线图 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把练习场扩成一套可浏览的课程：模块 1–4 的完整题库 + 每模块概念课（Markdown）+ 段位路线图页（`/learn`、`/learn/[moduleId]`）+ 练习页上下题导航。

**Architecture:** 内容仍是仓库内结构化数据——模块元信息+概念课在 `content/modules/`，习题在 `content/exercises/`，靠 `moduleId` 关联。每道题用"标准答案能通过自己的判题"做完整性测试兜底（保证 seed/solution 自洽）。概念课用 `react-markdown` 渲染 Markdown 字符串（不引 MDX 构建链，避免又踩 Turbopack 的坑）。页面是薄的服务端组件，可测的单元（卡片、列表项、Markdown 渲染、导航计算）抽出来单测，整页用 Playwright E2E。

**Tech Stack:** 续用 Plan 1 栈，新增 `react-markdown` + `remark-gfm` + `@tailwindcss/typography`（概念课排版）。

**约定：** 纯色无渐变；提交信息不要 Co-Authored-By 行；当前在 `main` 分支，执行前另开特性分支。

---

## 文件结构（本计划将创建/修改）

```
lib/sql/types.ts               + ModuleDef / TierKey 类型（修改）
content/modules/index.ts       模块元信息+概念课注册表：allModules / getModuleById
content/exercises/module1.ts   模块1习题：4 → 8 题（修改）
content/exercises/module2.ts   模块2习题：JOIN/GROUP BY/HAVING/NULL（新建）
content/exercises/module3.ts   模块3习题：子查询/CTE/UNION/CASE（新建）
content/exercises/module4.ts   模块4习题：窗口函数/日期/字符串（新建）
content/exercises/index.ts     allExercises / getExerciseById / exercisesByModule / exerciseNav（修改）
content/integrity.test.ts      完整性：题→模块有效、模块有序唯一、每模块有题
content/soundness.test.ts      自洽性：每题 solutionSql 能通过自己的判题
components/LessonView.tsx       react-markdown 概念课渲染（新建）
components/ModuleCard.tsx       路线图模块卡（新建）
components/ExerciseList.tsx     模块内习题列表（新建）
components/ExerciseNavBar.tsx   练习页上下题导航（新建）
app/learn/page.tsx             路线图页（新建）
app/learn/[moduleId]/page.tsx  模块概览页（新建）
app/exercise/[id]/page.tsx     练习页加导航+面包屑（修改）
app/page.tsx                   落地页 CTA → /learn（修改）
app/globals.css                启用 typography 插件（修改）
```

---

## Task 1：模块类型 + 模块注册表 + 完整性测试

**Files:**
- Modify: `lib/sql/types.ts`
- Create: `content/modules/index.ts`
- Modify: `content/exercises/index.ts`
- Test: `content/integrity.test.ts`

- [ ] **Step 1: 加模块类型**

在 `lib/sql/types.ts` 末尾追加：
```ts
export type TierKey = 'beginner' | 'intermediate' | 'senior' | 'sprint';

export interface ModuleDef {
  id: string; // 'm1'
  order: number; // 1..4（本阶段）
  title: string; // '入门'
  tierKey: TierKey;
  tierLabel: string; // '小白' / '中级' / 'Senior'
  summary: string; // 一句话简介
  lesson: string; // 概念课 Markdown
}
```

- [ ] **Step 2: 写模块注册表（含 4 模块概念课）**

Create `content/modules/index.ts`。下面给出 m1 的**完整**写法做模板，m2–m4 按同样字段补全（概念课覆盖该模块关键点；m2=JOIN/GROUP BY/HAVING/NULL，m3=子查询/CTE/UNION/CASE，m4=窗口函数/日期/字符串）：
```ts
import type { ModuleDef } from '@/lib/sql/types';

export const allModules: ModuleDef[] = [
  {
    id: 'm1',
    order: 1,
    title: '入门',
    tierKey: 'beginner',
    tierLabel: '小白',
    summary: '把数据"取出来"：SELECT / WHERE / ORDER BY / DISTINCT。',
    lesson: [
      '## 入门：把数据取出来',
      '',
      'SQL 最常做的事就是"查"。一条查询的骨架是：',
      '',
      '```sql',
      'SELECT 列 FROM 表 WHERE 条件 ORDER BY 列;',
      '```',
      '',
      '- `SELECT *` 取所有列；`SELECT a, b` 只取指定列。',
      '- `WHERE` 过滤行，比如 `WHERE age >= 28`。',
      '- `ORDER BY 列 DESC` 倒序排列。',
      '- `DISTINCT` 去掉重复行。',
      '',
      '> 右边练习场里写完点"运行"，会用真实 Postgres 跑你的 SQL 并对答案。',
    ].join('\n'),
  },
  // m2 / m3 / m4 按同样结构补全（order 2/3/4，tierKey intermediate/intermediate/intermediate，
  // tierLabel 初级/中级/中级，lesson 为该模块概念课 Markdown）。
];

export function getModuleById(id: string): ModuleDef | undefined {
  return allModules.find((m) => m.id === id);
}
```
> 提示：m2–m4 概念课各写 8–20 行 Markdown，讲清该模块核心语法即可，别贪多。

- [ ] **Step 3: 给习题注册表加 exercisesByModule**

在 `content/exercises/index.ts` 末尾追加（保留现有 `allExercises`/`getExerciseById`）：
```ts
export function exercisesByModule(moduleId: string): Exercise[] {
  return allExercises.filter((e) => e.moduleId === moduleId);
}
```

- [ ] **Step 4: 写完整性测试**

Create `content/integrity.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { allModules, getModuleById } from '@/content/modules';
import { allExercises, exercisesByModule } from '@/content/exercises';

describe('content integrity', () => {
  it('每道题的 moduleId 都对应一个已知模块', () => {
    const ids = new Set(allModules.map((m) => m.id));
    for (const ex of allExercises) {
      expect(ids.has(ex.moduleId), `${ex.id} -> ${ex.moduleId}`).toBe(true);
    }
  });

  it('模块 order 唯一且升序排列', () => {
    const orders = allModules.map((m) => m.order);
    expect(new Set(orders).size).toBe(orders.length);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it('模块 id 唯一', () => {
    const ids = allModules.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getModuleById 能查到、查不到返回 undefined', () => {
    expect(getModuleById('m1')?.title).toBe('入门');
    expect(getModuleById('nope')).toBeUndefined();
  });

  it('exercisesByModule 过滤正确', () => {
    expect(exercisesByModule('m1').every((e) => e.moduleId === 'm1')).toBe(true);
  });
});
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `npx vitest run content/integrity.test.ts`
Expected: PASS（5 passed）。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 模块类型与注册表 + 内容完整性测试"
```

---

## Task 2：自洽性测试 + 扩充模块1到 8 题

**Files:**
- Create: `content/soundness.test.ts`
- Modify: `content/exercises/module1.ts`

- [ ] **Step 1: 写自洽性测试（内容护栏）**

每道题的标准答案必须能通过自己的判题——这能在你加题时立刻抓出写错的 seed/solution。

Create `content/soundness.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { allExercises } from '@/content/exercises';
import { judgeExercise } from '@/lib/sql/judgeExercise';

describe('每道题的标准答案都能通过自己的判题', () => {
  for (const ex of allExercises) {
    it(`${ex.id} ${ex.title}`, async () => {
      const r = await judgeExercise(ex, ex.solutionSql);
      expect(r.verdict.passed, r.verdict.reason).toBe(true);
    });
  }
});
```

- [ ] **Step 2: 运行测试，确认现有 4 题通过**

Run: `npx vitest run content/soundness.test.ts`
Expected: PASS（现有 4 题）。

- [ ] **Step 3: 扩充模块1到 8 题**

在 `content/exercises/module1.ts` 的 `module1Exercises` 数组追加 4 题（id `m1-05`..`m1-08`，沿用同一个 `SEED` 常量），覆盖：`WHERE` + 多条件(`AND`/`OR`)、`IN`、`ORDER BY` 多列、`LIMIT`。每题字段完整（id/moduleId/title/difficulty/prompt/seedSql=SEED/starterSql/solutionSql/orderMatters/hints）。范例 1 题：
```ts
  {
    id: 'm1-05',
    moduleId: 'm1',
    title: '取最年长的两位',
    difficulty: 2,
    prompt: '按 age 从大到小，取出前 2 位用户的 name 和 age。',
    seedSql: SEED,
    starterSql: 'SELECT name, age FROM users ORDER BY ... LIMIT ...;',
    solutionSql: 'SELECT name, age FROM users ORDER BY age DESC LIMIT 2;',
    orderMatters: true,
    hints: ['LIMIT N 只取前 N 行。'],
  },
```

- [ ] **Step 4: 运行自洽性 + 完整性测试，确认全过**

Run: `npx vitest run content/`
Expected: PASS（含新 4 题，soundness 共 8 题）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 模块1 扩到 8 题 + 标准答案自洽性测试"
```

---

## Task 3：模块2 习题（JOIN / GROUP BY / HAVING / NULL）

**Files:**
- Create: `content/exercises/module2.ts`
- Modify: `content/exercises/index.ts`

模块 2–4 共用一份电商小数据集（含一个没有订单的客户"阿强"，专门给 LEFT JOIN / NULL 用）。

- [ ] **Step 1: 写模块2 习题（≥10 题）**

Create `content/exercises/module2.ts`，先定义共享 SEED，再写习题数组。SEED：
```ts
import type { Exercise } from '@/lib/sql/types';

export const SHOP_SEED = `
CREATE TABLE customers (id integer PRIMARY KEY, name text, city text);
CREATE TABLE orders (id integer PRIMARY KEY, customer_id integer, amount integer, created_at date);
INSERT INTO customers VALUES
  (1,'小明','北京'),(2,'小红','上海'),(3,'小刚','北京'),(4,'小美','广州'),(5,'阿强','深圳');
INSERT INTO orders VALUES
  (1,1,100,'2026-01-05'),(2,1,200,'2026-02-10'),(3,2,150,'2026-01-20'),
  (4,2,300,'2026-03-01'),(5,3,50,'2026-02-15'),(6,1,80,'2026-03-12'),(7,4,0,'2026-01-30');
`;
```
两道完整范例（其余按模式补到 ≥10 题，覆盖 INNER/LEFT JOIN、`GROUP BY`、`COUNT/SUM/AVG`、`HAVING`、`IS NULL`、聚合里 NULL 不计数等）：
```ts
export const module2Exercises: Exercise[] = [
  {
    id: 'm2-01',
    moduleId: 'm2',
    title: '每位客户的订单数',
    difficulty: 2,
    prompt: '统计每位客户的订单数量，输出 name 和订单数 cnt（包含没有下单的客户，cnt 记 0）。',
    seedSql: SHOP_SEED,
    starterSql: 'SELECT c.name, count(o.id) AS cnt\nFROM customers c\nLEFT JOIN orders o ON ...\nGROUP BY ...;',
    solutionSql:
      'SELECT c.name, count(o.id)::int AS cnt FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.name;',
    orderMatters: false,
    hints: ['没有订单也要出现 → LEFT JOIN；count(o.id) 不会把 NULL 算进去。'],
  },
  {
    id: 'm2-02',
    moduleId: 'm2',
    title: '消费满 300 的客户',
    difficulty: 3,
    prompt: '找出订单总金额 >= 300 的客户 name 和总额 total。',
    seedSql: SHOP_SEED,
    starterSql: 'SELECT c.name, sum(o.amount) AS total\nFROM customers c\nJOIN orders o ON ...\nGROUP BY ...\nHAVING ...;',
    solutionSql:
      'SELECT c.name, sum(o.amount)::int AS total FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.name HAVING sum(o.amount) >= 300;',
    orderMatters: false,
    hints: ['过滤聚合结果用 HAVING，不是 WHERE。'],
  },
  // ... 继续补到 ≥10 题
];
```
> 注意：`count(...)::int` 显式转 int，避免 Postgres 返回 bigint 字符串导致比对困惑（判题按值比对，转 int 更直观）。

- [ ] **Step 2: 注册模块2 习题**

在 `content/exercises/index.ts` 顶部加导入、并入 `allExercises`：
```ts
import { module2Exercises } from './module2';
```
把 `allExercises` 改为：
```ts
export const allExercises: Exercise[] = [...module1Exercises, ...module2Exercises];
```

- [ ] **Step 3: 运行内容测试，确认全过**

Run: `npx vitest run content/`
Expected: PASS（soundness 现含 m2 各题；若某题失败，按 reason 修 seed/solution）。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: 模块2 习题（JOIN/聚合/HAVING/NULL）"
```

---

## Task 4：模块3 习题（子查询 / CTE / UNION / CASE）

**Files:**
- Create: `content/exercises/module3.ts`
- Modify: `content/exercises/index.ts`

- [ ] **Step 1: 写模块3 习题（≥8 题）**

Create `content/exercises/module3.ts`，复用电商数据集（从 module2 导入 SEED，避免重复）：
```ts
import type { Exercise } from '@/lib/sql/types';
import { SHOP_SEED } from './module2';
```
一道完整范例（其余补到 ≥8 题，覆盖标量子查询、`IN (子查询)`、`WITH` CTE、`UNION`/`UNION ALL`、`CASE WHEN`）：
```ts
export const module3Exercises: Exercise[] = [
  {
    id: 'm3-01',
    moduleId: 'm3',
    title: '高于平均额的订单',
    difficulty: 3,
    prompt: '找出金额高于"所有订单平均金额"的订单 id 和 amount。',
    seedSql: SHOP_SEED,
    starterSql: 'SELECT id, amount FROM orders WHERE amount > (SELECT ... FROM orders);',
    solutionSql: 'SELECT id, amount FROM orders WHERE amount > (SELECT avg(amount) FROM orders);',
    orderMatters: false,
    hints: ['括号里的子查询先算出平均值，再用来过滤。'],
  },
  // ... 继续补到 ≥8 题
];
```

- [ ] **Step 2: 注册模块3 习题**

`content/exercises/index.ts` 加 `import { module3Exercises } from './module3';` 并并入 `allExercises`。

- [ ] **Step 3: 运行内容测试**

Run: `npx vitest run content/`
Expected: PASS。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: 模块3 习题（子查询/CTE/UNION/CASE）"
```

---

## Task 5：模块4 习题（窗口函数 / 日期 / 字符串）+ 每模块有题校验

**Files:**
- Create: `content/exercises/module4.ts`
- Modify: `content/exercises/index.ts`, `content/integrity.test.ts`

- [ ] **Step 1: 写模块4 习题（≥8 题）**

Create `content/exercises/module4.ts`（复用 `SHOP_SEED`）。一道完整范例（其余补到 ≥8 题，覆盖 `ROW_NUMBER/RANK OVER(PARTITION BY)`、`LAG/LEAD`、累计和 `sum() OVER(ORDER BY)`、`EXTRACT`/日期、字符串函数）：
```ts
import type { Exercise } from '@/lib/sql/types';
import { SHOP_SEED } from './module2';

export const module4Exercises: Exercise[] = [
  {
    id: 'm4-01',
    moduleId: 'm4',
    title: '每位客户的订单按金额排名',
    difficulty: 4,
    prompt: '为每位客户的订单，按 amount 从大到小标出名次 rn，输出 customer_id、amount、rn。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT customer_id, amount,\n  row_number() OVER (PARTITION BY ... ORDER BY ...) AS rn\nFROM orders;',
    solutionSql:
      'SELECT customer_id, amount, row_number() OVER (PARTITION BY customer_id ORDER BY amount DESC)::int AS rn FROM orders;',
    orderMatters: false,
    hints: ['窗口函数 OVER(PARTITION BY 客户 ORDER BY 金额 DESC)。'],
  },
  // ... 继续补到 ≥8 题
];
```

- [ ] **Step 2: 注册模块4 习题**

`content/exercises/index.ts` 加 `import { module4Exercises } from './module4';` 并并入 `allExercises`。

- [ ] **Step 3: 给完整性测试加"每个模块至少 1 题"**

在 `content/integrity.test.ts` 的 describe 内追加：
```ts
  it('每个模块至少有一道题', () => {
    for (const m of allModules) {
      expect(exercisesByModule(m.id).length, m.id).toBeGreaterThan(0);
    }
  });
```

- [ ] **Step 4: 运行全部内容测试**

Run: `npx vitest run content/`
Expected: PASS（4 模块全部有题，soundness 覆盖全部约 34 题）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 模块4 习题（窗口函数/日期/字符串）+ 每模块有题校验"
```

---

## Task 6：概念课渲染组件 LessonView

**Files:**
- Modify: `package.json`(deps)、`app/globals.css`
- Create: `components/LessonView.tsx`
- Test: `components/LessonView.test.tsx`

- [ ] **Step 1: 装 Markdown 渲染依赖**

Run:
```bash
cd /home/ubuntu/sql-dojo
npm i react-markdown remark-gfm
npm i -D @tailwindcss/typography
```

- [ ] **Step 2: 启用 typography 插件**

在 `app/globals.css` 顶部 `@import "tailwindcss";` 之后加一行：
```css
@plugin "@tailwindcss/typography";
```

- [ ] **Step 3: 写失败测试**

Create `components/LessonView.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LessonView } from '@/components/LessonView';

describe('LessonView', () => {
  it('把 Markdown 渲染成 HTML', () => {
    render(<LessonView markdown={'## 标题\n\n一段**加粗**文字。'} />);
    expect(screen.getByRole('heading', { name: '标题' })).toBeInTheDocument();
    expect(screen.getByText('加粗')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: 运行测试，确认失败**

Run: `npx vitest run components/LessonView.test.tsx`
Expected: FAIL —— 找不到 `@/components/LessonView`。

- [ ] **Step 5: 写实现**

Create `components/LessonView.tsx`:
```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function LessonView({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-invert max-w-none prose-pre:bg-slate-900 prose-code:text-sky-300">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 6: 运行测试，确认通过**

Run: `npx vitest run components/LessonView.test.tsx`
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: 概念课 Markdown 渲染组件 LessonView"
```

---

## Task 7：路线图页 /learn + 模块卡 ModuleCard

**Files:**
- Create: `components/ModuleCard.tsx`, `app/learn/page.tsx`
- Test: `components/ModuleCard.test.tsx`

- [ ] **Step 1: 写失败测试**

Create `components/ModuleCard.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModuleCard } from '@/components/ModuleCard';
import type { ModuleDef } from '@/lib/sql/types';

const M: ModuleDef = {
  id: 'm1', order: 1, title: '入门', tierKey: 'beginner', tierLabel: '小白',
  summary: '取数据', lesson: '# x',
};

describe('ModuleCard', () => {
  it('显示序号、标题、段位、题数，并链到模块页', () => {
    render(<ModuleCard module={M} exerciseCount={8} />);
    expect(screen.getByText('入门')).toBeInTheDocument();
    expect(screen.getByText('小白')).toBeInTheDocument();
    expect(screen.getByText(/8\s*题/)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/learn/m1');
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run components/ModuleCard.test.tsx`
Expected: FAIL —— 找不到 `@/components/ModuleCard`。

- [ ] **Step 3: 写实现（tierKey → 静态类映射，避免 Tailwind 动态类名失效）**

Create `components/ModuleCard.tsx`:
```tsx
import Link from 'next/link';
import type { ModuleDef, TierKey } from '@/lib/sql/types';

const TIER_BADGE: Record<TierKey, string> = {
  beginner: 'bg-emerald-600 text-white',
  intermediate: 'bg-amber-600 text-white',
  senior: 'bg-rose-600 text-white',
  sprint: 'bg-sky-600 text-white',
};

export function ModuleCard({ module, exerciseCount }: { module: ModuleDef; exerciseCount: number }) {
  return (
    <Link
      href={`/learn/${module.id}`}
      className="block rounded-lg border border-slate-800 bg-slate-900 p-5 hover:border-slate-600"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">模块 {module.order}</span>
        <span className={`rounded px-2 py-0.5 text-xs ${TIER_BADGE[module.tierKey]}`}>
          {module.tierLabel}
        </span>
      </div>
      <h3 className="mt-2 text-lg font-bold text-slate-100">{module.title}</h3>
      <p className="mt-1 text-sm text-slate-400">{module.summary}</p>
      <p className="mt-3 text-xs text-slate-500">{exerciseCount} 题</p>
    </Link>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run components/ModuleCard.test.tsx`
Expected: PASS。

- [ ] **Step 5: 写路线图页**

Create `app/learn/page.tsx`:
```tsx
import { allModules } from '@/content/modules';
import { exercisesByModule } from '@/content/exercises';
import { ModuleCard } from '@/components/ModuleCard';

export default function LearnPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-100">学习路线图</h1>
      <p className="mt-2 text-slate-400">从小白到 senior，循序闯关。</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {allModules.map((m) => (
          <ModuleCard key={m.id} module={m} exerciseCount={exercisesByModule(m.id).length} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 路线图页 /learn + 模块卡"
```

---

## Task 8：模块概览页 /learn/[moduleId] + 习题列表 ExerciseList

**Files:**
- Create: `components/ExerciseList.tsx`, `app/learn/[moduleId]/page.tsx`
- Test: `components/ExerciseList.test.tsx`

- [ ] **Step 1: 写失败测试**

Create `components/ExerciseList.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExerciseList } from '@/components/ExerciseList';
import type { Exercise } from '@/lib/sql/types';

const mk = (id: string, title: string): Exercise => ({
  id, moduleId: 'm1', title, difficulty: 1, prompt: '', seedSql: '', solutionSql: '', orderMatters: false,
});

describe('ExerciseList', () => {
  it('每题一个链接，指向练习页', () => {
    render(<ExerciseList exercises={[mk('m1-01', '选出全部用户'), mk('m1-02', '筛选')]} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/exercise/m1-01');
    expect(screen.getByText('选出全部用户')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run components/ExerciseList.test.tsx`
Expected: FAIL —— 找不到 `@/components/ExerciseList`。

- [ ] **Step 3: 写实现**

Create `components/ExerciseList.tsx`:
```tsx
import Link from 'next/link';
import type { Exercise } from '@/lib/sql/types';

export function ExerciseList({ exercises }: { exercises: Exercise[] }) {
  return (
    <ol className="space-y-2">
      {exercises.map((ex, i) => (
        <li key={ex.id}>
          <Link
            href={`/exercise/${ex.id}`}
            className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-4 py-3 hover:border-slate-600"
          >
            <span className="text-slate-200">
              <span className="mr-2 text-slate-500">{i + 1}.</span>
              {ex.title}
            </span>
            <span className="text-xs text-slate-500">难度 {ex.difficulty}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run components/ExerciseList.test.tsx`
Expected: PASS。

- [ ] **Step 5: 写模块概览页（含 404）**

Create `app/learn/[moduleId]/page.tsx`:
```tsx
import { getModuleById } from '@/content/modules';
import { exercisesByModule } from '@/content/exercises';
import { LessonView } from '@/components/LessonView';
import { ExerciseList } from '@/components/ExerciseList';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const mod = getModuleById(moduleId);
  if (!mod) notFound();
  const exercises = exercisesByModule(mod.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 space-y-8">
      <Link href="/learn" className="text-sm text-sky-400">← 返回路线图</Link>
      <header>
        <p className="text-xs text-slate-500">模块 {mod.order} · {mod.tierLabel}</p>
        <h1 className="text-2xl font-bold text-slate-100">{mod.title}</h1>
      </header>
      <LessonView markdown={mod.lesson} />
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-200">练习（{exercises.length}）</h2>
        <ExerciseList exercises={exercises} />
      </section>
    </main>
  );
}
```

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 模块概览页 /learn/[moduleId] + 习题列表"
```

---

## Task 9：练习页上下题导航

**Files:**
- Modify: `content/exercises/index.ts`
- Create: `components/ExerciseNavBar.tsx`
- Modify: `app/exercise/[id]/page.tsx`
- Test: `content/exerciseNav.test.ts`

- [ ] **Step 1: 写导航计算的失败测试**

Create `content/exerciseNav.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { exerciseNav } from '@/content/exercises';

describe('exerciseNav', () => {
  it('首题没有上一题，有下一题', () => {
    const n = exerciseNav('m1-01');
    expect(n?.moduleId).toBe('m1');
    expect(n?.index).toBe(0);
    expect(n?.prevId).toBeUndefined();
    expect(n?.nextId).toBe('m1-02');
  });
  it('末题没有下一题', () => {
    const n = exerciseNav('m1-01');
    const last = exerciseNav(`m1-0${n!.total}`);
    expect(last?.nextId).toBeUndefined();
  });
  it('未知题返回 undefined', () => {
    expect(exerciseNav('nope')).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run content/exerciseNav.test.ts`
Expected: FAIL —— `exerciseNav` 未导出。

- [ ] **Step 3: 实现 exerciseNav**

在 `content/exercises/index.ts` 末尾追加：
```ts
export interface ExerciseNav {
  moduleId: string;
  index: number; // 模块内 0-based
  total: number;
  prevId?: string;
  nextId?: string;
}

export function exerciseNav(exerciseId: string): ExerciseNav | undefined {
  const ex = getExerciseById(exerciseId);
  if (!ex) return undefined;
  const list = exercisesByModule(ex.moduleId);
  const index = list.findIndex((e) => e.id === exerciseId);
  return {
    moduleId: ex.moduleId,
    index,
    total: list.length,
    prevId: index > 0 ? list[index - 1].id : undefined,
    nextId: index < list.length - 1 ? list[index + 1].id : undefined,
  };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run content/exerciseNav.test.ts`
Expected: PASS。

- [ ] **Step 5: 写导航条组件**

Create `components/ExerciseNavBar.tsx`:
```tsx
import Link from 'next/link';
import type { ExerciseNav } from '@/content/exercises';

export function ExerciseNavBar({ nav }: { nav: ExerciseNav }) {
  return (
    <nav className="flex items-center justify-between pt-2 text-sm">
      {nav.prevId ? (
        <Link href={`/exercise/${nav.prevId}`} className="text-sky-400">← 上一题</Link>
      ) : (
        <span className="text-slate-600">← 上一题</span>
      )}
      <Link href={`/learn/${nav.moduleId}`} className="text-slate-400">
        第 {nav.index + 1} / {nav.total} 题 · 回模块
      </Link>
      {nav.nextId ? (
        <Link href={`/exercise/${nav.nextId}`} className="text-sky-400">下一题 →</Link>
      ) : (
        <span className="text-slate-600">下一题 →</span>
      )}
    </nav>
  );
}
```

- [ ] **Step 6: 把导航接入练习页**

修改 `app/exercise/[id]/page.tsx`：加导入并在页面底部渲染导航条。在文件顶部 import 区加：
```tsx
import { getExerciseById, exerciseNav } from '@/content/exercises';
import { ExerciseNavBar } from '@/components/ExerciseNavBar';
```
（注意：原来从 `@/content/exercises` 只 import 了 `getExerciseById`，改成同时 import `exerciseNav`。）
在 `return` 的 `<main>` 内、`<Playground .../>` 之后加：
```tsx
      {(() => {
        const nav = exerciseNav(exercise.id);
        return nav ? <ExerciseNavBar nav={nav} /> : null;
      })()}
```

- [ ] **Step 7: 运行测试 + 构建**

Run: `npm test && npm run build`
Expected: 测试全过；`next build` 成功。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "feat: 练习页上下题导航"
```

---

## Task 10：落地页接入路线图 + E2E + 部署

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 落地页加"看路线图"入口**

修改 `app/page.tsx`，在"立即开练"按钮下方加一个次级链接到 `/learn`：
```tsx
      <div className="flex items-center justify-center gap-4">
        <Link href="/exercise/m1-01" className="inline-block rounded-md bg-sky-600 px-6 py-3 text-white">
          立即开练 ▶
        </Link>
        <Link href="/learn" className="inline-block rounded-md border border-slate-700 px-6 py-3 text-slate-200">
          看学习路线图
        </Link>
      </div>
```
（替换原来单个按钮的那段；保留 `import Link from 'next/link';`。）

- [ ] **Step 2: 本地起 dev 跑浏览器 E2E**

写 `/tmp/e2e_phase2.py`（Playwright）：访问 `/learn` → 断言 4 张模块卡 → 点第 2 张进 `/learn/m2` → 断言概念课标题与习题列表 → 点第一题进练习页 → 输入其 solutionSql → 运行 → 断言出现"✅ 通过" → 点"下一题"断言 URL 变化。Run：
```bash
npm run dev -- -p 3939 &
python3 /tmp/e2e_phase2.py
```
Expected: 全部 PASS（截图存 /tmp 供查看）。完事 `lsof -ti:3939 | xargs -r kill`。

- [ ] **Step 3: 全量测试 + 构建**

Run: `npm test && npm run build`
Expected: 全过、构建成功。

- [ ] **Step 4: 部署到 Cloudflare**

Run: `npm run deploy`
Expected: 输出 `https://sql-dojo.pp-account.workers.dev`。

- [ ] **Step 5: 线上验证**

curl `/learn`（200，含模块标题）、`/learn/m2`（200，含概念课）、`/learn/zzz`（404）；再跑一遍 E2E 指向生产 URL 确认 `/learn` 流程与练习判题在线上可用。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 落地页接入路线图 + Phase 2 上线"
```

---

## 自检（Spec 覆盖 / 占位符 / 类型一致性）

**Spec 覆盖（对照 §7 路线图、§10 路由、§13.5 题库、§13.6 路线图 UI）：**
- §7 模块 1–4（含 senior 向窗口函数）→ Task 1（meta+lesson）+ Task 2–5（习题）✅
- §13.5 模块 1–4 题库（约 34 题）→ Task 2(m1=8)+3(m2≥10)+4(m3≥8)+5(m4≥8) ✅
- §6.2 概念课（MDX→改用 react-markdown，已在架构说明偏差原因）→ Task 1(lesson 内容)+Task 6(渲染) ✅
- §10 `/learn`、`/learn/[moduleId]` → Task 7、Task 8 ✅；`/exercise/[id]` 导航 → Task 9 ✅
- §13.6 段位树+进度标记 → Task 7 段位卡 ✅；**进度标记属 Phase 3（登录后才有进度），本计划只做段位与题数，非缺口**。
- 登录/AI/进度持久化 → 不属本计划（Plan 3/4）。

**占位符扫描：** 工程任务（类型/注册表/组件/页面/导航/测试）均给完整代码与命令。内容任务（Task 2–5 习题、Task 1 概念课）给了格式 + 共享 SEED + 完整范例 + 目标数量，并由 `soundness.test.ts`（每题标准答案必须自洽通过）+ `integrity.test.ts`（每模块有题）兜底——这是内容类工作的正确"无占位"方式：测试即验收。✅

**类型一致性：** `ModuleDef/TierKey`（Task 1）贯穿 ModuleCard（T7）、ModulePage（T8）；`Exercise` 续用 Plan 1 定义；`exercisesByModule`（T1）被 T5/T7/T8/T9 使用；`exerciseNav`/`ExerciseNav`（T9）被练习页与 NavBar 使用；`SHOP_SEED`（T3 定义）被 T4/T5 复用。名称一致。✅

**交付物（Plan 2 完成时）：** 一套可浏览的课程——`/learn` 段位路线图 → 模块概览（概念课+习题列表）→ 练习页（判题+上下题导航），模块 1–4 约 34 题全部"标准答案自洽通过"，已部署上线。下一步 Plan 3（登录+进度）。
```
