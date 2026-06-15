# SQL 道场 Phase 4 · Plan 4：AI 副驾（DeepSeek）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 练习场里加「AI 副驾」面板，三个动作——**给点提示**（渐进、不给完整答案）/ **解释这条 SQL** / **为什么报错**；服务端 `/api/ai` 调 DeepSeek（OpenAI 兼容），KV 按 IP 每日限流控成本。

**Architecture:** 纯逻辑（提示词构造、DeepSeek 客户端、限流）放 `lib/ai/`，可单测（mock fetch / fake KV）。一个薄的 Next 路由 `app/api/ai/route.ts` 用 `getCloudflareContext()` 取密钥/模型/KV，串起来调 DeepSeek。前端 `AiCopilot` 客户端组件调 `/api/ai` 并展示。**只返回最终 `content`，绝不返回 `reasoning_content`**（思考型模型的推理可能含完整答案，尤其"提示"）。

**Tech Stack:** 续用现有栈；DeepSeek OpenAI 兼容端点 `https://api.deepseek.com/chat/completions`，模型默认 `deepseek-v4-pro`（思考型，慢且贵 ~5×；可用 `DEEPSEEK_MODEL` 环境变量改 `deepseek-v4-flash` 省钱）；`max_tokens` 给到 1024（思考会吃 token，太小会只出推理没答案）。新增 Cloudflare KV（限流）。

**约定：** 纯色无渐变；提交不要 Co-Authored-By；当前在 `phase4-ai-copilot` 分支；`.dev.vars` 已存 `DEEPSEEK_API_KEY` 且已 gitignore。

**已实测确认（写本计划前用 curl 验过）：** key 有效；`deepseek-v4-pro` 与 `deepseek-v4-flash` 均可用、均为思考型（返回 `reasoning_content`）；`max_tokens=120` 会导致 `content` 为空（全被推理吃掉），`max_tokens=800` 正常出答案。

---

## 文件结构（本计划将创建/修改）

```
lib/ai/prompts.ts            提示词构造 buildMessages(action, payload)（纯）
lib/ai/deepseek.ts           askDeepSeek(messages, opts) 调 OpenAI 兼容端点（fetch）
lib/ai/ratelimit.ts          checkRateLimit(kv, ip, day, limit)（纯逻辑 + KVLike 接口）
app/api/ai/route.ts          POST 路由：取 env → 限流 → 构造 → 调 DeepSeek → 返回
components/AiCopilot.tsx      AI 面板（client）：三按钮 + 调 /api/ai + 展示
components/Playground.tsx     接入 AiCopilot（修改）
next.config.ts               initOpenNextCloudflareForDev()（修改）
wrangler.jsonc               加 DEEPSEEK_MODEL var + AI_RATELIMIT KV 绑定（修改）
cloudflare-env.d.ts          getCloudflareContext().env 的类型
```

---

## Task 1：基础设施（KV + 绑定 + dev 上下文）

**Files:**
- Modify: `next.config.ts`, `wrangler.jsonc`
- Create: `cloudflare-env.d.ts`

- [ ] **Step 1: 开通 KV 命名空间**

Run:
```bash
cd /home/ubuntu/sql-dojo
npx wrangler kv namespace create AI_RATELIMIT
```
Expected: 输出一段 `{ "binding": "AI_RATELIMIT", "id": "xxxxx" }`。记下 `id`。

- [ ] **Step 2: wrangler.jsonc 加 var + KV 绑定**

在 `wrangler.jsonc` 顶层对象里（`assets` 之后）追加（把 `<KV_ID>` 换成上一步的 id）：
```jsonc
  "vars": { "DEEPSEEK_MODEL": "deepseek-v4-pro" },
  "kv_namespaces": [{ "binding": "AI_RATELIMIT", "id": "<KV_ID>" }]
```

- [ ] **Step 3: next.config 启用 dev 端的 CF 上下文**

修改 `next.config.ts`，在文件顶部 import 之后、`const nextConfig` 之前加：
```ts
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
```
（让 `next dev` 也能通过 `getCloudflareContext()` 读到 `.dev.vars` 的密钥与本地 KV。）

- [ ] **Step 4: 写 env 类型**

