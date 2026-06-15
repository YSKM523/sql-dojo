# SQL 道场 Phase 3 · Plan 3：游客进度 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 不登录也能记录进度——解对一题就在本地（localStorage）标记"已通关"，并在路线图、模块习题列表、新的 `/me` 足迹页里显示进度；可一键清空。

**Architecture:** 纯客户端进度，localStorage 存"已通关题目 id 列表"。底层是一个带发布订阅的小 store（`lib/progress/store.ts`，SSR 安全、可单测），React 端用 `useSyncExternalStore` 订阅。展示组件保持纯函数（接收 `completedIds` 作为 prop，便于测试），由轻量"客户端孤岛"包一层读 store；服务端页面（/learn、/learn/[moduleId]）保持服务端渲染，只在进度处嵌入 client 组件。练习场判题通过时调用 `markCompleted`。

**Tech Stack:** 续用现有栈，无新增依赖、无后端、无 D1。

**约定：** 纯色无渐变；提交不要 Co-Authored-By；当前在 `phase3-guest-progress` 分支。

---

## 文件结构（本计划将创建/修改）

```
lib/progress/store.ts            localStorage 进度 store（pub/sub，SSR 安全）
lib/progress/useProgress.ts      useCompletedIds() hook（useSyncExternalStore）
components/Playground.tsx         判题通过时 markCompleted（修改）
components/ModuleProgressBadge.tsx  模块通关进度徽标（client）
components/ModuleCard.tsx          用 exerciseIds + 进度徽标（修改）
app/learn/page.tsx                传 exerciseIds 给卡片（修改）
components/ExerciseList.tsx        习题列表加"已通关 ✓"（纯，加 completedIds prop）（修改）
components/ExerciseListClient.tsx   读 store 后渲染 ExerciseList 的 client 包装
app/learn/[moduleId]/page.tsx     用 ExerciseListClient（修改）
app/me/page.tsx                   足迹页：总进度 + 各模块进度 + 清空（client）
app/page.tsx                      加"我的足迹"入口（修改）
```

---

## Task 1：localStorage 进度 store

**Files:**
- Create: `lib/progress/store.ts`
- Test: `lib/progress/store.test.ts`

- [ ] **Step 1: 写失败测试（jsdom 有 localStorage）**

Create `lib/progress/store.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCompleted,
  isCompleted,
  markCompleted,
  clearProgress,
  subscribe,
} from '@/lib/progress/store';

beforeEach(() => {
  localStorage.clear();
  clearProgress(); // 同时重置模块内缓存
});

describe('progress store', () => {
  it('初始为空', () => {
    expect(getCompleted()).toEqual([]);
    expect(isCompleted('m1-01')).toBe(false);
  });

  it('markCompleted 记录且去重', () => {
    markCompleted('m1-01');
    markCompleted('m1-01');
    markCompleted('m1-02');
    expect(getCompleted().sort()).toEqual(['m1-01', 'm1-02']);
    expect(isCompleted('m1-01')).toBe(true);
  });

  it('写入 localStorage 并能再读出', () => {
    markCompleted('m2-03');
    expect(JSON.parse(localStorage.getItem('sqldojo:completed')!)).toContain('m2-03');
  });

  it('clearProgress 清空', () => {
    markCompleted('m1-01');
    clearProgress();
    expect(getCompleted()).toEqual([]);
  });

  it('subscribe 在变化时被通知', () => {
    const cb = vi.fn();
    const unsub = subscribe(cb);
    markCompleted('m1-01');
    expect(cb).toHaveBeenCalled();
    unsub();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run lib/progress/store.test.ts`
Expected: FAIL —— 找不到 `@/lib/progress/store`。

- [ ] **Step 3: 写实现**

