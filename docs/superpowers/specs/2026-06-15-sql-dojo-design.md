# SQL 道场 (SQL Dojo) — 设计文档

- 日期：2026-06-15
- 状态：已通过头脑风暴确认，待进入实现计划
- 作者：与用户协作设计

---

## 1. 项目定位与目标

一个面向中文小白的 SQL 实战学习平台，让学员**边跑真实查询、边和 AI 结对**，从 `SELECT *` 一路练到能读执行计划、做留存/漏斗分析，目标是把学员快速带到 **senior SQL 工程师**水平。

核心信念：SQL 不是看会的，是写会的。所以每一个知识点都配**浏览器内真实可跑的练习**，而不是视频或静态代码块。

工作名：**SQL 道场 / SQL Dojo**。项目目录：`/home/ubuntu/sql-dojo`。

## 2. 目标用户

- 主：零基础或半吊子的中文求职者/在校生，想系统掌握 SQL 并冲求职。
- 次：有点基础、想补 senior 技能（窗口函数、执行计划、实战分析）的在职工程师。
- 内容语言：**中文为主，SQL 代码与关键术语保留英文**（JOIN / CTE / window function 等）。

## 3. 范围与非目标 (Scope / Non-Goals)

**做（最终形态）**：练习场 + AI 副驾 + 课程路线图 + 登录/进度，三者融合的完整平台，分 3 阶段交付。

**明确不做（YAGNI）**：
- 不做视频课程托管。
- 不做多人实时协作/直播。
- 不做付费/订阅系统（Phase 1–3 全免费；商业化留到以后另开 spec）。
- 不做移动原生 App（响应式 Web 即可）。
- 不做多数据库方言切换（统一 Postgres，理由见 §5.2）。
- 不在服务端执行用户 SQL（全部浏览器本地跑，理由见 §5.2）。

## 4. 三大趋势的落地映射

| 趋势 | 落地方式 | 体现模块 |
|---|---|---|
| **实战趋势** | 浏览器内**真 Postgres**(PGlite/WASM)，每题种真实业务数据集，当场跑、即时判对错 | 练习场（全站） |
| **vibe coding 趋势** | 全程 **AI 副驾**（NL→SQL、解释报错、渐进提示、地道重写）+ **Vibe Challenge** 题型：用自然语言+AI 起草→自己验证→讲清楚逻辑 | AI 副驾（全站）、Vibe Challenge（Phase 2） |
| **行业趋势** | 课程直插 senior 真实技能：窗口函数、CTE、**EXPLAIN 执行计划+索引调优**、数据建模、留存/漏斗/cohort 实战、面试真题 | 模块 4–8 |

## 5. 技术架构

### 5.1 技术栈

```
Next.js (App Router, TypeScript)
   │  部署：Cloudflare（OpenNext 适配器 @opennextjs/cloudflare → Workers 运行时）
   │       绑定 D1（用户/进度）+ KV（AI 限流计数）
   ├─ 前端
   │    ├─ 练习场：CodeMirror 6 (SQL mode) 编辑器 + 结果表
   │    ├─ SQL 引擎：PGlite (@electric-sql/pglite) — 真 Postgres，纯浏览器 WASM
   │    └─ 课程渲染：MDX
   ├─ API Routes（跑在 Worker 服务端）
   │    ├─ /api/ai/*   → 代理 Claude API（密钥仅服务端）
   │    ├─ /api/auth/* → 邮箱 OTP 登录 + HMAC 无状态会话
   │    └─ /api/progress/* → 进度/提交读写 D1
   └─ 存储：D1（关系数据）+ KV（限流）+ 仓库内 MDX/题库（内容）
```

> 部署适配器默认 OpenNext Cloudflare（Workers，原生支持 D1/KV 绑定与 API routes）；若后续偏好 Pages，可退回 `@cloudflare/next-on-pages`。实现期会查 `cloudflare`/`wrangler` skill 校准命令。

### 5.2 SQL 引擎决策：PGlite（真 Postgres 跑浏览器）

