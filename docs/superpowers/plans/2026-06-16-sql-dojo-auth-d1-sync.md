# 登录 + D1 云同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 SQL 道场加邮箱 OTP 登录 + 把游客 localStorage 进度同步到 D1，实现跨设备/换浏览器进度不丢。

**Architecture:** 邮箱 OTP（复用 lakebbs-mail 发信）+ 无状态 HMAC 会话 cookie；D1 存 users/login_codes/progress；Worker 服务端 API 路由用 `getCloudflareContext().env` 取绑定；客户端进度 store 从纯 localStorage 升级为"本地缓存 + 登录后并集云同步"，对外 API 不变。纯逻辑（HMAC/验证码判定/合并）抽成可单测纯函数，D1/路由保持薄壳，集成靠真浏览器 E2E。

**Tech Stack:** Next.js 16（App Router, route handlers）、OpenNext Cloudflare、D1、KV、Web Crypto（HMAC-SHA256）、Vitest（TDD）。

参考 spec：`docs/superpowers/specs/2026-06-16-sql-dojo-auth-d1-sync-design.md`

---

## File Structure

**新建：**
- `migrations/0001_auth.sql` — D1 建表
- `lib/auth/session.ts` / `.test.ts` — HMAC 会话签发/验签（纯）
- `lib/auth/code.ts` / `.test.ts` — 验证码生成 + `evaluateCode` + `isValidEmail`（纯）
- `lib/auth/email.ts` / `.test.ts` — `buildOtpEmail(code)`（纯）
- `lib/auth/cookie.ts` — cookie 名/属性/读会话 helper
- `lib/mail/send.ts` / `.test.ts` — 调 lakebbs-mail `/send`
- `lib/db/d1.ts` — D1 查询 helper（IO，薄）
- `lib/progress/merge.ts` / `.test.ts` — `mergeIds` 并集（纯）
- `lib/progress/sync.ts` — 客户端引导同步
- `lib/auth/useSession.ts` — 客户端会话 hook
- `components/ProgressSync.tsx` — 挂载即触发 bootstrap 的客户端孤岛
- `components/AuthBadge.tsx` — 顶栏登录态角标
- `app/login/page.tsx` — 登录页
- `app/api/auth/request-code/route.ts`
- `app/api/auth/verify/route.ts`
- `app/api/auth/me/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/progress/route.ts`（GET + POST）
- `app/api/progress/sync/route.ts`

**修改：**
- `lib/progress/store.ts` — 加 `setAll` / `setAuthed` / 后台 `pushCloud`
- `app/layout.tsx` — 挂 `<AuthBadge/>` + `<ProgressSync/>`
- `app/me/page.tsx` — 登录态显示
- `wrangler.jsonc` — 加 `d1_databases`、`vars.MAIL_API_URL`
- `cloudflare-env.d.ts` — 加 DB/SESSION_SECRET/MAIL_API_URL/MAIL_API_SECRET
- `.dev.vars`（gitignored）— SESSION_SECRET、MAIL_API_SECRET
- `package.json` — 加 devDep `@cloudflare/workers-types`

约定：测试 `npx vitest run <file>`；提交信息中文、**不带 Co-Authored-By**（仓库身份 YSKM523）。

---

## Task 1: 基础设施（依赖 + D1 + 迁移 + 绑定 + env 类型）

**Files:**
- Modify: `package.json`（devDep）
- Create: `migrations/0001_auth.sql`
- Modify: `wrangler.jsonc`
- Modify: `cloudflare-env.d.ts`

- [ ] **Step 1: 装 workers-types**

Run: `cd /home/ubuntu/sql-dojo && npm i -D @cloudflare/workers-types`
Expected: 安装成功，package.json devDependencies 出现 `@cloudflare/workers-types`。

- [ ] **Step 2: 写迁移文件**

Create `migrations/0001_auth.sql`:

```sql
-- 用户
CREATE TABLE users (
  id           TEXT PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at   INTEGER NOT NULL
);

-- 登录验证码
CREATE TABLE login_codes (
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed   INTEGER NOT NULL DEFAULT 0,
  attempts   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_login_codes_email ON login_codes (email);

-- 通关进度
CREATE TABLE progress (
  user_id     TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  status      TEXT NOT NULL,
  passed_at   INTEGER,
  PRIMARY KEY (user_id, exercise_id)
);
```

- [ ] **Step 3: 创建 D1 数据库**

Run: `cd /home/ubuntu/sql-dojo && npx wrangler d1 create sql-dojo`
Expected: 输出含 `database_id`。**记下该 id**（下一步填入 wrangler.jsonc）。若已存在则 `npx wrangler d1 list` 取其 id。

- [ ] **Step 4: 在 wrangler.jsonc 加 D1 绑定与 MAIL_API_URL**

Modify `wrangler.jsonc` —— 把 `vars` 改为含 `MAIL_API_URL`，并新增 `d1_databases`（`<DB_ID>` 用上一步的 id；`<MAIL_URL>` 见 Task 15 解析，先填占位）：

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "sql-dojo",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-09-23",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "vars": {
    "DEEPSEEK_MODEL": "deepseek-v4-pro",
    "MAIL_API_URL": "<MAIL_URL>"
  },
  "kv_namespaces": [{ "binding": "AI_RATELIMIT", "id": "0ec4428ec0934cad979b14c314d76ce0" }],
  "d1_databases": [
    { "binding": "DB", "database_name": "sql-dojo", "database_id": "<DB_ID>" }
  ]
}
```

- [ ] **Step 5: 本地应用迁移**

Run: `cd /home/ubuntu/sql-dojo && npx wrangler d1 migrations apply sql-dojo --local`
Expected: 报告 0001_auth.sql 应用成功（创建 3 表）。（若提示 migrations_dir，确认默认 `./migrations`。）

- [ ] **Step 6: 扩展 env 类型**

Replace `cloudflare-env.d.ts` 全文：

```ts
interface CloudflareEnv {
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
  AI_RATELIMIT?: import('@/lib/ai/ratelimit').KVLike;
  DB?: import('@cloudflare/workers-types').D1Database;
  SESSION_SECRET?: string;
  MAIL_API_URL?: string;
  MAIL_API_SECRET?: string;
}
```

- [ ] **Step 7: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add package.json package-lock.json migrations/0001_auth.sql wrangler.jsonc cloudflare-env.d.ts
git commit -m "chore: D1 绑定+迁移+env 类型(登录/进度基础设施)"
```