Create `lib/progress/store.ts`:
```ts
const KEY = 'sqldojo:completed';

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  if (typeof window === 'undefined') {
    cache = [];
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(ids: string[]): void {
  cache = ids;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* 隐私模式等写入失败时忽略 */
    }
  }
  listeners.forEach((l) => l());
}

export function getCompleted(): string[] {
  return read();
}

export function isCompleted(id: string): boolean {
  return read().includes(id);
}

export function markCompleted(id: string): void {
  const ids = read();
  if (!ids.includes(id)) write([...ids, id]);
}

export function clearProgress(): void {
  write([]);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// 供 useSyncExternalStore 使用：未变化时返回同一引用，避免无限渲染。
export function getSnapshot(): string[] {
  return read();
}

export function getServerSnapshot(): string[] {
  return [];
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run lib/progress/store.test.ts`
Expected: PASS（5 passed）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: localStorage 进度 store"
```

---

## Task 2：useProgress hook + 判题通过即记录

**Files:**
- Create: `lib/progress/useProgress.ts`
- Modify: `components/Playground.tsx`, `components/Playground.test.tsx`

- [ ] **Step 1: 写 hook**

Create `lib/progress/useProgress.ts`:
```ts
'use client';
import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot, getServerSnapshot } from './store';

export function useCompletedIds(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

- [ ] **Step 2: 在 Playground 测试里追加"通过即记录"断言**

修改 `components/Playground.test.tsx`：顶部 import 区加
```tsx
import { getCompleted, clearProgress } from '@/lib/progress/store';
```
把 `beforeEach(() => judgeMock.mockReset());` 替换为：
```tsx
beforeEach(() => {
  judgeMock.mockReset();
  clearProgress();
});
```
在第一个测试（passing verdict）的 `await waitFor(...)` 之后追加：
```tsx
    expect(getCompleted()).toContain('x'); // EX.id === 'x'
```

- [ ] **Step 3: 运行测试，确认失败**

Run: `npx vitest run components/Playground.test.tsx`
Expected: FAIL —— 当前 Playground 没记录进度，`getCompleted()` 不含 'x'。

- [ ] **Step 4: 在 Playground 判题通过时记录**

修改 `components/Playground.tsx`：顶部 import 区加
```tsx
import { markCompleted } from '@/lib/progress/store';
```
把 `run()` 里的 `setResult(await judgeRef.current.judge(code));` 替换为：
```tsx
      const r = await judgeRef.current.judge(code);
      setResult(r);
      if (r.verdict.passed) markCompleted(exercise.id);
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `npx vitest run components/Playground.test.tsx`
Expected: PASS（2 passed）。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 判题通过即记录进度 + useProgress hook"
```

---

## Task 3：模块通关徽标 + 路线图显示进度

**Files:**
- Create: `components/ModuleProgressBadge.tsx`, `components/ModuleProgressBadge.test.tsx`
- Modify: `components/ModuleCard.tsx`, `components/ModuleCard.test.tsx`, `app/learn/page.tsx`

- [ ] **Step 1: 写徽标失败测试**

Create `components/ModuleProgressBadge.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModuleProgressBadge } from '@/components/ModuleProgressBadge';
import { markCompleted, clearProgress } from '@/lib/progress/store';

beforeEach(() => {
  localStorage.clear();
  clearProgress();
});

describe('ModuleProgressBadge', () => {
  it('显示 已通关/总数', () => {
    markCompleted('m1-01');
    render(<ModuleProgressBadge exerciseIds={['m1-01', 'm1-02', 'm1-03']} />);
    expect(screen.getByText(/1\s*\/\s*3/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run components/ModuleProgressBadge.test.tsx`
Expected: FAIL —— 找不到 `@/components/ModuleProgressBadge`。

- [ ] **Step 3: 写徽标实现**

Create `components/ModuleProgressBadge.tsx`:
```tsx
'use client';
import { useCompletedIds } from '@/lib/progress/useProgress';

export function ModuleProgressBadge({ exerciseIds }: { exerciseIds: string[] }) {
  const done = new Set(useCompletedIds());
  const n = exerciseIds.filter((id) => done.has(id)).length;
  const total = exerciseIds.length;
  return (
    <span className="text-xs text-slate-500">
      {n} / {total} 通关
    </span>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run components/ModuleProgressBadge.test.tsx`
Expected: PASS。

- [ ] **Step 5: 让 ModuleCard 用 exerciseIds + 徽标**

替换 `components/ModuleCard.tsx` 全文：
```tsx
import Link from 'next/link';
import type { ModuleDef, TierKey } from '@/lib/sql/types';
import { ModuleProgressBadge } from './ModuleProgressBadge';

const TIER_BADGE: Record<TierKey, string> = {
  beginner: 'bg-emerald-600 text-white',
  intermediate: 'bg-amber-600 text-white',
  senior: 'bg-rose-600 text-white',
  sprint: 'bg-sky-600 text-white',
};

export function ModuleCard({
  module,
  exerciseIds,
}: {
  module: ModuleDef;
  exerciseIds: string[];
}) {
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
      <p className="mt-3">
        <ModuleProgressBadge exerciseIds={exerciseIds} />
      </p>
    </Link>
  );
}
```

- [ ] **Step 6: 更新 ModuleCard 测试为 exerciseIds**

替换 `components/ModuleCard.test.tsx` 全文：
```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModuleCard } from '@/components/ModuleCard';
import { clearProgress } from '@/lib/progress/store';
import type { ModuleDef } from '@/lib/sql/types';

const M: ModuleDef = {
  id: 'm1',
  order: 1,
  title: '入门',
  tierKey: 'beginner',
  tierLabel: '小白',
  summary: '取数据',
  lesson: '# x',
};

beforeEach(() => {
  localStorage.clear();
  clearProgress();
});

describe('ModuleCard', () => {
  it('显示标题、段位、通关进度，并链到模块页', () => {
    render(<ModuleCard module={M} exerciseIds={['m1-01', 'm1-02']} />);
    expect(screen.getByText('入门')).toBeInTheDocument();
    expect(screen.getByText('小白')).toBeInTheDocument();
    expect(screen.getByText(/0\s*\/\s*2/)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/learn/m1');
  });
});
```

- [ ] **Step 7: 路线图页传 exerciseIds**

替换 `app/learn/page.tsx` 里的 `.map` 渲染：
```tsx
        {allModules.map((m) => (
          <ModuleCard
            key={m.id}
            module={m}
            exerciseIds={exercisesByModule(m.id).map((e) => e.id)}
          />
        ))}
```

- [ ] **Step 8: 运行相关测试，确认通过**

Run: `npx vitest run components/ModuleProgressBadge.test.tsx components/ModuleCard.test.tsx`
Expected: PASS。

- [ ] **Step 9: 提交**

```bash
git add -A
git commit -m "feat: 路线图模块卡显示通关进度"
```

---

## Task 4：习题列表显示"已通关 ✓"

**Files:**
- Modify: `components/ExerciseList.tsx`, `components/ExerciseList.test.tsx`, `app/learn/[moduleId]/page.tsx`
- Create: `components/ExerciseListClient.tsx`

- [ ] **Step 1: 给 ExerciseList 测试加"完成打勾"用例**

替换 `components/ExerciseList.test.tsx` 全文：
```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExerciseList } from '@/components/ExerciseList';
import type { Exercise } from '@/lib/sql/types';

const mk = (id: string, title: string): Exercise => ({
  id,
  moduleId: 'm1',
  title,
  difficulty: 1,
  prompt: '',
  seedSql: '',
  solutionSql: '',
  orderMatters: false,
});

describe('ExerciseList', () => {
  it('每题一个链接，指向练习页', () => {
    render(<ExerciseList exercises={[mk('m1-01', '选出全部用户'), mk('m1-02', '筛选')]} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/exercise/m1-01');
    expect(screen.getByText('选出全部用户')).toBeInTheDocument();
  });

  it('已通关的题显示 ✓', () => {
    render(
      <ExerciseList
        exercises={[mk('m1-01', '甲'), mk('m1-02', '乙')]}
        completedIds={new Set(['m1-01'])}
      />,
    );
    expect(screen.getByLabelText('已通关')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run components/ExerciseList.test.tsx`
Expected: FAIL —— ExerciseList 还不认 `completedIds`。

- [ ] **Step 3: 给 ExerciseList 加 completedIds（保持纯函数）**

替换 `components/ExerciseList.tsx` 全文：
```tsx
import Link from 'next/link';
import type { Exercise } from '@/lib/sql/types';

export function ExerciseList({
  exercises,
  completedIds,
}: {
  exercises: Exercise[];
  completedIds?: Set<string>;
}) {
  const done = completedIds ?? new Set<string>();
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
            {done.has(ex.id) ? (
              <span aria-label="已通关" className="text-emerald-400">
                ✓
              </span>
            ) : (
              <span className="text-xs text-slate-500">难度 {ex.difficulty}</span>
            )}
          </Link>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run components/ExerciseList.test.tsx`
Expected: PASS（2 passed）。

- [ ] **Step 5: 写 client 包装**

Create `components/ExerciseListClient.tsx`:
```tsx
'use client';
import type { Exercise } from '@/lib/sql/types';
import { ExerciseList } from './ExerciseList';
import { useCompletedIds } from '@/lib/progress/useProgress';

export function ExerciseListClient({ exercises }: { exercises: Exercise[] }) {
  const completedIds = new Set(useCompletedIds());
  return <ExerciseList exercises={exercises} completedIds={completedIds} />;
}
```

- [ ] **Step 6: 模块页改用 ExerciseListClient**

修改 `app/learn/[moduleId]/page.tsx`：把 import
`import { ExerciseList } from '@/components/ExerciseList';`
改为
`import { ExerciseListClient } from '@/components/ExerciseListClient';`
把 `<ExerciseList exercises={exercises} />` 改为 `<ExerciseListClient exercises={exercises} />`。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: 习题列表显示已通关标记"
```

---

## Task 5：/me 足迹页 + 入口

**Files:**
- Create: `app/me/page.tsx`
- Modify: `app/page.tsx`, `app/learn/page.tsx`

- [ ] **Step 1: 写足迹页（client）**

Create `app/me/page.tsx`:
```tsx
'use client';
import Link from 'next/link';
import { allModules } from '@/content/modules';
import { exercisesByModule, allExercises } from '@/content/exercises';
import { useCompletedIds } from '@/lib/progress/useProgress';
import { clearProgress } from '@/lib/progress/store';

export default function MePage() {
  const done = new Set(useCompletedIds());
  const total = allExercises.length;
  const solved = allExercises.filter((e) => done.has(e.id)).length;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">我的足迹</h1>
        <p className="mt-2 text-slate-300">
          已通关 <span className="font-bold text-emerald-400">{solved}</span> / {total} 题
        </p>
      </header>

      <ul className="space-y-3">
        {allModules.map((m) => {
          const ids = exercisesByModule(m.id).map((e) => e.id);
          const n = ids.filter((id) => done.has(id)).length;
          const pct = ids.length ? Math.round((n / ids.length) * 100) : 0;
          return (
            <li key={m.id} className="rounded-md border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center justify-between text-sm">
                <Link href={`/learn/${m.id}`} className="text-slate-200">
                  {m.title}
                </Link>
                <span className="text-slate-400">
                  {n} / {ids.length}
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded bg-slate-800">
                <div className="h-2 rounded bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-4">
        <Link href="/learn" className="text-sm text-sky-400">
          ← 去路线图
        </Link>
        <button
          onClick={() => {
            if (confirm('确定清空全部进度？')) clearProgress();
          }}
          className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-300"
        >
          清空进度
        </button>
      </div>
    </main>
  );
}
```

> 注：进度条宽度用内联 `style={{ width }}`（动态百分比无法用 Tailwind 静态类），属必要内联样式、非渐变，符合规范。

- [ ] **Step 2: 落地页与路线图加"我的足迹"入口**

在 `app/page.tsx` 的两个按钮所在 `div` 内，最后追加一个链接：
```tsx
        <Link
          href="/me"
          className="inline-block rounded-md border border-slate-700 px-6 py-3 text-slate-200"
        >
          我的足迹
        </Link>
```
在 `app/learn/page.tsx` 顶部加 `import Link from 'next/link';`，并在 `<p className="mt-2 text-slate-400">从小白到 senior，循序闯关。</p>` 之后追加：
```tsx
      <p className="mt-1">
        <Link href="/me" className="text-sm text-sky-400">
          查看我的足迹 →
        </Link>
      </p>
```

- [ ] **Step 3: 全量测试 + 构建**

Run: `npm test && npm run build`
Expected: 测试全过；构建出现新路由 `/me`。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: /me 足迹页 + 进度入口"
```

---

## Task 6：E2E + 部署

**Files:** 无（验证与部署）

- [ ] **Step 1: 起 dev 跑进度 E2E**

写 `/tmp/e2e_phase3.py`（Playwright，单 context 保 localStorage），流程：
1. `/exercise/m1-01` → 输入 `SELECT * FROM users;` → 运行 → 等"✅ 通过"。
2. `/learn` → 断言 m1 卡片显示 `1 / 8`。
3. `/learn/m1` → 断言出现一个 `aria-label="已通关"` 的 ✓。
4. `/me` → 断言"已通关 1"。
5. 点"清空进度"（`page.on("dialog", lambda d: d.accept())` 处理 confirm）→ 断言回到 0。

Run：
```bash
npm run dev -- -p 3939   （后台）
curl 等就绪
python3 /tmp/e2e_phase3.py
lsof -ti:3939 | xargs -r kill
```
Expected: 全 PASS。

- [ ] **Step 2: 部署**

Run: `npm run deploy`
Expected: 输出 `https://sql-dojo.pp-account.workers.dev`。

- [ ] **Step 3: 线上验证**

`python3 /tmp/e2e_phase3.py https://sql-dojo.pp-account.workers.dev` 跑通同一流程。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: Phase 3 游客进度上线"
```

---

## 自检（Spec 覆盖 / 占位符 / 类型一致性）

**Spec 覆盖（对照 §5.4 游客优先、§13.8 进度、§13.6 进度标记）：**
- §5.4「游客优先：进度存 localStorage」→ Task 1/2 ✅
- §13.8 进度（完成标记；游客 localStorage）→ Task 2 ✅；`/me` 足迹页 → Task 5 ✅
- §13.6 路线图"已通关"标记 → Task 3（模块卡进度）+ Task 4（习题 ✓）✅
- **登录 / D1 云同步 / submissions 历史 → 明确不在本计划**（用户选择"先只做游客进度"）。非缺口。

**占位符扫描：** 每个改代码步骤都给完整代码与命令；E2E 步骤列了断言点与流程。✅

**类型一致性：** store 导出 `getCompleted/isCompleted/markCompleted/clearProgress/subscribe/getSnapshot/getServerSnapshot`，被 `useProgress`、Playground、各组件、/me 一致引用；`ModuleCard` 从 `exerciseCount:number` 改为 `exerciseIds:string[]`，调用点（/learn）已同步；`ExerciseList` 加可选 `completedIds:Set<string>`，旧用法仍兼容、新用法走 `ExerciseListClient`。✅

**交付物（Plan 3 完成时）：** 不登录即可记录"已通关"，路线图模块卡显示 `n/总数`、习题列表打 ✓、`/me` 显示总进度与各模块进度条、可清空——纯本地、已上线。