- **选型**：`@electric-sql/pglite` —— 完整 Postgres 编译成 WASM（约 3MB，懒加载），**全部在浏览器本地执行**。
- **理由**：
  1. **零后端成本/零延迟/无限扩展**：查询不打服务器，无需 SQL 沙箱与防注入运维。
  2. **真 Postgres 方言**：正是 senior 岗位真实使用的方言；支持 **`EXPLAIN ANALYZE`、索引、window functions、CTE、JSON**。
  3. **可教执行计划**：能在浏览器里真实演示"加索引 → 看 plan 变化"，这是几乎无人做到的 senior 级功能（见 §8.2）。
- **淘汰 sql.js(SQLite)**：更轻但方言偏离真实工作、读不了真实 plan。
- **实例管理**：每次"运行"在内存实例中**重新种子**（幂等：先 DROP/CREATE 再灌数据再跑用户查询），避免上一次运行的状态泄漏，保证判题确定性。

### 5.3 AI 集成决策：真·Claude API，分阶段 + 成本可控

- **密钥仅服务端**（Worker env），前端永不接触。
- **模型**：默认 `claude-haiku-4-5-20251001`（便宜快，做提示/解释/报错）；`claude-sonnet-4-6` 仅在 Phase 2 深度批改/code review 时调用。
- **成本控制**：每用户（登录态按 user_id，游客按 IP）**每日调用配额**存 KV；超额提示登录或次日再来。
- **Phase 1 端点**（均返回中文）：
  - `POST /api/ai/hint` —— 入参 `{exerciseId, userSql, errorMsg?}`，给**渐进式提示/下一步思路，绝不直接给完整答案**（system prompt 强约束）。
  - `POST /api/ai/explain` —— 入参 `{sql}`，逐句讲解这条 SQL 在干嘛。
  - `POST /api/ai/debug` —— 入参 `{sql, errorMsg}`，解释 Postgres 报错并给修复方向。
- 实现期查 `claude-api` skill 校准 model id / SDK 用法。

### 5.4 鉴权：邮箱 OTP + 游客模式

- **游客优先**：未登录即可玩，进度存 `localStorage`；登录后一次性同步到云端（D1）。降低进入门槛、提高转化。
- **登录**：邮箱验证码（OTP）。复用用户已有套路 —— `login_codes` 表存验证码、**无状态 HMAC 会话 cookie**（不建会话表），邮件经已有 Resend 发送。
- 不做密码、不做第三方 OAuth（Phase 1）；GitHub OAuth 留作未来可选。

### 5.5 部署

- Cloudflare（OpenNext → Workers），`wrangler` 部署；D1 + KV binding；Claude key 走 secret。
- 自定义域名可选（用户惯用 `*.tensorproxies.com` 或新域）。

## 6. 数据模型与内容存储

### 6.1 D1 表（仅存用户数据，不存课程内容）

```sql
-- 用户
users(
  id TEXT PRIMARY KEY,          -- uuid
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at INTEGER NOT NULL
)

-- 登录验证码
login_codes(
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed INTEGER DEFAULT 0
)

-- 每课/每题完成进度
progress(
  user_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,    -- 对应仓库题库 id
  status TEXT NOT NULL,         -- 'passed' | 'attempted'
  passed_at INTEGER,
  PRIMARY KEY(user_id, exercise_id)
)

-- 提交记录（用于"我的足迹"与 Phase 2 的 AI 批改/分析）
submissions(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  sql TEXT NOT NULL,
  passed INTEGER NOT NULL,
  created_at INTEGER NOT NULL
)

-- Phase 2：成就/连胜
achievements(user_id TEXT, key TEXT, earned_at INTEGER, PRIMARY KEY(user_id, key))
streaks(user_id TEXT PRIMARY KEY, current INTEGER, longest INTEGER, last_active_day TEXT)
```

> 列名采用 snake_case；如用 Drizzle 注意 casing 配置（参考用户在 lakebbs 踩过的 camelCase 坑，本项目统一 snake_case 并显式配置）。

### 6.2 课程与题库（仓库内，可版本化）

- **概念课**：MDX 文件（`content/modules/<id>/lesson.mdx`），可内嵌练习组件。
- **题目定义**：结构化 TS/JSON（`content/exercises/*.ts`），单题格式见 §9。
- 内容**不进 D1**：易写、易 review、可版本回溯。