Create `cloudflare-env.d.ts`:
```ts
interface CloudflareEnv {
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
  AI_RATELIMIT?: import('@/lib/ai/ratelimit').KVLike;
}
```

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "chore: AI 基础设施(KV 限流绑定 + dev CF 上下文)"
```

---

## Task 2：提示词构造 lib/ai/prompts.ts

**Files:**
- Create: `lib/ai/prompts.ts`
- Test: `lib/ai/prompts.test.ts`

- [ ] **Step 1: 写失败测试**

Create `lib/ai/prompts.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildMessages } from '@/lib/ai/prompts';

describe('buildMessages', () => {
  it('hint：系统提示强约束不给完整答案，用户消息带题面与 SQL', () => {
    const msgs = buildMessages('hint', { title: 'T', prompt: 'P', sql: 'SELECT 1' });
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('不要直接给出完整答案');
    expect(msgs[1].content).toContain('P');
    expect(msgs[1].content).toContain('SELECT 1');
  });

  it('explain：用户消息含被解释的 SQL', () => {
    const msgs = buildMessages('explain', { sql: 'SELECT * FROM t' });
    expect(msgs[1].content).toContain('SELECT * FROM t');
  });

  it('debug：用户消息含报错信息', () => {
    const msgs = buildMessages('debug', { sql: 'SELECT x', errorMsg: 'column x not found' });
    expect(msgs[1].content).toContain('column x not found');
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run lib/ai/prompts.test.ts`
Expected: FAIL —— 找不到 `@/lib/ai/prompts`。

- [ ] **Step 3: 写实现**

Create `lib/ai/prompts.ts`:
```ts
export type AiAction = 'hint' | 'explain' | 'debug';

export interface AiPayload {
  title?: string;
  prompt?: string;
  sql: string;
  errorMsg?: string;
}

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export function buildMessages(action: AiAction, p: AiPayload): ChatMessage[] {
  if (action === 'hint') {
    return [
      {
        role: 'system',
        content:
          '你是一位 SQL 教练。请给出循序渐进的提示：指出下一步该想什么、或哪里可能不对。' +
          '绝对不要直接给出完整答案或可直接提交的完整 SQL。用中文，2-4 句，简洁。',
      },
      {
        role: 'user',
        content: `题目：${p.title ?? ''}\n要求：${p.prompt ?? ''}\n我目前写的 SQL：\n${p.sql || '(还没写)'}`,
      },
    ];
  }
  if (action === 'explain') {
    return [
      {
        role: 'system',
        content: '你是 SQL 老师。用中文逐步、通俗地解释给初学者这条 SQL 在做什么。简洁，不超过 6 句。',
      },
      { role: 'user', content: `解释这条 SQL：\n${p.sql}` },
    ];
  }
  return [
    {
      role: 'system',
      content:
        '你是 SQL 调试助手。学员的 SQL 报错了，用中文解释报错原因并给出修复方向。' +
        '可以给出关键片段，但不要直接写出整道题的完整答案。简洁。',
    },
    { role: 'user', content: `SQL：\n${p.sql}\n\n报错信息：\n${p.errorMsg ?? '(无)'}` },
  ];
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run lib/ai/prompts.test.ts`
Expected: PASS（3 passed）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: AI 提示词构造"
```

---

## Task 3：DeepSeek 客户端 lib/ai/deepseek.ts

**Files:**
- Create: `lib/ai/deepseek.ts`
- Test: `lib/ai/deepseek.test.ts`

- [ ] **Step 1: 写失败测试（mock 全局 fetch）**

Create `lib/ai/deepseek.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { askDeepSeek } from '@/lib/ai/deepseek';

afterEach(() => vi.unstubAllGlobals());

function stubFetch(impl: (url: string, init: RequestInit) => Response) {
  vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit) => Promise.resolve(impl(url, init))));
}

describe('askDeepSeek', () => {
  it('用 Bearer key + 模型发请求，返回 content', async () => {
    let seen: any = {};
    stubFetch((url, init) => {
      seen = { url, init };
      return new Response(JSON.stringify({ choices: [{ message: { content: '答案' } }] }), { status: 200 });
    });
    const out = await askDeepSeek([{ role: 'user', content: 'hi' }], { apiKey: 'sk-x', model: 'deepseek-v4-pro' });
    expect(out).toBe('答案');
    expect(seen.url).toContain('api.deepseek.com');
    expect(seen.init.headers.Authorization).toBe('Bearer sk-x');
    expect(JSON.parse(seen.init.body).model).toBe('deepseek-v4-pro');
  });

  it('HTTP 非 2xx 抛错', async () => {
    stubFetch(() => new Response('boom', { status: 500 }));
    await expect(askDeepSeek([{ role: 'user', content: 'hi' }], { apiKey: 'sk-x' })).rejects.toThrow();
  });

  it('content 为空抛错', async () => {
    stubFetch(() => new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 }));
    await expect(askDeepSeek([{ role: 'user', content: 'hi' }], { apiKey: 'sk-x' })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run lib/ai/deepseek.test.ts`
Expected: FAIL —— 找不到 `@/lib/ai/deepseek`。

- [ ] **Step 3: 写实现**

Create `lib/ai/deepseek.ts`:
```ts
import type { ChatMessage } from './prompts';

const ENDPOINT = 'https://api.deepseek.com/chat/completions';

export interface DeepSeekOpts {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export async function askDeepSeek(messages: ChatMessage[], opts: DeepSeekOpts): Promise<string> {
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model ?? 'deepseek-v4-pro',
      messages,
      max_tokens: opts.maxTokens ?? 1024,
      stream: false,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`DeepSeek ${resp.status}: ${text.slice(0, 200)}`);
  }
  const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
  // 只取最终答案 content，绝不返回 reasoning_content。
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('DeepSeek 返回空内容');
  return content;
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run lib/ai/deepseek.test.ts`
Expected: PASS（3 passed）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: DeepSeek 客户端(OpenAI 兼容,仅取 content)"
```

---

## Task 4：限流 lib/ai/ratelimit.ts

**Files:**
- Create: `lib/ai/ratelimit.ts`
- Test: `lib/ai/ratelimit.test.ts`

- [ ] **Step 1: 写失败测试（fake KV）**

Create `lib/ai/ratelimit.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { checkRateLimit, type KVLike } from '@/lib/ai/ratelimit';

function fakeKV(): KVLike {
  const m = new Map<string, string>();
  return {
    get: async (k) => m.get(k) ?? null,
    put: async (k, v) => void m.set(k, v),
  };
}

describe('checkRateLimit', () => {
  it('未超额放行并递减剩余', async () => {
    const kv = fakeKV();
    const a = await checkRateLimit(kv, 'ip1', '2026-06-15', 2);
    expect(a).toEqual({ allowed: true, remaining: 1 });
    const b = await checkRateLimit(kv, 'ip1', '2026-06-15', 2);
    expect(b).toEqual({ allowed: true, remaining: 0 });
  });

  it('超额拒绝', async () => {
    const kv = fakeKV();
    await checkRateLimit(kv, 'ip1', '2026-06-15', 1);
    const c = await checkRateLimit(kv, 'ip1', '2026-06-15', 1);
    expect(c.allowed).toBe(false);
  });

  it('不同 IP / 不同天 互不影响', async () => {
    const kv = fakeKV();
    await checkRateLimit(kv, 'ip1', '2026-06-15', 1);
    expect((await checkRateLimit(kv, 'ip2', '2026-06-15', 1)).allowed).toBe(true);
    expect((await checkRateLimit(kv, 'ip1', '2026-06-16', 1)).allowed).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run lib/ai/ratelimit.test.ts`
Expected: FAIL —— 找不到 `@/lib/ai/ratelimit`。

- [ ] **Step 3: 写实现**

Create `lib/ai/ratelimit.ts`:
```ts
export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface RateResult {
  allowed: boolean;
  remaining: number;
}

export async function checkRateLimit(
  kv: KVLike,
  ip: string,
  day: string,
  limit: number,
): Promise<RateResult> {
  const key = `rl:${ip}:${day}`;
  const cur = parseInt((await kv.get(key)) ?? '0', 10) || 0;
  if (cur >= limit) return { allowed: false, remaining: 0 };
  await kv.put(key, String(cur + 1), { expirationTtl: 60 * 60 * 26 });
  return { allowed: true, remaining: limit - cur - 1 };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run lib/ai/ratelimit.test.ts`
Expected: PASS（3 passed）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: AI 调用按 IP 每日限流"
```

---

## Task 5：API 路由 app/api/ai/route.ts

**Files:**
- Create: `app/api/ai/route.ts`

> 该路由用 `getCloudflareContext()` 取绑定，难做纯单测；逻辑都委托给已测的 lib，路由本身靠 Task 7 的真实 E2E 验证。

- [ ] **Step 1: 写路由**

Create `app/api/ai/route.ts`:
```ts
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { buildMessages, type AiAction } from '@/lib/ai/prompts';
import { askDeepSeek } from '@/lib/ai/deepseek';
import { checkRateLimit } from '@/lib/ai/ratelimit';
import { getExerciseById } from '@/content/exercises';

const ACTIONS: AiAction[] = ['hint', 'explain', 'debug'];
const DAILY_LIMIT = 40;

export async function POST(req: Request) {
  let body: { action?: string; exerciseId?: string; sql?: string; errorMsg?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 });
  }

  const action = body.action as AiAction;
  if (!ACTIONS.includes(action)) {
    return Response.json({ error: '未知操作' }, { status: 400 });
  }
  if (action !== 'hint' && !body.sql?.trim()) {
    return Response.json({ error: '请先写点 SQL' }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI 暂未配置' }, { status: 503 });
  }

  if (env.AI_RATELIMIT) {
    const ip = req.headers.get('cf-connecting-ip') ?? 'anon';
    const day = new Date().toISOString().slice(0, 10);
    const rl = await checkRateLimit(env.AI_RATELIMIT, ip, day, DAILY_LIMIT);
    if (!rl.allowed) {
      return Response.json({ error: '今天的 AI 次数用完了，明天再来吧' }, { status: 429 });
    }
  }

  const ex = body.exerciseId ? getExerciseById(body.exerciseId) : undefined;
  const messages = buildMessages(action, {
    title: ex?.title,
    prompt: ex?.prompt,
    sql: body.sql ?? '',
    errorMsg: body.errorMsg,
  });

  try {
    const reply = await askDeepSeek(messages, {
      apiKey,
      model: env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
    });
    return Response.json({ reply });
  } catch (e) {
    return Response.json(
      { error: 'AI 调用失败：' + (e instanceof Error ? e.message : String(e)) },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 2: 类型检查（构建）**

Run: `npx tsc --noEmit`（或 `npm run build` 的 TS 阶段）
Expected: 无类型错误。若 `env.*` 报类型错，确认 `cloudflare-env.d.ts` 在 tsconfig include 范围内。

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: /api/ai 路由(限流+DeepSeek)"
```

---

## Task 6：AI 面板 AiCopilot + 接入练习场

**Files:**
- Create: `components/AiCopilot.tsx`, `components/AiCopilot.test.tsx`
- Modify: `components/Playground.tsx`

- [ ] **Step 1: 写失败测试（mock fetch）**

Create `components/AiCopilot.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiCopilot } from '@/components/AiCopilot';

afterEach(() => vi.unstubAllGlobals());

describe('AiCopilot', () => {
  it('点"给点提示"调 /api/ai 并展示回复', async () => {
    let seen: any = null;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit) => {
        seen = { url, body: JSON.parse(init.body as string) };
        return Promise.resolve(new Response(JSON.stringify({ reply: '试试 GROUP BY' }), { status: 200 }));
      }),
    );
    render(<AiCopilot exerciseId="m1-01" getSql={() => 'SELECT 1'} getError={() => null} />);
    fireEvent.click(screen.getByRole('button', { name: /提示/ }));
    await waitFor(() => expect(screen.getByText('试试 GROUP BY')).toBeInTheDocument());
    expect(seen.url).toBe('/api/ai');
    expect(seen.body).toMatchObject({ action: 'hint', exerciseId: 'm1-01', sql: 'SELECT 1' });
  });

  it('出错时显示错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: '次数用完了' }), { status: 429 }))),
    );
    render(<AiCopilot exerciseId="m1-01" getSql={() => 'x'} getError={() => null} />);
    fireEvent.click(screen.getByRole('button', { name: /解释/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('次数用完了'));
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run components/AiCopilot.test.tsx`
Expected: FAIL —— 找不到 `@/components/AiCopilot`。

- [ ] **Step 3: 写实现**

Create `components/AiCopilot.tsx`:
```tsx
'use client';
import { useState } from 'react';
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

  const btn = 'rounded bg-slate-800 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-50';
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 p-4">
      <p className="mb-2 text-xs text-slate-500">AI 副驾（DeepSeek）</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => ask('hint')} disabled={!!loading} className={btn}>
          {loading === 'hint' ? '思考中…' : '💡 给点提示'}
        </button>
        <button onClick={() => ask('explain')} disabled={!!loading} className={btn}>
          {loading === 'explain' ? '思考中…' : '🔍 解释这条 SQL'}
        </button>
        <button onClick={() => ask('debug')} disabled={!!loading} className={btn}>
          {loading === 'debug' ? '思考中…' : '🐞 为什么报错'}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-400">{error}</p>}
      {reply && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{reply}</p>}
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run components/AiCopilot.test.tsx`
Expected: PASS（2 passed）。

- [ ] **Step 5: 接入 Playground**

修改 `components/Playground.tsx`：顶部加
```tsx
import { AiCopilot } from './AiCopilot';
```
在 `return (...)` 的最外层 `<div className="space-y-4">` 内、结果展示之后（`{result?.actual && <ResultTable .../>}` 这一行之后）加：
```tsx
      <AiCopilot
        exerciseId={exercise.id}
        getSql={() => code}
        getError={() =>
          error ?? (result && !result.verdict.passed ? result.verdict.reason ?? null : null)
        }
      />
```

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: AI 副驾面板并接入练习场"
```

---

## Task 7：设密钥 + 部署 + 真实 E2E

**Files:** 无（配置、部署、验证）

- [ ] **Step 1: 全量测试 + 构建**

Run: `npm test && npm run build`
Expected: 全过；构建出现 `/api/ai` 路由（ƒ Dynamic）。

- [ ] **Step 2: 设生产密钥**

Run（从 .dev.vars 读，避免回显）：
```bash
cd /home/ubuntu/sql-dojo
export $(grep DEEPSEEK_API_KEY .dev.vars)
echo "$DEEPSEEK_API_KEY" | npx wrangler secret put DEEPSEEK_API_KEY
```
Expected: Success（密钥写入 Worker，不进代码库）。

- [ ] **Step 3: 部署**

Run: `npm run deploy`
Expected: 输出 `https://sql-dojo.pp-account.workers.dev`。

- [ ] **Step 4: 线上真实验证 AI**

curl 三个动作各打一次（真实调用 DeepSeek）：
```bash
U=https://sql-dojo.pp-account.workers.dev
curl -s "$U/api/ai" -H 'Content-Type: application/json' \
  -d '{"action":"explain","sql":"SELECT * FROM users"}' | head -c 400; echo
curl -s "$U/api/ai" -H 'Content-Type: application/json' \
  -d '{"action":"hint","exerciseId":"m2-01","sql":"SELECT 1"}' | head -c 400; echo
```
Expected: 各返回 `{"reply":"...中文..."}`（非空）。再写 `/tmp/e2e_phase4.py`：打开 `/exercise/m1-01` → 点"解释这条 SQL" → 等非空回复出现（`text=思考中…` 消失、出现 AI 文本）。指向生产 URL 跑通。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "chore: Phase 4 AI 副驾上线(DeepSeek)"
```

---

## 自检（Spec 覆盖 / 占位符 / 类型一致性）

**Spec 覆盖（对照 §5.3 AI 集成、§8.3 AI 副驾）：**
- §8.3 三动作（提示不给答案 / 解释 / 报错）→ Task 2 提示词 + Task 6 面板 ✅
- §5.3 服务端密钥、限流（KV）、模型可配 → Task 1/4/5 ✅（密钥仅服务端 secret，模型 `DEEPSEEK_MODEL` 默认 v4-pro 可改 flash）
- §5.3 原文为 Claude/Haiku → **改为用户指定的 DeepSeek `deepseek-v4-pro`（OpenAI 兼容）**，已在架构说明此偏差与理由（中文受众访问性/成本）。
- 深度批改 / Vibe Challenge（§8.4）→ 不在本计划（属更后续）。

**占位符扫描：** 纯逻辑任务（prompts/deepseek/ratelimit/AiCopilot）均给完整代码+测试；路由给完整代码（靠真实 E2E 验证，已说明原因）；`<KV_ID>` 是执行 Step 1 后才有的真实值，已注明从命令输出填入——非占位符遗漏。✅

**类型一致性：** `AiAction`/`ChatMessage`/`AiPayload`（Task 2）被 deepseek、route、AiCopilot 一致引用；`KVLike`（Task 4）被 route 与 `cloudflare-env.d.ts` 引用；`askDeepSeek`/`buildMessages`/`checkRateLimit`/`getExerciseById` 名称一致。✅

**交付物（Plan 4 完成时）：** 练习场内可一键找 AI 要提示/解释/查错，DeepSeek `deepseek-v4-pro` 驱动、密钥仅服务端、按 IP 每日限流，已上线。至此 spec 四阶段（练习场 / 课程路线图 / 游客进度 / AI 副驾）全部交付。
