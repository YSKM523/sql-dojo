# 前端重设计（Cloudflare 控制台风）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended for this visual redesign — needs eyes-on screenshot iteration) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 把全部用户页重做成统一的 Cloudflare 控制台风设计系统（浅色为主可切深色、CF 橙主色 + 蓝链、白卡细边、Inter 字体、Lucide 图标无 emoji、纯色无渐变）。

**Architecture:** 在 `globals.css` 用 CSS 变量定义两套主题 token，经 Tailwind v4 `@theme inline` 暴露为语义色类（`bg-panel`/`text-fg2`/`bg-brand`…）；`<html data-theme>` 切换主题（内联脚本防闪烁 + localStorage）。所有页/组件改用 token + Lucide 图标；**只改样式不改行为**，现有测试断言的是文字/aria（非 emoji），保持文字与 aria-label 即全绿。

**Tech Stack:** Next.js 16、Tailwind v4、lucide-react、next/font（Inter + Geist Mono）、CodeMirror（编辑器恒深）。

参考 spec：`docs/superpowers/specs/2026-06-16-sql-dojo-ui-redesign-design.md`

> 视觉为主：每个 Task 末尾用真浏览器逐页截图（浅 + 深）核对，不满意就当场迭代。测试保持 `npx vitest run` 全绿、`tsc` 干净、`npm run build` 成功。

---

## File Structure

**新建：** `components/ThemeToggle.tsx`、`components/Topbar.tsx`
**删除：** `components/AuthBadge.tsx`（逻辑并入 Topbar；它只在 layout 用过，无独立测试）
**修改：** `app/globals.css`、`app/layout.tsx`、`app/page.tsx`、`app/learn/page.tsx`、`app/learn/[moduleId]/page.tsx`、`app/exercise/[id]/page.tsx`、`app/me/page.tsx`、`app/login/page.tsx`、`components/{ModuleCard,ModuleProgressBadge,ExerciseList,VerdictBanner,ResultTable,AiCopilot,LessonView,ExerciseNavBar,Playground,SqlEditor}.tsx`、`package.json`

约定：提交中文、**不带 Co-Authored-By**。Tailwind 动态类陷阱：段位色用完整静态类（沿用 `ModuleCard` 的 Record）。

---

## Task 1: 依赖 + 设计 token + 字体 + 防闪烁

**Files:** `package.json`、`app/globals.css`、`app/layout.tsx`

- [ ] **Step 1: 装 lucide-react**

Run: `cd /home/ubuntu/sql-dojo && npm i lucide-react`
Expected: 安装成功（React 19 兼容）。

- [ ] **Step 2: 重写 globals.css（token 系统 + prose 适配）**

Replace `app/globals.css` 全文：

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme inline {
  --font-sans: var(--font-inter), "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, Menlo, monospace;
  --color-bg: var(--bg);
  --color-panel: var(--panel);
  --color-panel2: var(--panel2);
  --color-line: var(--line);
  --color-fg: var(--fg);
  --color-fg2: var(--fg2);
  --color-fg3: var(--fg3);
  --color-brand: var(--brand);
  --color-brand-hover: var(--brand-hover);
  --color-link: var(--link);
  --color-ok: var(--ok);
  --color-ok-soft: var(--ok-soft);
  --color-bad: var(--bad);
  --color-bad-soft: var(--bad-soft);
  --shadow-card: var(--shadow-card-v);
}

:root,
[data-theme="light"] {
  --bg: #f1f3f5; --panel: #ffffff; --panel2: #f6f7f8; --line: #e3e5e8;
  --fg: #1f2933; --fg2: #5b6573; --fg3: #8a929e;
  --brand: #f6821f; --brand-hover: #e0700f; --link: #0051c3;
  --ok: #0a7f47; --ok-soft: #e7f6ee; --bad: #bd2719; --bad-soft: #fdecea;
  --shadow-card-v: 0 1px 2px rgba(20, 30, 50, 0.05);
}