---

## Task 2: HMAC 会话（纯函数，TDD）

**Files:**
- Create: `lib/auth/session.ts`
- Test: `lib/auth/session.test.ts`

- [ ] **Step 1: 写失败测试**

Create `lib/auth/session.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { signSession, verifySession, type SessionPayload } from '@/lib/auth/session';

const SECRET = 'test-secret-please-change';
const base: SessionPayload = { uid: 'u1', email: 'a@b.com', exp: 2_000_000_000_000 };

describe('session HMAC', () => {
  it('签发后能验回原 payload', async () => {
    const token = await signSession(base, SECRET);
    const got = await verifySession(token, SECRET, 1_000);
    expect(got).toEqual(base);
  });

  it('换密钥验签失败', async () => {
    const token = await signSession(base, SECRET);
    expect(await verifySession(token, 'other-secret', 1_000)).toBeNull();
  });

  it('篡改 payload 验签失败', async () => {
    const token = await signSession(base, SECRET);
    const [, sig] = token.split('.');
    const forged = btoa('{"uid":"hacker","email":"x","exp":2000000000000}')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + '.' + sig;
    expect(await verifySession(forged, SECRET, 1_000)).toBeNull();
  });

  it('过期则验签失败', async () => {
    const token = await signSession({ ...base, exp: 5_000 }, SECRET);
    expect(await verifySession(token, SECRET, 10_000)).toBeNull();
  });

  it('垃圾串返回 null', async () => {
    expect(await verifySession('not-a-token', SECRET, 1_000)).toBeNull();
    expect(await verifySession('', SECRET, 1_000)).toBeNull();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/auth/session.test.ts`
Expected: FAIL（找不到模块 `@/lib/auth/session`）。

- [ ] **Step 3: 实现**

Create `lib/auth/session.ts`:

```ts
// 无状态 HMAC-SHA256 会话令牌：`${base64url(payload)}.${base64url(hmac)}`。
// 用 Web Crypto，Worker 与 Node 测试环境通用。
const enc = new TextEncoder();
const dec = new TextDecoder();

export interface SessionPayload {
  uid: string;
  email: string;
  exp: number; // epoch ms
}

function b64urlBytes(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlStr(str: string): string {
  return b64urlBytes(enc.encode(str));
}

function unb64urlStr(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return dec.decode(bytes);
}

async function hmac(payloadB64: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  return b64urlBytes(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const p = b64urlStr(JSON.stringify(payload));
  const sig = await hmac(p, secret);
  return `${p}.${sig}`;
}

export async function verifySession(
  token: string,
  secret: string,
  now: number,
): Promise<SessionPayload | null> {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const p = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(p, secret);
  if (!timingSafeEqual(sig, expected)) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(unb64urlStr(p));
  } catch {
    return null;
  }
  if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
  if (typeof payload.uid !== 'string' || typeof payload.email !== 'string') return null;
  return payload;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/auth/session.test.ts`
Expected: PASS（5 个用例）。

- [ ] **Step 5: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add lib/auth/session.ts lib/auth/session.test.ts
git commit -m "feat: 无状态 HMAC 会话签发/验签"
```

---

## Task 3: 验证码逻辑 + 邮箱校验（纯函数，TDD）

**Files:**
- Create: `lib/auth/code.ts`
- Test: `lib/auth/code.test.ts`

- [ ] **Step 1: 写失败测试**

Create `lib/auth/code.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateCode, evaluateCode, isValidEmail, MAX_CODE_ATTEMPTS } from '@/lib/auth/code';