## 7. 课程路线图：小白 → senior（8 模块 / 段位）

| # | 模块 | 关键内容 | 段位 |
|---|---|---|---|
| 1 | 入门 | `SELECT` / `WHERE` / `ORDER BY` / `LIMIT` / `DISTINCT` | 🟢 小白 |
| 2 | 关联与聚合 | 各种 `JOIN` / `GROUP BY` / `HAVING` / 聚合函数 / NULL 陷阱 | 🟢 初级 |
| 3 | 进阶查询 | 子查询 vs JOIN / `CTE (WITH)` / `UNION` 系 / `CASE` | 🟡 中级 |
| 4 | 分析利器 | **窗口函数**(`RANK`/`LAG`/累计) / 日期/字符串函数 / 分组进阶 | 🟡 中级 |
| 5 | 建模与 DDL | 建表/约束/范式与反范式/事务/索引基础 | 🟠 进阶 |
| 6 | 性能与优化 | **`EXPLAIN` 执行计划 / 索引策略 / 反模式 / 查询重写** | 🔴 Senior |
| 7 | 实战场景 | 留存 cohort / 漏斗 / 用户分群 / gaps-and-islands / 报表 | 🔴 Senior |
| 8 | 面试冲刺 | LeetCode 式 SQL 真题 / 高频考点 / 边界正确性 | 🔴 冲刺 |

每模块结构 = 概念讲解（MDX）+ 多道练习场实战题 + 1 道 Boss 挑战；全程 AI 副驾可用。

## 8. 核心功能详述

### 8.1 实战练习场
左侧题面 + 右侧 CodeMirror 编辑器 + "运行"按钮 + 结果表 + 即时判对错。运行流程：取该题 `seedSql` → 在内存 PGlite 重新种子 → 跑用户 SQL → 渲染结果 → 与标准答案结果集比对（§9）→ 显示 ✅/❌ 与差异。报错时高亮并可一键问 AI（debug）。

### 8.2 执行计划实验室（Phase 2，senior 专属）
一键 `EXPLAIN (ANALYZE)` → 解析/可视化 plan 树 → 引导加索引 → 再次 EXPLAIN 对比 plan 与耗时变化 → AI 解释"为什么从 Seq Scan 变 Index Scan、为什么快了"。依赖 PGlite 的真实 plan 能力。

### 8.3 AI 副驾（Phase 1 起）
面板内三动作：**提示**（渐进、不给答案）/ **解释我的查询** / **为什么报错**。Phase 2 增"用更地道写法重写""复杂度/性能点评"。受 §5.3 限流约束。

### 8.4 Vibe Challenge（Phase 2）
给业务问题的自然语言描述 → 学员用 AI 协作产出 SQL → 系统判结果对错 + AI 反问"这条查询在干嘛"确保真懂、不是瞎抄。教 senior 现代工作流：prompt → review → 理解 → 上线。

## 9. 题目定义格式与判题

```ts
interface Exercise {
  id: string;                 // 'm1-select-basic-01'
  moduleId: string;           // 'm1'
  title: string;              // 中文标题
  difficulty: 1 | 2 | 3 | 4 | 5;
  prompt: string;             // 中文题面（业务化描述）
  seedSql: string;            // 建表 + 插数据（每次运行前重置）
  starterSql?: string;        // 编辑器初始内容（可选脚手架）
  solutionSql: string;        // 标准答案，用于生成期望结果集
  orderMatters: boolean;      // 题目是否要求特定顺序（涉及 ORDER BY 时为 true）
  hints?: string[];           // 兜底静态提示（AI 不可用时）
}
```

**判题规则**：在同一份 `seedSql` 上分别跑 `solutionSql`（期望）与用户 SQL（实际）；`orderMatters=false` 时按**多重集合**比对（忽略行顺序）、列按位置比对；`true` 时按顺序逐行比对。错误时展示"期望 vs 实际"差异表。判题全程浏览器本地。

## 10. 页面/路由结构