[data-theme="dark"] {
  --bg: #15171c; --panel: #1c1f26; --panel2: #161b25; --line: #2a2e36;
  --fg: #eef2f8; --fg2: #9aa4b2; --fg3: #6b7585;
  --brand: #f6821f; --brand-hover: #e0700f; --link: #5aa2ff;
  --ok: #46d38a; --ok-soft: #0e2a1c; --bad: #f3766a; --bad-soft: #2a1411;
  --shadow-card-v: 0 0 0 transparent;
}

body {
  background-color: var(--bg);
  color: var(--fg);
  font-family: var(--font-sans);
}

/* 概念课 prose 跟随主题（用 token 着色；代码块恒深） */
.prose {
  --tw-prose-body: var(--fg2);
  --tw-prose-headings: var(--fg);
  --tw-prose-bold: var(--fg);
  --tw-prose-links: var(--link);
  --tw-prose-code: var(--brand);
  --tw-prose-quotes: var(--fg2);
  --tw-prose-bullets: var(--fg3);
  --tw-prose-hr: var(--line);
  --tw-prose-pre-bg: #1b1f2a;
  --tw-prose-pre-code: #e6e9ef;
}
```

- [ ] **Step 3: 改 layout.tsx（Inter 字体 + 防闪烁脚本 + 预留 Topbar 槽位）**

Replace `app/layout.tsx` 全文（Topbar 在 Task 2 创建；本步先不 import 它，避免编译失败——先放普通结构，Task 2 再换）：

```tsx
import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import ProgressSync from "@/components/ProgressSync";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SQL 道场 — 在浏览器里练真 SQL，从小白到 senior",
  description: "跑真实 Postgres、即时判对错、AI 结对的中文 SQL 实战学习平台。",
};

const themeScript =
  "try{var t=localStorage.getItem('sqldojo:theme')||'light';document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-fg">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ProgressSync />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: 构建冒烟**

Run: `cd /home/ubuntu/sql-dojo && npx tsc --noEmit && npm run build 2>&1 | tail -3`
Expected: tsc 干净、build 成功。

- [ ] **Step 5: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add package.json package-lock.json app/globals.css app/layout.tsx
git commit -m "feat(ui): 设计 token 系统(浅/深)+Inter字体+防闪烁(CF风重设地基)"
```

---

## Task 2: ThemeToggle + Topbar（取代 AuthBadge）

**Files:** Create `components/ThemeToggle.tsx`、`components/Topbar.tsx`；Modify `app/layout.tsx`；Delete `components/AuthBadge.tsx`

- [ ] **Step 1: ThemeToggle.tsx**

Create `components/ThemeToggle.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const t = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
    setTheme(t);
  }, []);
  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('sqldojo:theme', next);
    } catch {
      /* 隐私模式忽略 */
    }
  }
  return (
    <button
      onClick={toggle}
      aria-label="切换深浅色"
      className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-fg2 hover:text-fg"
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
```

- [ ] **Step 2: Topbar.tsx**

Create `components/Topbar.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database } from 'lucide-react';
import { useSession } from '@/lib/auth/useSession';
import { ThemeToggle } from './ThemeToggle';

export function Topbar() {
  const pathname = usePathname();
  const { user, loading } = useSession();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.assign('/');
  }

  const link = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`flex h-full items-center text-sm ${
        active
          ? 'font-semibold text-fg [box-shadow:inset_0_-2px_0_var(--brand)]'
          : 'text-fg2 hover:text-fg'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 flex h-[52px] items-center gap-5 border-b border-line bg-panel px-4">
      <Link href="/" className="flex items-center gap-2 font-bold text-fg">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-brand text-white">
          <Database size={13} />
        </span>
        SQL 道场
      </Link>
      <nav className="flex h-full items-center gap-4">
        {link('/learn', '学习路线图', pathname.startsWith('/learn') || pathname.startsWith('/exercise'))}
        {link('/me', '我的足迹', pathname === '/me')}
      </nav>
      <div className="flex-1" />
      <ThemeToggle />
      {!loading &&
        (user ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-fg2">{user.email}</span>
            <button
              onClick={logout}
              className="rounded-md border border-line px-2.5 py-1 text-fg2 hover:text-fg"
            >
              退出
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-brand px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            登录
          </Link>
        ))}
    </header>
  );
}
```

