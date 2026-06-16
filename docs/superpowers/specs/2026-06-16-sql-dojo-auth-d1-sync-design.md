# SQL 道场 — 登录 + D1 云同步 设计文档

- 日期：2026-06-16
- 状态：已通过头脑风暴确认，待进入实现计划
- 上游：`2026-06-15-sql-dojo-design.md`（总设计）§5.4 鉴权、§6.1 D1 表、§12 Phase 2
- 前置：Phase 1（练习场 / 模块 1–4 / 游客进度 / AI 副驾）已全部上线

---

## 1. 目标与动机

总设计 §5.4 采用"游客优先 + 登录后一次性同步到云端"。Phase 1 实现时用户选择**先只做游客进度**（localStorage），登录/D1 暂缓。本切片补上这块：

- **跨设备 / 换浏览器进度不丢**：换设备、清缓存后仍能恢复已通关记录。
- **为后续铺路**：成就/连胜、AI 深度批改、排行榜都依赖"有账号 + 云端进度"这一地基。

**核心诉求 = 跨设备同步**。submissions 提交日志、achievements/streaks 成就连胜**不在本切片**（属总设计 Phase 2 的独立增量，留待后续 spec）。

## 2. 范围 (Scope / Non-Goals)

**做**：
1. 邮箱 OTP 登录（复用 `lakebbs-mail` 发信）。
2. 无状态 HMAC 会话 cookie。
3. D1 三张表：`users` / `login_codes` / `progress`。
4. 认证 + 进度 API 路由（跑在 Worker 服务端）。
5. 进度 store 从"纯 localStorage"升级为"本地缓存 + 登录后云同步"，**公开 API 不变**。
6. `/login` 页 + 全局 auth 角标 + `/me` 登录态。

**不做（YAGNI / 留后续）**：
- 密码登录、第三方 OAuth（GitHub 等）。
- submissions 提交日志、achievements/streaks 成就连胜。
- 排行榜、结业证书、间隔重复。
- 单独的会话表（用无状态 HMAC，不建表）。
- 自定义品牌发信域名（复用 `noreply@lakebbs.ca`，正文打"SQL 道场"品牌）。

## 3. 认证模型

### 3.1 邮箱 OTP（无密码）

输邮箱 → 收 6 位数字验证码 → 输码登录。沿用用户在 TCFmonitor 跑通的同款套路（验证码表 + 无状态 HMAC 会话）。

- 验证码：6 位数字，TTL 10 分钟，单次使用（`consumed`），最多校验 5 次（`attempts`）。
- 发码限流（KV，复用现有 `AI_RATELIMIT` 命名空间，键前缀 `otp-email:` / `otp-ip:` 区分）：按日历日计数（沿用 `checkRateLimit` 的日桶，不另造小时窗），**每邮箱 8 次/天、每 IP 30 次/天**，命中回 `429`。
- **不泄露账号是否存在**：`request-code` 永远回 `{ok:true}`；`verify` 成功时若 `users` 无此邮箱则**自动建号**（OTP 既是登录也是注册）。

### 3.2 无状态 HMAC 会话

cookie `sdsess`：

```
payload = base64url(JSON.stringify({ uid, email, exp }))   // exp = 现在 + 30 天(ms)
sig     = base64url(HMAC_SHA256(payload, SESSION_SECRET))
cookie  = `${payload}.${sig}`
```

- 验签：重算 HMAC 常量时间比对 + 检查 `exp > now`。任一不过 → 视为未登录。
- cookie 属性：`HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`。
- 不建 session 表；登出 = 下发 `Max-Age=0` 清除。
- `SESSION_SECRET` 仅服务端（Worker env / secret），前端永不接触。

### 3.3 发信：复用 lakebbs-mail（零邮件基建）

已有部署的 `lakebbs-mail` Worker：`POST /send`，头 `Authorization: Bearer ${MAIL_API_SECRET}`，body `{to, subject, html, text}`，经 Cloudflare Email 绑定从 `noreply@lakebbs.ca` 发出。lakebbs-next 的 `src/lib/email/send.ts` 即此调用范式，照搬一份到 `lib/mail/send.ts`。

- sql-dojo 新增配置：`MAIL_API_URL`（var，lakebbs-mail 部署地址）、`MAIL_API_SECRET`（secret，与 lakebbs-mail 一致）。
- 邮件正文中文、品牌写"SQL 道场"，只放验证码 + 10 分钟有效提示；发件人仍是 `noreply@lakebbs.ca`（可接受）。
- 发送失败抛错由路由捕获；不因发信失败把验证码暴露给前端。

## 4. 数据模型（D1）

新建 D1 数据库 `sql-dojo`，wrangler 绑定名 `DB`。本切片三张表（采 snake_case，沿用总设计 §6.1）：