describe('generateCode', () => {
  it('生成 6 位数字串', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe('isValidEmail', () => {
  it('接受正常邮箱', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
    expect(isValidEmail('x.y+z@sub.domain.cn')).toBe(true);
  });
  it('拒绝非法邮箱', () => {
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@')).toBe(false);
    expect(isValidEmail('@b.com')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('evaluateCode', () => {
  const now = 1_000_000;
  const fresh = { code: '123456', expiresAt: now + 1000, consumed: 0, attempts: 0 };

  it('正确码返回 ok', () => {
    expect(evaluateCode(fresh, '123456', now)).toBe('ok');
  });
  it('错码返回 wrong', () => {
    expect(evaluateCode(fresh, '000000', now)).toBe('wrong');
  });
  it('过期返回 expired', () => {
    expect(evaluateCode({ ...fresh, expiresAt: now - 1 }, '123456', now)).toBe('expired');
  });
  it('已用返回 consumed', () => {
    expect(evaluateCode({ ...fresh, consumed: 1 }, '123456', now)).toBe('consumed');
  });
  it('试次用尽返回 exhausted', () => {
    expect(evaluateCode({ ...fresh, attempts: MAX_CODE_ATTEMPTS }, '123456', now)).toBe('exhausted');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/auth/code.test.ts`
Expected: FAIL（找不到模块）。

- [ ] **Step 3: 实现**

Create `lib/auth/code.ts`:

```ts
export const MAX_CODE_ATTEMPTS = 5;

export type CodeVerdict = 'ok' | 'wrong' | 'expired' | 'consumed' | 'exhausted';

export function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, '0');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function evaluateCode(
  row: { code: string; expiresAt: number; consumed: number; attempts: number },
  input: string,
  now: number,
): CodeVerdict {
  if (row.consumed) return 'consumed';
  if (row.attempts >= MAX_CODE_ATTEMPTS) return 'exhausted';
  if (now >= row.expiresAt) return 'expired';
  return input === row.code ? 'ok' : 'wrong';
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/auth/code.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add lib/auth/code.ts lib/auth/code.test.ts
git commit -m "feat: 验证码生成/判定 + 邮箱校验"
```

---

## Task 4: OTP 邮件构造（纯函数，TDD）

**Files:**
- Create: `lib/auth/email.ts`
- Test: `lib/auth/email.test.ts`

- [ ] **Step 1: 写失败测试**

Create `lib/auth/email.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildOtpEmail } from '@/lib/auth/email';

describe('buildOtpEmail', () => {
  it('主题/正文都含验证码与品牌', () => {
    const m = buildOtpEmail('246813');
    expect(m.subject).toContain('246813');
    expect(m.subject).toContain('SQL 道场');
    expect(m.text).toContain('246813');
    expect(m.text).toContain('SQL 道场');
    expect(m.html).toContain('246813');
    expect(m.html).toContain('SQL 道场');
  });

  it('html 不含 CSS 渐变', () => {
    const m = buildOtpEmail('111111');
    expect(m.html.toLowerCase()).not.toContain('gradient');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/auth/email.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现**

Create `lib/auth/email.ts`（纯色、无渐变，遵全局偏好）：

```ts
export interface MailContent {
  subject: string;
  html: string;
  text: string;
}

export function buildOtpEmail(code: string): MailContent {
  const subject = `SQL 道场登录验证码：${code}`;
  const text =
    `你的 SQL 道场登录验证码是 ${code}，10 分钟内有效。\n` +
    `如果不是你本人操作，忽略本邮件即可。`;
  const html =
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;` +
    `max-width:480px;margin:0 auto;padding:24px;color:#0f172a;background:#ffffff">` +
    `<h2 style="margin:0 0 12px;color:#0f172a">SQL 道场</h2>` +
    `<p style="margin:0 0 16px;color:#334155">你的登录验证码：</p>` +
    `<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:0 0 16px;` +
    `color:#0f172a;background:#f1f5f9;padding:12px 16px;border-radius:8px;text-align:center">` +
    `${code}</p>` +
    `<p style="margin:0;color:#64748b;font-size:13px">10 分钟内有效。若非本人操作，忽略本邮件即可。</p>` +
    `</div>`;
  return { subject, html, text };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/auth/email.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add lib/auth/email.ts lib/auth/email.test.ts
git commit -m "feat: OTP 验证码邮件构造(纯色无渐变)"
```

---

## Task 5: 发信客户端（调 lakebbs-mail）

**Files:**
- Create: `lib/mail/send.ts`
- Test: `lib/mail/send.test.ts`

- [ ] **Step 1: 写失败测试（mock fetch）**

Create `lib/mail/send.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendMail } from '@/lib/mail/send';

const env = { MAIL_API_URL: 'https://mail.example.com', MAIL_API_SECRET: 'secret' };
const msg = { to: 'a@b.com', subject: 's', html: '<p>h</p>', text: 't' };

afterEach(() => vi.restoreAllMocks());

describe('sendMail', () => {
  it('POST 到 /send 带 Bearer 与 body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"messageId":"x"}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await sendMail(env, msg);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://mail.example.com/send');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer secret');
    expect(JSON.parse(init.body as string)).toMatchObject(msg);
  });

  it('非 2xx 抛错', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 502 })));
    await expect(sendMail(env, msg)).rejects.toThrow(/mail send failed/);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/mail/send.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现**

Create `lib/mail/send.ts`（照搬 lakebbs-next `src/lib/email/send.ts` 范式）：

```ts
export interface MailEnv {
  MAIL_API_URL: string;
  MAIL_API_SECRET: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** 调 lakebbs-mail worker 的 POST /send 发一封事务邮件。失败抛错。 */
export async function sendMail(env: MailEnv, msg: MailMessage): Promise<void> {
  const res = await fetch(`${env.MAIL_API_URL}/send`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.MAIL_API_SECRET}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(msg),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`mail send failed: ${res.status} ${detail}`);
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/mail/send.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add lib/mail/send.ts lib/mail/send.test.ts
git commit -m "feat: 发信客户端(调 lakebbs-mail /send)"
```

---

## Task 6: D1 查询 helper（IO 薄壳）

**Files:**
- Create: `lib/db/d1.ts`

> 说明：D1 IO 不做单测（无活库），靠 Task 16 E2E 验证；本任务只保证类型/SQL 正确并能编译。

- [ ] **Step 1: 实现**

Create `lib/db/d1.ts`:

```ts
import type { D1Database } from '@cloudflare/workers-types';

export interface DbUser {
  id: string;
  email: string;
  display_name: string | null;
}

export async function upsertUserByEmail(
  db: D1Database,
  email: string,
  now: number,
): Promise<DbUser> {
  const existing = await db
    .prepare('SELECT id, email, display_name FROM users WHERE email = ?')
    .bind(email)
    .first<DbUser>();
  if (existing) return existing;
  const id = crypto.randomUUID();
  await db
    .prepare('INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, NULL, ?)')
    .bind(id, email, now)
    .run();
  return { id, email, display_name: null };
}

export async function insertLoginCode(
  db: D1Database,
  email: string,
  code: string,
  expiresAt: number,
  now: number,
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO login_codes (email, code, expires_at, consumed, attempts, created_at) VALUES (?, ?, ?, 0, 0, ?)',
    )
    .bind(email, code, expiresAt, now)
    .run();
}

export interface CodeRow {
  rowid: number;
  code: string;
  expires_at: number;
  consumed: number;
  attempts: number;
}

export async function latestCode(db: D1Database, email: string): Promise<CodeRow | null> {
  return db
    .prepare(
      'SELECT rowid, code, expires_at, consumed, attempts FROM login_codes WHERE email = ? ORDER BY created_at DESC, rowid DESC LIMIT 1',
    )
    .bind(email)
    .first<CodeRow>();
}

export async function bumpCodeAttempts(db: D1Database, rowid: number): Promise<void> {
  await db.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE rowid = ?').bind(rowid).run();
}

export async function consumeCode(db: D1Database, rowid: number): Promise<void> {
  await db.prepare('UPDATE login_codes SET consumed = 1 WHERE rowid = ?').bind(rowid).run();
}

export async function listProgress(db: D1Database, userId: string): Promise<string[]> {
  const rs = await db
    .prepare('SELECT exercise_id FROM progress WHERE user_id = ?')
    .bind(userId)
    .all<{ exercise_id: string }>();
  return (rs.results ?? []).map((r) => r.exercise_id);
}

export async function upsertProgress(
  db: D1Database,
  userId: string,
  exerciseId: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO progress (user_id, exercise_id, status, passed_at) VALUES (?, ?, 'passed', ?) ON CONFLICT(user_id, exercise_id) DO NOTHING",
    )
    .bind(userId, exerciseId, now)
    .run();
}

export async function mergeProgress(
  db: D1Database,
  userId: string,
  ids: string[],
  now: number,
): Promise<string[]> {
  if (ids.length) {
    const stmt = db.prepare(
      "INSERT INTO progress (user_id, exercise_id, status, passed_at) VALUES (?, ?, 'passed', ?) ON CONFLICT(user_id, exercise_id) DO NOTHING",
    );
    await db.batch(ids.map((id) => stmt.bind(userId, id, now)));
  }
  return listProgress(db, userId);
}
```

- [ ] **Step 2: 类型检查**

Run: `cd /home/ubuntu/sql-dojo && npx tsc --noEmit`
Expected: 无与 `lib/db/d1.ts` 相关的报错。（项目若无独立 tsc 脚本，此命令用 tsconfig 默认配置即可。）

- [ ] **Step 3: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add lib/db/d1.ts
git commit -m "feat: D1 查询 helper(users/login_codes/progress)"
```

---

## Task 7: cookie helper

**Files:**
- Create: `lib/auth/cookie.ts`

- [ ] **Step 1: 实现**

Create `lib/auth/cookie.ts`:

```ts
import type { NextRequest } from 'next/server';
import { verifySession, type SessionPayload } from './session';

export const COOKIE_NAME = 'sdsess';

interface CookieSpec {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}

export function sessionCookie(value: string, maxAgeSec: number): CookieSpec {
  return {
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec,
  };
}

export function clearCookie(): CookieSpec {
  return { ...sessionCookie('', 0) };
}

export async function readSession(
  req: NextRequest,
  secret: string,
): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token, secret, Date.now());
}
```

- [ ] **Step 2: 类型检查**

Run: `cd /home/ubuntu/sql-dojo && npx tsc --noEmit`
Expected: 无 `lib/auth/cookie.ts` 相关报错。

- [ ] **Step 3: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add lib/auth/cookie.ts
git commit -m "feat: 会话 cookie helper(读/写/清)"
```

---

## Task 8: 认证路由

> Next 16 route handler。写前快速核对 cookie API：`node_modules/next/dist/docs/`（或确认 `NextResponse.cookies.set(spec)` 接受单对象形式）。本任务用 `NextRequest`/`NextResponse`。

**Files:**
- Create: `app/api/auth/request-code/route.ts`
- Create: `app/api/auth/verify/route.ts`
- Create: `app/api/auth/me/route.ts`
- Create: `app/api/auth/logout/route.ts`

- [ ] **Step 1: request-code**

Create `app/api/auth/request-code/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { checkRateLimit } from '@/lib/ai/ratelimit';
import { generateCode, isValidEmail } from '@/lib/auth/code';
import { buildOtpEmail } from '@/lib/auth/email';
import { sendMail } from '@/lib/mail/send';
import { insertLoginCode } from '@/lib/db/d1';

const CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_DAILY = 8;
const IP_DAILY = 30;

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
  const email = (body.email ?? '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: '邮箱格式不对' }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  if (!env.DB || !env.MAIL_API_URL || !env.MAIL_API_SECRET) {
    return NextResponse.json({ error: '登录暂未配置' }, { status: 503 });
  }

  if (env.AI_RATELIMIT) {
    const ip = req.headers.get('cf-connecting-ip') ?? 'anon';
    const day = new Date().toISOString().slice(0, 10);
    const a = await checkRateLimit(env.AI_RATELIMIT, 'otp-email:' + email, day, EMAIL_DAILY);
    const b = await checkRateLimit(env.AI_RATELIMIT, 'otp-ip:' + ip, day, IP_DAILY);
    if (!a.allowed || !b.allowed) {
      return NextResponse.json({ error: '验证码发送太频繁，请稍后再试' }, { status: 429 });
    }
  }

  const code = generateCode();
  const now = Date.now();
  await insertLoginCode(env.DB, email, code, now + CODE_TTL_MS, now);
  try {
    await sendMail(
      { MAIL_API_URL: env.MAIL_API_URL, MAIL_API_SECRET: env.MAIL_API_SECRET },
      { to: email, ...buildOtpEmail(code) },
    );
  } catch {
    return NextResponse.json({ error: '验证码发送失败，请稍后再试' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: verify**

Create `app/api/auth/verify/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { isValidEmail, evaluateCode, type CodeVerdict } from '@/lib/auth/code';
import { signSession } from '@/lib/auth/session';
import { sessionCookie } from '@/lib/auth/cookie';
import { latestCode, bumpCodeAttempts, consumeCode, upsertUserByEmail } from '@/lib/db/d1';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const VERDICT_MSG: Record<Exclude<CodeVerdict, 'ok'>, string> = {
  wrong: '验证码不对',
  expired: '验证码已过期，请重新获取',
  consumed: '验证码已用过，请重新获取',
  exhausted: '尝试次数太多，请重新获取',
};

export async function POST(req: NextRequest) {
  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
  const email = (body.email ?? '').trim().toLowerCase();
  const code = (body.code ?? '').trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: '邮箱或验证码格式不对' }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  if (!env.DB || !env.SESSION_SECRET) {
    return NextResponse.json({ error: '登录暂未配置' }, { status: 503 });
  }

  const now = Date.now();
  const row = await latestCode(env.DB, email);
  if (!row) {
    return NextResponse.json({ error: '请先获取验证码' }, { status: 400 });
  }
  const verdict = evaluateCode(
    { code: row.code, expiresAt: row.expires_at, consumed: row.consumed, attempts: row.attempts },
    code,
    now,
  );
  if (verdict !== 'ok') {
    if (verdict === 'wrong') await bumpCodeAttempts(env.DB, row.rowid);
    return NextResponse.json({ error: VERDICT_MSG[verdict] }, { status: 400 });
  }

  await consumeCode(env.DB, row.rowid);
  const user = await upsertUserByEmail(env.DB, email, now);
  const token = await signSession(
    { uid: user.id, email: user.email, exp: now + SESSION_TTL_MS },
    env.SESSION_SECRET,
  );
  const res = NextResponse.json({ user: { email: user.email, displayName: user.display_name } });
  res.cookies.set(sessionCookie(token, SESSION_TTL_MS / 1000));
  return res;
}
```

- [ ] **Step 3: me + logout**

Create `app/api/auth/me/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { readSession } from '@/lib/auth/cookie';

export async function GET(req: NextRequest) {
  const { env } = getCloudflareContext();
  if (!env.SESSION_SECRET) return NextResponse.json({ user: null });
  const s = await readSession(req, env.SESSION_SECRET);
  return NextResponse.json({ user: s ? { email: s.email } : null });
}
```

Create `app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { clearCookie } from '@/lib/auth/cookie';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearCookie());
  return res;
}
```

- [ ] **Step 4: 类型检查 + 构建冒烟**

Run: `cd /home/ubuntu/sql-dojo && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 5: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add app/api/auth
git commit -m "feat: 认证路由(request-code/verify/me/logout)"
```

---

## Task 9: 进度合并（纯）+ store 升级

**Files:**
- Create: `lib/progress/merge.ts`
- Test: `lib/progress/merge.test.ts`
- Modify: `lib/progress/store.ts`
- Modify: `lib/progress/store.test.ts`（加 setAll 用例）

- [ ] **Step 1: 写 merge 失败测试**

Create `lib/progress/merge.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mergeIds } from '@/lib/progress/merge';

describe('mergeIds', () => {
  it('并集去重', () => {
    expect(mergeIds(['a', 'b'], ['b', 'c']).sort()).toEqual(['a', 'b', 'c']);
  });
  it('任一为空', () => {
    expect(mergeIds([], ['x']).sort()).toEqual(['x']);
    expect(mergeIds(['y'], []).sort()).toEqual(['y']);
  });
  it('全重叠', () => {
    expect(mergeIds(['a'], ['a']).sort()).toEqual(['a']);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/progress/merge.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现 merge**

Create `lib/progress/merge.ts`:

```ts
/** 本地与云端已通关 id 的并集去重（顺序无关，作为集合）。 */
export function mergeIds(local: readonly string[], remote: readonly string[]): string[] {
  return Array.from(new Set([...remote, ...local]));
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/progress/merge.test.ts`
Expected: PASS。

- [ ] **Step 5: 升级 store（加 setAll / setAuthed / 后台 pushCloud）**

Replace `lib/progress/store.ts` 全文：

```ts
const KEY = 'sqldojo:completed';
// 稳定的空数组引用——useSyncExternalStore 要求 snapshot 在未变化时返回同一引用，
// 否则会触发 "getServerSnapshot should be cached" 警告甚至无限渲染。
const EMPTY: readonly string[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: string[] | null = null;

// 登录态标志：仅在 bootstrapSync 拿到 200 时置真，决定 markCompleted 是否后台推云。
let authed = false;
export function setAuthed(v: boolean): void {
  authed = v;
}

function read(): string[] {
  if (typeof window === 'undefined') return EMPTY as string[];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as string[]) : (EMPTY as string[]);
  } catch {
    cache = EMPTY as string[];
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

// 登录态下把单条通关后台推到云端（尽力而为；失败无妨，下次加载 sync 兜底对账）。
function pushCloud(id: string): void {
  if (!authed || typeof window === 'undefined') return;
  try {
    void fetch('/api/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ exerciseId: id }),
    }).catch(() => {});
  } catch {
    /* 忽略 */
  }
}

export function getCompleted(): string[] {
  return read();
}

export function isCompleted(id: string): boolean {
  return read().includes(id);
}

export function markCompleted(id: string): void {
  const ids = read();
  if (!ids.includes(id)) {
    write([...ids, id]);
    pushCloud(id);
  }
}

export function clearProgress(): void {
  // 仅清本地（设备级语义）；云端清理留作后续显式功能。
  write(EMPTY as string[]);
}

// 整体替换本地缓存并广播（供登录后云同步用）。
export function setAll(ids: string[]): void {
  write(Array.from(new Set(ids)));
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): string[] {
  return read();
}

export function getServerSnapshot(): string[] {
  return EMPTY as string[];
}
```

- [ ] **Step 6: 给 store 测试加 setAll 用例**

在 `lib/progress/store.test.ts` 的 import 里加入 `setAll`，并在 `describe` 末尾追加用例：

将首行 import 块改为同时引入 `setAll`：

```ts
import {
  getCompleted,
  isCompleted,
  markCompleted,
  clearProgress,
  subscribe,
  setAll,
} from '@/lib/progress/store';
```

在最后一个 `it(...)` 之后、`});` 之前插入：

```ts
  it('setAll 整体替换并去重', () => {
    markCompleted('m1-01');
    setAll(['m2-01', 'm2-01', 'm3-01']);
    expect(getCompleted().sort()).toEqual(['m2-01', 'm3-01']);
  });

  it('setAll 触发订阅通知', () => {
    const cb = vi.fn();
    const unsub = subscribe(cb);
    setAll(['m4-01']);
    expect(cb).toHaveBeenCalled();
    unsub();
  });
```

- [ ] **Step 7: 运行 store 测试（含旧用例不回归）**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run lib/progress/store.test.ts lib/progress/merge.test.ts`
Expected: PASS（旧 5 + 新 2 + merge 3）。注意 `authed` 默认 false，旧用例不会触发 fetch。

- [ ] **Step 8: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add lib/progress/merge.ts lib/progress/merge.test.ts lib/progress/store.ts lib/progress/store.test.ts
git commit -m "feat: 进度并集合并 + store 支持云同步(setAll/pushCloud)"
```

---

## Task 10: 进度路由

**Files:**
- Create: `app/api/progress/route.ts`
- Create: `app/api/progress/sync/route.ts`

- [ ] **Step 1: progress GET/POST**

Create `app/api/progress/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { readSession } from '@/lib/auth/cookie';
import { listProgress, upsertProgress } from '@/lib/db/d1';
import { getExerciseById } from '@/content/exercises';

export async function GET(req: NextRequest) {
  const { env } = getCloudflareContext();
  if (!env.DB || !env.SESSION_SECRET) {
    return NextResponse.json({ error: '未配置' }, { status: 503 });
  }
  const s = await readSession(req, env.SESSION_SECRET);
  if (!s) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const ids = await listProgress(env.DB, s.uid);
  return NextResponse.json({ ids });
}

export async function POST(req: NextRequest) {
  const { env } = getCloudflareContext();
  if (!env.DB || !env.SESSION_SECRET) {
    return NextResponse.json({ error: '未配置' }, { status: 503 });
  }
  const s = await readSession(req, env.SESSION_SECRET);
  if (!s) return NextResponse.json({ error: '未登录' }, { status: 401 });
  let body: { exerciseId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
  const id = (body.exerciseId ?? '').trim();
  if (!id || !getExerciseById(id)) {
    return NextResponse.json({ error: '无效 exerciseId' }, { status: 400 });
  }
  await upsertProgress(env.DB, s.uid, id, Date.now());
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: progress/sync**

Create `app/api/progress/sync/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { readSession } from '@/lib/auth/cookie';
import { mergeProgress } from '@/lib/db/d1';
import { getExerciseById } from '@/content/exercises';

export async function POST(req: NextRequest) {
  const { env } = getCloudflareContext();
  if (!env.DB || !env.SESSION_SECRET) {
    return NextResponse.json({ error: '未配置' }, { status: 503 });
  }
  const s = await readSession(req, env.SESSION_SECRET);
  if (!s) return NextResponse.json({ error: '未登录' }, { status: 401 });
  let body: { ids?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const ids = Array.isArray(body.ids)
    ? (body.ids.filter((x) => typeof x === 'string' && getExerciseById(x)) as string[])
    : [];
  const merged = await mergeProgress(env.DB, s.uid, ids, Date.now());
  return NextResponse.json({ ids: merged });
}
```

- [ ] **Step 3: 类型检查**

Run: `cd /home/ubuntu/sql-dojo && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 4: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add app/api/progress
git commit -m "feat: 进度路由(列表/写入/登录时并集同步)"
```

---

## Task 11: 客户端引导同步 + 挂载

**Files:**
- Create: `lib/progress/sync.ts`
- Create: `components/ProgressSync.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: 实现 sync**

Create `lib/progress/sync.ts`:

```ts
import { getCompleted, setAll, setAuthed } from './store';

/** 应用加载时调一次：登录态则把本地 ids 与云端并集合并，写回本地缓存。 */
export async function bootstrapSync(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const local = getCompleted();
    const res = await fetch('/api/progress/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: local }),
    });
    if (res.status === 401) {
      setAuthed(false);
      return; // 游客：保持纯本地
    }
    if (!res.ok) return;
    const data = (await res.json()) as { ids: string[] };
    setAuthed(true);
    setAll(data.ids);
  } catch {
    /* 离线：保留本地 */
  }
}
```

- [ ] **Step 2: 实现 ProgressSync 孤岛**

Create `components/ProgressSync.tsx`:

```tsx
'use client';
import { useEffect } from 'react';
import { bootstrapSync } from '@/lib/progress/sync';

export default function ProgressSync() {
  useEffect(() => {
    void bootstrapSync();
  }, []);
  return null;
}
```

- [ ] **Step 3: 挂到根布局**

Modify `app/layout.tsx` —— import 并在 `<body>` 内渲染（放在 `{children}` 之前）：

在 import 区加：

```tsx
import ProgressSync from "@/components/ProgressSync";
```

把 `<body ...>{children}</body>` 改为：

```tsx
<body className="min-h-full flex flex-col">
  <ProgressSync />
  {children}
</body>
```

- [ ] **Step 4: 构建冒烟**

Run: `cd /home/ubuntu/sql-dojo && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 5: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add lib/progress/sync.ts components/ProgressSync.tsx app/layout.tsx
git commit -m "feat: 登录后进度自动云同步(布局挂载引导孤岛)"
```

---

## Task 12: 会话 hook + 顶栏角标

**Files:**
- Create: `lib/auth/useSession.ts`
- Create: `components/AuthBadge.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: useSession hook**

Create `lib/auth/useSession.ts`:

```ts
'use client';
import { useEffect, useState } from 'react';

export interface SessionUser {
  email: string;
}

export function useSession(): { user: SessionUser | null; loading: boolean } {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d: { user: SessionUser | null }) => {
        if (alive) {
          setUser(d.user ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  return { user, loading };
}
```

- [ ] **Step 2: AuthBadge**

Create `components/AuthBadge.tsx`（纯色、无渐变）：

```tsx
'use client';
import Link from 'next/link';
import { useSession } from '@/lib/auth/useSession';

export default function AuthBadge() {
  const { user, loading } = useSession();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.assign('/'); // 强制刷新，重置全站登录态与进度缓存
  }

  return (
    <div className="flex items-center justify-end gap-3 px-4 py-2 text-sm">
      {loading ? null : user ? (
        <>
          <span className="text-slate-400">{user.email}</span>
          <button onClick={logout} className="rounded border border-slate-700 px-2 py-0.5 text-slate-300">
            退出
          </button>
        </>
      ) : (
        <Link href="/login" className="rounded border border-slate-700 px-2 py-0.5 text-sky-400">
          登录
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 挂到根布局顶部**

Modify `app/layout.tsx` —— import 并放在 `<ProgressSync />` 后、`{children}` 前：

加 import：

```tsx
import AuthBadge from "@/components/AuthBadge";
```

`<body>` 内改为：

```tsx
<body className="min-h-full flex flex-col">
  <ProgressSync />
  <AuthBadge />
  {children}
</body>
```

- [ ] **Step 4: 构建冒烟**

Run: `cd /home/ubuntu/sql-dojo && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 5: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add lib/auth/useSession.ts components/AuthBadge.tsx app/layout.tsx
git commit -m "feat: 顶栏登录态角标 + useSession hook"
```

---

## Task 13: 登录页

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: 实现**

Create `app/login/page.tsx`（两步式，纯色无渐变；成功后 `window.location.assign('/me')` 强制刷新让全站读到登录态）：

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
      window.location.assign('/me'); // 强制刷新：全站读到登录态并触发进度云同步
    } catch {
      setErr('网络错误，请重试');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm space-y-6 px-4 py-16">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">登录 SQL 道场</h1>
        <p className="mt-2 text-sm text-slate-400">用邮箱验证码登录，进度自动跨设备同步。</p>
      </header>

      {step === 'email' ? (
        <form onSubmit={requestCode} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-sky-600 px-3 py-2 font-medium text-white disabled:opacity-50"
          >
            {busy ? '发送中…' : '发送验证码'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <p className="text-sm text-slate-400">
            验证码已发往 <span className="text-slate-200">{email}</span>
          </p>
          <input
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6 位验证码"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 tracking-widest text-slate-100"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-sky-600 px-3 py-2 font-medium text-white disabled:opacity-50"
          >
            {busy ? '验证中…' : '登录'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setCode('');
              setErr(null);
            }}
            className="w-full text-sm text-slate-400"
          >
            ← 换个邮箱
          </button>
        </form>
      )}

      {err ? <p className="text-sm text-rose-400">{err}</p> : null}
    </main>
  );
}
```

- [ ] **Step 2: 构建冒烟**

Run: `cd /home/ubuntu/sql-dojo && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 3: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add app/login/page.tsx
git commit -m "feat: 邮箱 OTP 两步式登录页"
```

---

## Task 14: /me 登录态

**Files:**
- Modify: `app/me/page.tsx`

- [ ] **Step 1: 加登录态区块**

Modify `app/me/page.tsx` —— 在 import 区加：

```tsx
import { useSession } from '@/lib/auth/useSession';
```

在组件体内（`const done = ...` 之后）加：

```tsx
  const { user, loading } = useSession();
```

把 `<header>...</header>` 整块替换为（在标题下方加一行登录态/CTA）：

```tsx
      <header>
        <h1 className="text-2xl font-bold text-slate-100">我的足迹</h1>
        <p className="mt-2 text-slate-300">
          已通关 <span className="font-bold text-emerald-400">{solved}</span> / {total} 题
        </p>
        {!loading &&
          (user ? (
            <p className="mt-1 text-sm text-slate-400">
              已登录 {user.email}· 进度已云端同步
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-400">
              <Link href="/login" className="text-sky-400">
                登录
              </Link>{' '}
              以跨设备保存进度
            </p>
          ))}
      </header>
```

（`Link` 已在文件顶部 import，无需重复。）

- [ ] **Step 2: 构建冒烟**

Run: `cd /home/ubuntu/sql-dojo && npx tsc --noEmit`
Expected: 无报错。

- [ ] **Step 3: 全量单测不回归**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run`
Expected: 全绿（原有 + 本次新增）。

- [ ] **Step 4: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add app/me/page.tsx
git commit -m "feat: /me 显示登录态与跨设备同步提示"
```

---

## Task 15: 密钥/配置接线 + 本地联调

**Files:**
- Modify: `.dev.vars`（gitignored，不提交）
- Modify: `wrangler.jsonc`（填 MAIL_API_URL 真值）

- [ ] **Step 1: 解析 lakebbs-mail 地址与密钥**

Run:
```bash
grep -i MAIL_API_URL /home/ubuntu/lakebbs/lakebbs-next/.dev.vars 2>/dev/null
grep -i MAIL_API_SECRET /home/ubuntu/lakebbs-mail/.dev.vars 2>/dev/null
```
取得 `MAIL_API_URL`（lakebbs-mail 部署地址，如 `https://lakebbs-mail.<acct>.workers.dev`）与 `MAIL_API_SECRET`。
若 `.dev.vars` 没有 URL：`cd /home/ubuntu/lakebbs-mail && npx wrangler deployments list` 或用其 `*.workers.dev` 域。

- [ ] **Step 2: 写 wrangler.jsonc 的 MAIL_API_URL 真值**

把 Task 1 里 `vars.MAIL_API_URL` 的 `<MAIL_URL>` 占位替换为上一步真实地址（不带尾斜杠）。

- [ ] **Step 3: 写本地 .dev.vars（不提交）**

往 `/home/ubuntu/sql-dojo/.dev.vars` 追加两行（`SESSION_SECRET` 用一段长随机串：`openssl rand -hex 32`）：

```
SESSION_SECRET=<openssl rand -hex 32 的输出>
MAIL_API_SECRET=<与 lakebbs-mail 一致的密钥>
```

确认 `.dev.vars` 在 `.gitignore`（已在）。

- [ ] **Step 4: 本地起服联调**

Run（后台）：`cd /home/ubuntu/sql-dojo && npm run dev`
然后冒烟（换真实邮箱以收信；或先只验配置/限流路径）：
```bash
curl -s -X POST localhost:3000/api/auth/request-code -H 'content-type: application/json' -d '{"email":"你的邮箱@example.com"}'
```
Expected: `{"ok":true}` 且邮箱收到「SQL 道场登录验证码」。再用收到的码：
```bash
curl -s -i -X POST localhost:3000/api/auth/verify -H 'content-type: application/json' -d '{"email":"你的邮箱@example.com","code":"<收到的码>"}'
```
Expected: 200，响应头含 `Set-Cookie: sdsess=...`，body 含 `user.email`。
> 注：`next dev` 经 `initOpenNextCloudflareForDev()` 读 `.dev.vars` 与本地 D1（Task 1 已 `--local` 应用迁移）。停掉 dev：`pkill -f "next dev"`。

- [ ] **Step 5: 无密钥入库自检**

Run: `cd /home/ubuntu/sql-dojo && git status --short && git grep -n "SESSION_SECRET=" -- ':!*.md' || echo "ok 无明文密钥"`
Expected: `.dev.vars` 不在待提交列表；无源码含明文密钥。

（本任务不产生提交——wrangler.jsonc 的 MAIL_API_URL 改动随 Task 16 一起提交。）

---

## Task 16: 部署 + 远端迁移 + E2E 验收

**Files:**（无新增）

- [ ] **Step 1: 配置线上 secret + 远端迁移**

Run:
```bash
cd /home/ubuntu/sql-dojo
npx wrangler d1 migrations apply sql-dojo --remote
printf '%s' "$SESSION_SECRET_VALUE" | npx wrangler secret put SESSION_SECRET
printf '%s' "$MAIL_API_SECRET_VALUE" | npx wrangler secret put MAIL_API_SECRET
```
（`$SESSION_SECRET_VALUE`/`$MAIL_API_SECRET_VALUE` 用 Task 15 的真值；或交互粘贴。）
Expected: 迁移在 remote 应用；两个 secret 设置成功。

- [ ] **Step 2: 构建并部署**

Run: `cd /home/ubuntu/sql-dojo && npm run deploy`
Expected: OpenNext 构建 + 部署成功，输出线上 URL（`https://sql-dojo.pp-account.workers.dev`）。
> 若报缺 esbuild：`npm i -D esbuild` 后重试（已在 devDeps，通常无需）。

- [ ] **Step 3: 提交 wrangler.jsonc**

```bash
cd /home/ubuntu/sql-dojo
git add wrangler.jsonc
git commit -m "chore: 接线 MAIL_API_URL + D1 远端迁移上线"
```

- [ ] **Step 4: 真浏览器 E2E（线上）**

用 browser-harness 走完整链路（参考前几期；`new_tab` 打开线上站，`domcontentloaded` 等待，PGlite 页用 `wait_for_selector`）：

1. 游客身份进 `/exercise/<某题>`，解对 1–2 题 → `/me` 看到本地进度计数 > 0。
2. 进 `/login` → 输真实邮箱 → 收码 → 输码 → 自动跳 `/me`。
3. `/me` 显示「已登录 <邮箱>· 进度已云端同步」，且**之前的游客进度仍在**（已上云）。
4. 新开**隐身窗**（无 localStorage）→ `/login` 同邮箱登录 → `/me` **拉回**第 1 步的进度（证明云端真源）。
5. 在隐身窗再解 1 题 → 回常规窗刷新 `/me` → 计数随之增加（双端一致）。
6. 点「退出」→ 跳首页 → `/me` 回到游客 CTA，本地进度仍可见。

Expected: 6 步全过。如某步失败，用 systematic-debugging 定位（先查 `/api/progress/sync`、`/api/auth/verify` 的响应与 `Set-Cookie`）。

- [ ] **Step 5: 收尾**

- 更新记忆 `project_sql_dojo.md`：登录+D1 云同步上线（邮箱 OTP 复用 lakebbs-mail、无状态 HMAC、D1 users/login_codes/progress、store 升级为本地缓存+并集云同步、submissions/成就仍留后续）。
- `git push`（仓库 YSKM523/sql-dojo，main）。
- 向用户汇报：完整链路上线、线上 URL、验收结果；提示 submissions/成就/排行榜为后续可选增量。

---

## Self-Review（写完计划的回查）

**Spec 覆盖：**
- §3.1 邮箱 OTP → Task 3/4/5/8 ✓；§3.2 HMAC 会话 → Task 2/7 ✓；§3.3 复用 lakebbs-mail → Task 5/8/15 ✓
- §4 D1 三表 → Task 1 ✓；§5 七个路由 → Task 8/10（request-code/verify/me/logout/progress GET/POST/sync）✓
- §6 store 升级（setAll/pushCloud/setAuthed、bootstrap、登出保留本地、clearProgress 仅本地）→ Task 9/11 ✓
- §7 UI（/login、顶栏角标、/me 登录态）→ Task 12/13/14 ✓
- §8 配置/密钥 → Task 1/15/16 ✓；§9 测试（session/code/merge/email/sendMail 单测 + E2E）→ Task 2–5/9/16 ✓
- §10 安全（不泄露存在性、常量时间比对、cookie 属性、限流）→ Task 8（request-code 永 ok 除限流 429；verify 错误信息不区分账号是否存在）、Task 2（timingSafeEqual）、Task 7（HttpOnly/Secure/SameSite）✓
- §11 部署与验收 → Task 16 ✓

**占位扫描：** 仅 `<DB_ID>`/`<MAIL_URL>`/密钥真值为运行期解析（Task 1/15/16 有明确取值步骤），非逻辑占位。无 TODO/TBD。

**类型一致性：** `setAll`/`setAuthed`/`mergeIds`/`evaluateCode`/`CodeVerdict`/`signSession`/`verifySession`/`readSession`/`sessionCookie`/`sendMail(MailEnv,MailMessage)`/`upsertUserByEmail` 等签名在定义任务与使用任务间一致；`CodeVerdict` 的 `VERDICT_MSG` 用 `Exclude<...,'ok'>` 覆盖全部非 ok 分支。