- [ ] **Step 3: layout.tsx 挂 Topbar，删 AuthBadge**

在 `app/layout.tsx` import 区加 `import { Topbar } from "@/components/Topbar";`，并把 `<body>` 内改为在 `<ProgressSync />` 后、`<div className="flex-1">` 前插入 `<Topbar />`：

```tsx
      <body className="min-h-full flex flex-col bg-bg text-fg">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ProgressSync />
        <Topbar />
        <div className="flex-1">{children}</div>
      </body>
```

然后删除旧文件：`git rm components/AuthBadge.tsx`（确认无其他引用：`grep -rn AuthBadge app components` 应只剩本次删除）。

- [ ] **Step 4: 构建 + 浏览器核对（浅/深 + 切换）**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -3`
然后 `npm run dev`，浏览器开任意页：确认顶栏 = logo(Database图标)+字标 + 导航(选中橙下划线) + 主题开关 + 登录态；点开关浅↔深切换、刷新不丢不闪。截图浅/深各一。

- [ ] **Step 5: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add components/ThemeToggle.tsx components/Topbar.tsx app/layout.tsx
git rm components/AuthBadge.tsx
git commit -m "feat(ui): CF风顶栏 Topbar + 主题切换开关(取代 AuthBadge)"
```

---

## Task 3: 落地页 + 路线图 + 模块概览

**Files:** `app/page.tsx`、`app/learn/page.tsx`、`app/learn/[moduleId]/page.tsx`、`components/{ModuleCard,ModuleProgressBadge,ExerciseList,LessonView}.tsx`

- [ ] **Step 1: 落地页 page.tsx（CF hero，左对齐）**

Replace `app/page.tsx`:

```tsx
import Link from 'next/link';
import { Play, Map, User } from 'lucide-react';

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-20">
      <h1 className="text-4xl font-extrabold tracking-tight text-fg">SQL 道场</h1>
      <p className="mt-3 max-w-xl text-lg text-fg2">
        在浏览器里跑真实 Postgres，边练边和 AI 结对，从小白到 senior。8 个模块循序闯关。
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/exercise/m1-01"
          className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-hover"
        >
          <Play size={16} /> 立即开练
        </Link>
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-5 py-2.5 text-fg shadow-card hover:border-fg3"
        >
          <Map size={16} /> 学习路线图
        </Link>
        <Link
          href="/me"
          className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-5 py-2.5 text-fg shadow-card hover:border-fg3"
        >
          <User size={16} /> 我的足迹
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: ModuleProgressBadge.tsx（token + 进度条）**

Replace `components/ModuleProgressBadge.tsx`:

```tsx
'use client';
import { useCompletedIds } from '@/lib/progress/useProgress';
import { Check } from 'lucide-react';

export function ModuleProgressBadge({ exerciseIds }: { exerciseIds: string[] }) {
  const done = new Set(useCompletedIds());
  const n = exerciseIds.filter((id) => done.has(id)).length;
  const total = exerciseIds.length;
  const pct = total ? Math.round((n / total) * 100) : 0;
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel2">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-xs text-fg3">
        {n} / {total} 通关{n === total && total > 0 && <Check size={12} className="text-ok" />}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: ModuleCard.tsx（CF 卡 + 扁平段位 pill）**

Replace `components/ModuleCard.tsx`（保留 `TIER_BADGE` Record 静态类，避免 Tailwind 动态类陷阱）:

```tsx
import Link from 'next/link';
import type { ModuleDef, TierKey } from '@/lib/sql/types';
import { ModuleProgressBadge } from './ModuleProgressBadge';

const TIER_BADGE: Record<TierKey, string> = {
  beginner: 'bg-emerald-600 text-white',
  intermediate: 'bg-amber-600 text-white',
  advanced: 'bg-orange-600 text-white',
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
      className="block rounded-lg border border-line bg-panel p-4 shadow-card transition-colors hover:border-fg3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-fg3">模块 {module.order}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TIER_BADGE[module.tierKey]}`}>
          {module.tierLabel}
        </span>
      </div>
      <h3 className="mt-2 text-base font-bold text-fg">{module.title}</h3>
      <p className="mt-1 min-h-[34px] text-sm text-fg2">{module.summary}</p>
      <div className="mt-3">
        <ModuleProgressBadge exerciseIds={exerciseIds} />
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: 路线图 learn/page.tsx（面包屑 + 3 列网格）**