```sql
CREATE TABLE users (
  id           TEXT PRIMARY KEY,         -- uuid
  email        TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at   INTEGER NOT NULL          -- epoch ms
);

CREATE TABLE login_codes (
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,              -- 6 位数字
  expires_at INTEGER NOT NULL,           -- epoch ms
  consumed   INTEGER NOT NULL DEFAULT 0, -- 0/1
  attempts   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_login_codes_email ON login_codes (email);

CREATE TABLE progress (
  user_id     TEXT NOT NULL,
  exercise_id TEXT NOT NULL,             -- 对应仓库题库 id
  status      TEXT NOT NULL,             -- 当前只写 'passed'，保留字段向前兼容
  passed_at   INTEGER,                   -- epoch ms
  PRIMARY KEY (user_id, exercise_id)
);
```

- 时间统一 epoch ms（与现有代码风格一致）。
- 每邮箱可能存多条 `login_codes`（重复发码）；以最新未过期、未消费的为准；登录成功后清理该邮箱旧码（可选）。
- migrations 放 `migrations/0001_auth.sql`，用 `wrangler d1 migrations apply sql-dojo --local` / `--remote` 上线。

## 5. API 路由

均跑在 Worker 服务端，经 `getCloudflareContext().env` 取绑定（`DB` / `AI_RATELIMIT` / `SESSION_SECRET` / `MAIL_API_URL` / `MAIL_API_SECRET`），照搬现有 `/api/ai` 路由范式。

| 路由 | 方法 | 入参 | 行为 | 出参 |
|---|---|---|---|---|
| `/api/auth/request-code` | POST | `{email}` | 校验邮箱格式 → KV 限流 → 生成 6 位码、写 `login_codes` → 调 lakebbs-mail 发码 | 永远 `{ok:true}`（不泄露存在性；限流命中回 `{ok:true}` 但不发，或 429——见下） |
| `/api/auth/verify` | POST | `{email, code}` | 取最新未过期未消费码 → `attempts<5` 且匹配 → upsert `users`、置 `consumed=1`、下发会话 cookie；否则 `attempts+1` | 成功 `{user:{email,displayName}}`；失败 `{error}` 4xx |
| `/api/auth/me` | GET | — | 验签 cookie | `{user}` 或 `{user:null}` |
| `/api/auth/logout` | POST | — | 下发清除 cookie | `{ok:true}` |
| `/api/progress` | GET | — | 登录态：查 `progress` 该用户全部 | `{ids:[...]}`（已通关 exercise_id） |
| `/api/progress` | POST | `{exerciseId}` | 登录态：幂等 upsert（`status='passed', passed_at=now`） | `{ok:true}` |
| `/api/progress/sync` | POST | `{ids:[本地游客 ids]}` | 登录态：**并集合并**——本地有云端无的批量插入、再回库内全集 | `{ids:[合并全集]}` |

未登录访问 `progress` 系列返回 401，客户端据此走纯本地路径。

**限流命中策略**：`request-code` 命中 KV 限流时返回 `429 {error:'rate_limited'}`（这是同一邮箱/IP 的自我保护，不泄露他人账号信息，可如实告知"请稍后再试"）。

## 6. 进度 store 升级（关键工程点）

现状 `lib/progress/store.ts` = 纯 localStorage 的 pub/sub + `useSyncExternalStore`。公开 API：`getCompleted / isCompleted / markCompleted / clearProgress / subscribe / getSnapshot / getServerSnapshot`。**这些签名全部保持不变**，ModuleCard / ExerciseList / `/me` 零改动。

localStorage 继续充当**同步本地缓存**：游客全程靠它；登录用户也靠它做即时渲染与离线缓存。在其上叠一层 sync：

1. **应用加载时引导（一次）**：客户端启动调 `GET /api/auth/me`。
   - 未登录 → 什么都不做，纯本地（与今天行为一致）。
   - 已登录 → 取当前 localStorage ids，调 `POST /api/progress/sync {ids}` → 服务端回合并全集 → `setAll(merged)` 写回缓存并通知订阅者。（游客期攒的进度上云；其他设备的进度拉回）
2. **`markCompleted(id)`**：先写 localStorage（乐观、立即反馈），若已登录再 fire-and-forget `POST /api/progress {exerciseId}`（尽力而为；失败无妨，下次加载的 sync 会兜底对账）。
3. **登出**：清 cookie；**保留 localStorage**（这是本设备的进度，登出回到游客态仍可见）。
4. **`clearProgress`**：清本地；若登录态，是否清云端？本切片**只清本地**（避免误删云端，"清空"语义保持设备级）；云端清理留作后续显式功能。

新增内部函数（不改对外签名）：
- `setAll(ids: string[])` — 整体替换缓存并广播（供 sync 用）。
- 一个**纯函数** `mergeIds(local, remote): string[]` — 去重并集，便于单测。
- 一个客户端引导模块（如 `lib/progress/sync.ts` + 在根布局挂一个 `<ProgressSync/>` 客户端组件触发 bootstrap），与 store 解耦。