```
/                     落地页：定位 + "立即开练"(游客直接进 m1 第一题)
/learn                课程路线图（段位树 + 进度）
/learn/[moduleId]     模块概览（课程 + 题目列表）
/exercise/[id]        练习场（题面 + 编辑器 + 结果 + AI 副驾）
/me                   我的进度/足迹（登录后）
/login                邮箱 OTP 登录
```

## 11. 视觉与设计原则

- 风格：「IDE × Duolingo」—— 专业开发者气质 + 闯关式正反馈。
- **纯色、无任何 CSS 渐变**（遵用户全局偏好）；深色模式友好；SQL 用等宽字体。
- 段位用颜色/徽章区分；判对判错有明确即时反馈动效（克制、非花哨）。
- 落地实现时调用 `frontend-design`（必要时 `awwwards-craft`）把质感拉满。

## 12. 分阶段交付

每阶段都是**可独立上线的完整产品**，各自走一份 spec→plan→build。

- **Phase 1（MVP，先上线）**：练习场(PGlite) + 模块 1–4 题库 + 登录/游客/进度 + AI 副驾(Haiku：提示/解释/报错)。→ 同时交付 实战+vibe+行业 三味。
- **Phase 2**：模块 5–8 + 执行计划实验室 + AI 深度批改 + Vibe Challenge + 成就/连胜。
- **Phase 3**：排行榜 / 结业证书 / 间隔重复复习 / 更多数据集 / 社区。

## 13. Phase 1 详细范围（本次实现目标）

**交付物**：
1. Next.js(App Router,TS) 脚手架 + OpenNext Cloudflare 部署配置；D1 + KV 绑定；Claude key secret。
2. **鉴权**：邮箱 OTP 登录 + 游客模式 + HMAC 会话；`users`/`login_codes` 表。
3. **练习场**：CodeMirror6 编辑器 + PGlite 引擎（懒加载、每次运行重种子）+ 结果表 + 报错显示。
4. **判题引擎**：§9 的题目格式 + 结果集比对（集合/有序）+ ✅❌ 与差异展示。
5. **题库内容**：模块 1–4，每模块 8–12 题（合计约 40 题）+ 概念课 MDX，含每模块 1 道 Boss。
6. **路线图 UI**：段位树、进度标记（§10 的 `/learn` 与 `/learn/[moduleId]`）。
7. **AI 副驾**：`/api/ai/hint|explain|debug`（Haiku）+ KV 限流 + 面板 UI。
8. **进度**：提交与完成写 D1；游客存 localStorage，登录后同步；`/me` 足迹页。
9. **视觉**：纯色无渐变、深色友好、IDE×Duolingo 设计过一遍。
10. **部署**：上线 Cloudflare，给出可访问 URL。

**Phase 1 验收标准**：新访客可落地 → 以游客身份进入模块 1 → 读概念 → 在真 Postgres 里解题、即时判对错 → 卡住时找 AI 要提示/解释/查错 → 注册保存进度 → 刷新/再登录能恢复进度。全部已部署在线可访问。

## 14. 风险与对策

| 风险 | 对策 |
|---|---|
| PGlite 首次加载 ~3MB 影响首屏 | 懒加载：仅进入练习场时按需加载 WASM；落地页/路线图不加载 |
| Next.js 在 Cloudflare 的运行时坑 | 用 OpenNext 适配器；实现期查 `cloudflare`/`wrangler` skill；必要时退回 next-on-pages |
| AI 成本失控 | 默认 Haiku；KV 每日配额；游客限更严 |
| 判题误判（同义不同写法） | 以**结果集**为准而非比对 SQL 文本；明确 `orderMatters` 语义 |
| 内容工作量大（40 题+概念） | Phase 1 聚焦模块 1–4；题目可借助内部工具批量起草后人工校对 |
| home 目录是 git 仓库 | 项目用独立 repo（已 `git init` 于 `/home/ubuntu/sql-dojo`），不污染 home |

## 15. 未来扩展（当前不做）

排行榜、结业证书、间隔重复、社区问答、更多真实数据集、多方言对照、GitHub OAuth、商业化订阅。各自未来另开 spec。