Replace `app/learn/page.tsx`:

```tsx
import Link from 'next/link';
import { allModules } from '@/content/modules';
import { exercisesByModule } from '@/content/exercises';
import { ModuleCard } from '@/components/ModuleCard';

export default function LearnPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <p className="text-xs text-fg3">
        <Link href="/" className="text-link">首页</Link> / 学习路线图
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-fg">学习路线图</h1>
      <p className="mt-1 text-sm text-fg2">从小白到 senior，8 个模块循序闯关。</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allModules.map((m) => (
          <ModuleCard
            key={m.id}
            module={m}
            exerciseIds={exercisesByModule(m.id).map((e) => e.id)}
          />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: ExerciseList.tsx（token + Check 图标，保留 aria-label）**

Replace `components/ExerciseList.tsx`（**务必保留 `aria-label="已通关"`**，否则 ExerciseList.test 失败）:

```tsx
import Link from 'next/link';
import type { Exercise } from '@/lib/sql/types';
import { Check } from 'lucide-react';

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
            className="flex items-center justify-between rounded-md border border-line bg-panel px-4 py-3 shadow-card transition-colors hover:border-fg3"
          >
            <span className="text-fg">
              <span className="mr-2 text-fg3">{i + 1}.</span>
              {ex.title}
            </span>
            {done.has(ex.id) ? (
              <span aria-label="已通关" className="text-ok">
                <Check size={16} />
              </span>
            ) : (
              <span className="text-xs text-fg3">难度 {ex.difficulty}</span>
            )}
          </Link>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 6: LessonView.tsx（去 prose-invert，用 token prose）**