会话态（是否登录、邮箱）单独一个轻量 client store / hook（`lib/auth/useSession.ts`），供 auth 角标与 `/me` 用。

## 7. UI

- **`/login`**：单页两步——①邮箱输入 + "发送验证码"；②验证码输入 + "登录"。成功后跳 `/me`。失败显示中文错误（码错/过期/试次用尽/请稍后再试）。纯色、无渐变、深色友好（沿用现有视觉）。
- **全局 auth 角标**：在 `app/layout.tsx` 顶部加一条极简栏（或右上角小组件，客户端组件）。登录态显示邮箱 + "退出"；游客显示"登录"。
- **`/me`**：登录态显示邮箱 + "退出登录" + "进度已云端同步"提示；游客态显示"登录以跨设备保存进度"CTA（链到 `/login`）。进度列表本身复用现有实现（数据来自升级后的 store）。

## 8. 配置与密钥（绝不进库）

- `wrangler.jsonc`：加 `d1_databases`（绑定 `DB`，database_name `sql-dojo`，database_id）、`vars.MAIL_API_URL`。
- 密钥：`SESSION_SECRET`、`MAIL_API_SECRET` —— 本地写 `.dev.vars`（已 gitignore），线上 `wrangler secret put`。
- `cloudflare-env.d.ts`：`CloudflareEnv` 加 `DB: D1Database`、`SESSION_SECRET`、`MAIL_API_URL`、`MAIL_API_SECRET`。
- `.dev.vars` 已在 `.gitignore`；`git grep` 校验密钥不入库。

## 9. 测试策略（TDD）

**纯函数单测（node 环境，主战场）**：
- HMAC 会话：`signSession` / `verifySession` 往返、篡改 payload 拒绝、篡改 sig 拒绝、过期拒绝。
- 验证码逻辑：`evaluateCode(row, input)` → ok / wrong / expired / exhausted（参考 lakebbs `evaluateBindingCode`）。
- `mergeIds(local, remote)` 并集去重、空集、全重叠、顺序无关。
- 邮件 payload 构造：`buildOtpEmail(code)` → 含码、中文、品牌、文本+HTML。
- 限流：复用现有 `checkRateLimit` 模式（已有测试范式）。

**组件/集成**：`/login` 表单交互（jsdom）；store 升级后 `setAll` 广播、`markCompleted` 仍乐观更新。

**端到端（真浏览器打线上 Worker，同前几期）**：发码（用 demo/真邮箱）→ 输码登录 → 游客进度上云 → 换"无缓存"会话仍能拉回进度 → 退出回游客态。

路由处理器保持**薄壳套纯核心**：所有判定逻辑在可单测的纯函数里，路由只做 D1/KV/cookie 的 IO 编排，不依赖活的 D1 做单测。

## 10. 安全注意

- `request-code` 不泄露邮箱是否注册。
- `SESSION_SECRET` / `MAIL_API_SECRET` 仅服务端，永不下发前端、永不进库。
- 验证码 6 位 + 10 分钟 TTL + 单次使用 + 最多 5 次校验 + 发码限流，抵御暴力与轰炸。
- cookie `HttpOnly + Secure + SameSite=Lax`，防 XSS 读取与 CSRF 跨站。
- 常量时间比对 HMAC 签名（防计时侧信道，参考 lakebbs-mail `timingSafeEqual`）。

## 11. 部署与验收

- D1 migrations 上 local + remote；wrangler 绑定与 secret 配齐；OpenNext 构建部署到现有 Worker `sql-dojo`。
- **验收**：游客做几题（本地记录）→ `/login` 收码登录 → 进度自动上云 → 另开"干净"浏览器/隐身窗登录同邮箱 → 看到刚才的进度被拉回 → 新做一题在两端一致 → 退出回游客态本地进度仍在。全部线上可访问。

## 12. 风险与对策

| 风险 | 对策 |
|---|---|
| OpenNext 下 D1 绑定取用方式 | 照搬现有 AI 路由的 `getCloudflareContext().env`；实现期查 `cloudflare`/`wrangler` skill 校准 |
| 跨 Worker 调 lakebbs-mail 的可达性/密钥一致 | 用其 workers.dev 地址 + 共享 `MAIL_API_SECRET`；先 `/health` 探活、本地 `.dev.vars` 联调 |
| 登录态 store 与 localStorage 缓存不一致 | localStorage 为即时缓存、D1 为登录态真源；每次加载 sync 并集对账，markCompleted 乐观写 + 后台补 |
| `clearProgress` 语义歧义 | 本切片明确只清本地、不动云端；云端清理留作后续显式功能 |
| 发信失败影响登录 | 验证码已落库；发信失败回 5xx 让用户重试，绝不把码回前端 |
| D1 迁移重复执行 | 用 `wrangler d1 migrations` 标准机制，避免手工重跑（参考用户 lakebbs migrate 踩坑） |