Replace `components/LessonView.tsx`:

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function LessonView({ markdown }: { markdown: string }) {
  return (
    <div className="prose max-w-none prose-pre:rounded-md prose-code:font-mono">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 7: 模块概览 learn/[moduleId]/page.tsx（token + 返回链接图标）**

Replace `app/learn/[moduleId]/page.tsx`:

```tsx
import { getModuleById } from '@/content/modules';
import { exercisesByModule } from '@/content/exercises';
import { LessonView } from '@/components/LessonView';
import { ExerciseListClient } from '@/components/ExerciseListClient';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function ModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const mod = getModuleById(moduleId);
  if (!mod) notFound();
  const exercises = exercisesByModule(mod.id);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10">
      <Link href="/learn" className="inline-flex items-center gap-1 text-sm text-link">
        <ChevronLeft size={15} /> 返回路线图
      </Link>
      <header>
        <p className="text-xs text-fg3">
          模块 {mod.order} · {mod.tierLabel}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-fg">{mod.title}</h1>
      </header>
      <LessonView markdown={mod.lesson} />
      <section>
        <h2 className="mb-3 text-lg font-semibold text-fg">练习（{exercises.length}）</h2>
        <ExerciseListClient exercises={exercises} />
      </section>
    </main>
  );
}
```

- [ ] **Step 8: 构建 + 截图核对（落地/路线图/模块，浅+深）**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -3`；dev 起服，截图三页浅/深各一，核对卡片/层级/颜色。

- [ ] **Step 9: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add app/page.tsx app/learn components/ModuleCard.tsx components/ModuleProgressBadge.tsx components/ExerciseList.tsx components/LessonView.tsx
git commit -m "feat(ui): 落地页+路线图+模块概览 CF化(卡片/面包屑/进度条/图标)"
```

---

## Task 4: 核心练习页集群

**Files:** `app/exercise/[id]/page.tsx`、`components/{Playground,VerdictBanner,ResultTable,AiCopilot,ExerciseNavBar,SqlEditor}.tsx`

- [ ] **Step 1: SqlEditor.tsx（恒深，边框用 token）**

Replace `components/SqlEditor.tsx`:

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
    <div className="overflow-hidden rounded-md border border-line">
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

- [ ] **Step 2: VerdictBanner.tsx（图标 + 软底 token，保留"通过"/"还不对"文字）**

Replace `components/VerdictBanner.tsx`（**保留含"通过"的文案**，VerdictBanner.test 断言它）:

```tsx
import type { Verdict } from '@/lib/sql/types';
import { CheckCircle2, XCircle } from 'lucide-react';

export function VerdictBanner({ verdict }: { verdict: Verdict }) {
  if (verdict.passed) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-md border border-ok/30 bg-ok-soft px-4 py-3 text-sm font-medium text-ok"
      >
        <CheckCircle2 size={18} /> 通过！答案正确。
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-md border border-bad/30 bg-bad-soft px-4 py-3 text-sm font-medium text-bad"
    >
      <XCircle size={18} /> 还不对：{verdict.reason ?? '结果与期望不一致'}
    </div>
  );
}
```

- [ ] **Step 3: ResultTable.tsx（token 表格）**

Replace `components/ResultTable.tsx`:

```tsx
import type { ResultSet } from '@/lib/sql/types';

export function ResultTable({ result }: { result: ResultSet }) {
  if (result.rows.length === 0) {
    return <p className="text-sm text-fg2">查询成功，但没有返回任何行。</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-panel2">
          <tr>
            {result.columns.map((c, i) => (
              <th key={i} className="border-b border-line px-3 py-2 font-mono font-semibold text-fg2">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, ri) => (
            <tr key={ri} className="bg-panel even:bg-panel2/40">
              {row.map((cell, ci) => (
                <td key={ci} className="border-b border-line px-3 py-2 font-mono text-fg">
                  {cell === null ? <span className="text-fg3">NULL</span> : String(cell)}
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

- [ ] **Step 4: AiCopilot.tsx（Lucide 图标，保留"提示/解释/报错"文字）**

Replace `components/AiCopilot.tsx`（**保留按钮文字含"提示"/"解释"**，AiCopilot.test 用 name 正则匹配）:

```tsx
'use client';
import { useState } from 'react';
import { Lightbulb, Search, Bug } from 'lucide-react';
import type { AiAction } from '@/lib/ai/prompts';

export function AiCopilot({
  exerciseId,
  getSql,
  getError,
}: {
  exerciseId: string;
  getSql: () => string;
  getError: () => string | null;
}) {
  const [loading, setLoading] = useState<AiAction | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(action: AiAction) {
    setLoading(action);
    setReply(null);
    setError(null);
    try {
      const resp = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, exerciseId, sql: getSql(), errorMsg: getError() ?? undefined }),
      });
      const data = (await resp.json()) as { reply?: string; error?: string };
      if (!resp.ok || data.error) setError(data.error ?? '出错了');
      else setReply(data.reply ?? '');
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(null);
    }
  }

  const btn =
    'inline-flex items-center gap-1.5 rounded-md border border-line bg-panel2 px-3 py-1.5 text-sm text-fg disabled:opacity-50 hover:border-fg3';
  return (
    <div className="rounded-md border border-line bg-panel p-4 shadow-card">
      <p className="mb-2 text-xs text-fg3">AI 副驾（DeepSeek）</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => ask('hint')} disabled={!!loading} className={btn}>
          <Lightbulb size={15} /> {loading === 'hint' ? '思考中…' : '给点提示'}
        </button>
        <button onClick={() => ask('explain')} disabled={!!loading} className={btn}>
          <Search size={15} /> {loading === 'explain' ? '思考中…' : '解释这条 SQL'}
        </button>
        <button onClick={() => ask('debug')} disabled={!!loading} className={btn}>
          <Bug size={15} /> {loading === 'debug' ? '思考中…' : '为什么报错'}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
      {reply && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg">{reply}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Playground.tsx（运行按钮 Play 图标 + token）**

在 `components/Playground.tsx` 仅改 import 与 return 的按钮/报错样式（逻辑不动）。import 区加 `import { Play } from 'lucide-react';`。把 return 的 `<button>` 与 error 块替换为：

```tsx
      <button
        onClick={run}
        disabled={running}
        className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
      >
        <Play size={16} /> {running ? '运行中…' : '运行'}
      </button>
      {error && <div role="alert" className="text-sm text-bad">运行出错：{error}</div>}
```

- [ ] **Step 6: ExerciseNavBar.tsx（Chevron 图标 + token）**

Replace `components/ExerciseNavBar.tsx`:

```tsx
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ExerciseNav } from '@/content/exercises';

export function ExerciseNavBar({ nav }: { nav: ExerciseNav }) {
  return (
    <nav className="flex items-center justify-between border-t border-line pt-4 text-sm">
      {nav.prevId ? (
        <Link href={`/exercise/${nav.prevId}`} className="inline-flex items-center gap-1 text-link">
          <ChevronLeft size={15} /> 上一题
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 text-fg3">
          <ChevronLeft size={15} /> 上一题
        </span>
      )}
      <Link href={`/learn/${nav.moduleId}`} className="text-fg2">
        第 {nav.index + 1} / {nav.total} 题 · 回模块
      </Link>
      {nav.nextId ? (
        <Link href={`/exercise/${nav.nextId}`} className="inline-flex items-center gap-1 text-link">
          下一题 <ChevronRight size={15} />
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1 text-fg3">
          下一题 <ChevronRight size={15} />
        </span>
      )}
    </nav>
  );
}
```

- [ ] **Step 7: 练习页 exercise/[id]/page.tsx（题面卡 + token）**

Replace `app/exercise/[id]/page.tsx`:

```tsx
import { getExerciseById, exerciseNav } from '@/content/exercises';
import { Playground } from '@/components/Playground';
import { ExerciseNavBar } from '@/components/ExerciseNavBar';
import { notFound } from 'next/navigation';

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exercise = getExerciseById(id);
  if (!exercise) notFound();
  const nav = exerciseNav(exercise.id);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-brand">
          {exercise.moduleId} · 难度 {exercise.difficulty}
        </p>
        <h1 className="text-2xl font-extrabold text-fg">{exercise.title}</h1>
      </header>
      <div className="rounded-md border border-line bg-panel p-4 text-fg2 shadow-card">
        {exercise.prompt}
      </div>
      <Playground exercise={exercise} />
      {nav && <ExerciseNavBar nav={nav} />}
    </main>
  );
}
```

- [ ] **Step 8: 构建 + 截图核对（练习页浅/深，跑一题看判题/结果/AI）**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -3`；dev 起服，开 `/exercise/m5-01` 与 `/exercise/m7-06`，浅/深各截一张，跑一题确认 判对(绿)/结果表/AI 面板/导航 都 CF 化且功能正常。

- [ ] **Step 9: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add app/exercise components/Playground.tsx components/VerdictBanner.tsx components/ResultTable.tsx components/AiCopilot.tsx components/ExerciseNavBar.tsx components/SqlEditor.tsx
git commit -m "feat(ui): 练习页集群 CF化(题面卡/判题图标/结果表/AI/导航)"
```

---

## Task 5: 我的足迹 + 登录页

**Files:** `app/me/page.tsx`、`app/login/page.tsx`

- [ ] **Step 1: me/page.tsx（token + 进度条）**

Replace `app/me/page.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { allModules } from '@/content/modules';
import { exercisesByModule, allExercises } from '@/content/exercises';
import { useCompletedIds } from '@/lib/progress/useProgress';
import { clearProgress } from '@/lib/progress/store';
import { useSession } from '@/lib/auth/useSession';

export default function MePage() {
  const done = new Set(useCompletedIds());
  const { user, loading } = useSession();
  const total = allExercises.length;
  const solved = allExercises.filter((e) => done.has(e.id)).length;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-extrabold text-fg">我的足迹</h1>
        <p className="mt-2 text-fg2">
          已通关 <span className="font-bold text-brand">{solved}</span> / {total} 题
        </p>
        {!loading &&
          (user ? (
            <p className="mt-1 text-sm text-fg3">已登录 {user.email} · 进度已云端同步</p>
          ) : (
            <p className="mt-1 text-sm text-fg3">
              <Link href="/login" className="text-link">登录</Link> 以跨设备保存进度
            </p>
          ))}
      </header>

      <ul className="space-y-3">
        {allModules.map((m) => {
          const ids = exercisesByModule(m.id).map((e) => e.id);
          const n = ids.filter((id) => done.has(id)).length;
          const pct = ids.length ? Math.round((n / ids.length) * 100) : 0;
          return (
            <li key={m.id} className="rounded-md border border-line bg-panel p-4 shadow-card">
              <div className="flex items-center justify-between text-sm">
                <Link href={`/learn/${m.id}`} className="text-fg">
                  {m.title}
                </Link>
                <span className="text-fg3">
                  {n} / {ids.length}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-panel2">
                <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-4">
        <Link href="/learn" className="text-sm text-link">
          去路线图
        </Link>
        <button
          onClick={() => {
            if (confirm('确定清空本机进度？')) clearProgress();
          }}
          className="rounded-md border border-line px-3 py-1 text-sm text-fg2 hover:text-fg"
        >
          清空进度
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: login/page.tsx（token，CF 表单）**

把 `app/login/page.tsx` 的视觉类替换为 token（逻辑不动）。具体：把根 `<main>` 起的容器与表单元素改为：标题 `text-fg`、副标题 `text-fg2`、输入框 `w-full rounded-md border border-line bg-panel px-3 py-2 text-fg placeholder:text-fg3`、主按钮 `w-full rounded-md bg-brand px-3 py-2 font-semibold text-white hover:bg-brand-hover disabled:opacity-50`、"换个邮箱"按钮 `w-full text-sm text-fg2`、错误 `text-sm text-bad`、"验证码已发往 X" 的 X 用 `text-fg`。整体替换为：

```tsx
'use client';
import { useState } from 'react';

type Step = 'email' | 'code';

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setErr(data.error ?? '发送失败');
        return;
      }
      setStep('code');
    } catch {
      setErr('网络错误，请重试');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const data = (await res.json()) as { user?: unknown; error?: string };
      if (!res.ok) {
        setErr(data.error ?? '验证失败');
        return;
      }
      window.location.assign('/me');
    } catch {
      setErr('网络错误，请重试');
    } finally {
      setBusy(false);
    }
  }

  const input =
    'w-full rounded-md border border-line bg-panel px-3 py-2 text-fg placeholder:text-fg3';
  const primary =
    'w-full rounded-md bg-brand px-3 py-2 font-semibold text-white hover:bg-brand-hover disabled:opacity-50';

  return (
    <main className="mx-auto w-full max-w-sm space-y-6 px-4 py-16">
      <header>
        <h1 className="text-2xl font-extrabold text-fg">登录 SQL 道场</h1>
        <p className="mt-2 text-sm text-fg2">用邮箱验证码登录，进度自动跨设备同步。</p>
      </header>

      {step === 'email' ? (
        <form onSubmit={requestCode} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={input}
          />
          <button type="submit" disabled={busy} className={primary}>
            {busy ? '发送中…' : '发送验证码'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <p className="text-sm text-fg2">
            验证码已发往 <span className="text-fg">{email}</span>
          </p>
          <input
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6 位验证码"
            className={`${input} tracking-widest`}
          />
          <button type="submit" disabled={busy} className={primary}>
            {busy ? '验证中…' : '登录'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setCode('');
              setErr(null);
            }}
            className="w-full text-sm text-fg2 hover:text-fg"
          >
            换个邮箱
          </button>
        </form>
      )}

      {err ? <p className="text-sm text-bad">{err}</p> : null}
    </main>
  );
}
```

- [ ] **Step 3: 构建 + 截图核对（me/login 浅+深）**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -3`；截图核对。

- [ ] **Step 4: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add app/me/page.tsx app/login/page.tsx
git commit -m "feat(ui): 我的足迹+登录页 CF化(token/进度条/表单)"
```

---

## Task 6: 收尾验证 + 部署

- [ ] **Step 1: 残留扫描 + 全量测试 + 类型 + 构建**

Run:
```bash
cd /home/ubuntu/sql-dojo
echo "=== 残留 emoji（应只在题库中文/无）==="; grep -rnP "[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{2705}\x{274C}]" app components | grep -v node_modules || echo "✓ 组件/页面无 emoji"
echo "=== 残留硬编码 slate-（应为空）==="; grep -rn "slate-\|sky-400\|rose-400\|emerald-600 text-white" app components | grep -v "TIER_BADGE\|node_modules" || echo "✓ 无散落硬编码色"
npx vitest run 2>&1 | tail -4
npx tsc --noEmit && echo "tsc ok"
npm run build 2>&1 | tail -3
```
Expected: 组件/页面无 emoji、无散落 `slate-*`；vitest 全绿（150）；tsc 干净；build 成功。（段位 `bg-emerald-600` 等保留在 TIER_BADGE，属设计内。）

- [ ] **Step 2: 部署**

Run: `cd /home/ubuntu/sql-dojo && npm run deploy`
Expected: 部署成功。

- [ ] **Step 3: 真浏览器全站走查（线上，浅 + 深）**

逐页（落地/路线图/模块/练习/me/login）浅色 + 深色各截图：确认 CF 风一致、主题切换生效且刷新不丢不闪、无 emoji、功能（解题判对错/进度/AI/登录/导航）照常。必要时迭代修正后重部署。

- [ ] **Step 4: 收尾**

- 更新记忆 `project_sql_dojo.md` + `MEMORY.md`：前端重设计为 CF 控制台风（token 系统浅/深双主题 + 主题切换 + Inter + Lucide 无 emoji）。
- 关闭可视化 brainstorm 服务器（`stop-server.sh`）。
- `git push origin main`（先合并分支）。
- 向用户汇报 + 线上 URL + 浅/深截图说明。

---

## Self-Review

**Spec 覆盖：** §2 token 系统(两主题)→Task1 ✓；§3 Inter+Lucide 无 emoji→Task1/2/3/4 各组件 ✓；§4 主题切换+防闪烁→Task1(脚本)/Task2(ThemeToggle) ✓；§5 全部页+Topbar(取代AuthBadge)→Task2-5 ✓；§6 编辑器恒深→Task4 SqlEditor ✓；§7 纯色无渐变/零emoji/不改行为→全程(逻辑不动,仅类名/图标) ✓；§8 测试保持绿(保留"通过"/"提示"/"解释"/aria-label"已通关")→VerdictBanner/AiCopilot/ExerciseList 三处显式保留 ✓；§9 验收→Task6 ✓。

**占位扫描：** login 用整文件替换（非"改若干类"模糊描述）；无 TODO/TBD。

**类型/命名一致：** token 类名（bg-bg/bg-panel/bg-panel2/border-line/text-fg/text-fg2/text-fg3/bg-brand/text-link/text-ok/bg-ok-soft/text-bad/bg-bad-soft/shadow-card）在 globals.css 定义、各组件统一引用；Topbar 用既有 `useSession`；删除 AuthBadge 无其他引用。
