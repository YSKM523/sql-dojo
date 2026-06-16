# SQL 道场 — 模块 7（实战场景）+ 模块 8（面试冲刺）设计文档

- 日期：2026-06-16
- 状态：已通过头脑风暴确认，待进入实现计划
- 上游：`2026-06-15-sql-dojo-design.md`（总设计）§7 课程路线图
- 前置：模块 1–6 已全部上线（含 checkSql 判题扩展）；登录+D1 云同步已上线

---

## 1. 目标与动机

补齐 8 模块路线图的最后两块，把"小白 → senior → 面试冲刺"走完：

- **模块 7 实战场景（🔴 Senior）**：把窗口函数/聚合/CTE 用到真实分析场景——留存 cohort、漏斗 funnel、用户分群、gaps-and-islands 连续活跃、DAU 报表。这是 senior 数据岗的日常。
- **模块 8 面试冲刺（🔴 冲刺）**：LeetCode 式 SQL 高频真题，练边界正确性与套路。

完成后整个课程闭环：8 个模块、🟢→🔴 五个段位齐全。

## 2. 范围与非目标

**做**：模块 7（~8 题 + 概念课）+ 模块 8（~8 题 + 概念课）+ 模块 7 的共享事件流数据集 `EVENTS_SEED` + 模块 8 的几张小型面试表。

**纯内容，引擎零改动**：`TierKey` 的 `senior`/`sprint` 与 `TIER_BADGE` 的 sprint 色均已存在；全部走现有结果集判题（个别可用已就绪的 `checkSql`，但 7-8 基本是 SELECT）。不新增任何 lib/组件代码。

**非目标（YAGNI / 留后续）**：
- 交互式执行计划实验室（§8.2）。
- AI 深度批改 / Vibe Challenge（§8.4）。
- 成就连胜 / 排行榜 / 结业证书。
- 不为单题做花哨可视化（漏斗就用查询结果表呈现）。

## 3. 架构与判题

无架构改动。两模块沿用既有：
- `Exercise` 结构（§9 总设计），`content/exercises/module7.ts` / `module8.ts`，在 `content/exercises/index.ts` 注册，`content/modules/index.ts` 加 `ModuleDef`（含概念课 Markdown）。
- 判题：现有 `ExerciseJudge` 结果集比对（`orderMatters` 控制行序）。复杂分析题倾向 `orderMatters:false`（集合比对），需要排序展示的报表题设 `orderMatters:true`。
- `content/soundness.test.ts`（每题 solution 过自身判题）、`content/integrity.test.ts` 自动覆盖新题。

## 4. 模块 7 数据集：共享 `EVENTS_SEED`

新建一份事件流数据集（在 `content/exercises/module7.ts` 顶部 `export const EVENTS_SEED`，模块 7 各题复用；写法对齐 `SHOP_SEED`）。

**Schema：**
```sql
CREATE TABLE app_user (id integer PRIMARY KEY, signup_date date);
CREATE TABLE event (id integer PRIMARY KEY, user_id integer, kind text, ts date);
-- kind ∈ {'view','cart','purchase','login'}
```

**数据编排原则**（实现期定具体行，必须让每道题有唯一、可手算核对的答案）：
- 用户分布在 2–3 个注册"月"（cohort 维度）。
- 事件覆盖若干天，含完整漏斗序列（同一用户的 view→cart→purchase）与未走完漏斗的用户（只 view、view+cart）。
- 至少一个用户有**连续多天 login**（gaps-and-islands 的最长连续天数有非平凡答案），也有断档的。
- 规模小到能手算（约 5–8 用户、25–40 条事件）。

> 实现时把 EVENTS_SEED 的具体行写进 plan，并由 soundness + 内容 reviewer（实跑核对结果）双重把关。

## 5. 模块 7 题目（~8 题，🔴 Senior）

1. **注册 cohort 规模**：按注册月分组统计用户数。
2. **漏斗各步人数**：分别有多少用户做过 view / cart / purchase。
3. **漏斗转化率**：purchase 用户数 / view 用户数（百分比或比值）。
4. **次月留存**：注册当月有活跃、且"次月"仍有活跃的用户数（或留存率）。
5. **用户分群**：按 purchase 次数把用户分高/中/低价值（`CASE` 分桶 + 计数）。
6. **最长连续活跃天数（gaps-and-islands）**：某用户（或每用户）连续 login 的最长天数，用 `日期 - row_number() 天` 的经典套路分组。
7. **DAU**：每天的活跃用户数（按 ts 分组去重 user）。
8. **Boss：留存/漏斗报表**：综合一道（如各注册 cohort 的购买转化）。

概念课讲：cohort/留存怎么定义与算、漏斗逐步收窄、gaps-and-islands 套路（连续序列分组）、`CASE` 分桶、DAU/活跃定义。

## 6. 模块 8 数据集：小型面试表（按题配 + 复用）

LeetCode 题各有各的表，用几张独立小种子（写在 `module8.ts`，按题 `seedSql` 引用），并复用现有 `SHOP_SEED`：

- `EMP_SEED`：`emp(id, name, salary, dept_id)` + `dept(id, name)` —— 第 N 高工资、部门最高薪、分数/工资排名。
- `PERSON_SEED`：`person(id, email)` —— 重复邮箱。
- `LOGS_SEED`：`logs(id, num)` —— 连续出现 3 次（gaps-and-islands 变体）。
- `WEATHER_SEED`：`weather(id, rec_date, temp)` —— 上升的温度（按日期+1 自连接）。
- 复用 `SHOP_SEED`（来自 module2）—— 从不下单的客户。

## 7. 模块 8 题目（~8 题，🔴 冲刺/sprint）

1. **第二高工资**（`EMP_SEED`，处理并列与不存在返回 NULL）。
2. **连续出现三次的数字**（`LOGS_SEED`，自连接或窗口）。
3. **重复的邮箱**（`PERSON_SEED`，`GROUP BY ... HAVING count>1`）。
4. **从不下单的客户**（复用 `SHOP_SEED`，`NOT EXISTS` / 左连接取 NULL）。
5. **部门最高薪员工**（`EMP_SEED`，窗口 `rank()` 或相关子查询）。
6. **分数/工资排名**（`EMP_SEED`，`dense_rank()`）。
7. **上升的温度**（`WEATHER_SEED`，自连接 `rec_date = 前一天 + 1`）。
8. **Boss：综合一道**（如各部门工资中位/Top-N，难度 5）。

概念课讲：面试高频套路（Top-N per group、自连接、HAVING 去重、NOT EXISTS vs LEFT JOIN NULL、并列与边界 NULL），强调**边界正确性**（空结果、并列、NULL）。

## 8. 段位

| 模块 | tierKey | tierLabel | 色 |
|---|---|---|---|
| 7 实战场景 | `senior` | Senior | 🔴 |
| 8 面试冲刺 | `sprint` | 冲刺 | 🔵（sky，TIER_BADGE 已有） |

均已存在，路线图段位树自动渲染两张新卡，无需改 `TierKey`/`TIER_BADGE`。

## 9. 测试策略

- **soundness**（`content/soundness.test.ts`）：自动覆盖模块 7、8 全部新题（每题 `solutionSql` 过自身判题）——证明每题答案能跑、确定。
- **integrity**（`content/integrity.test.ts`）：moduleId 合法、order 唯一升序、每模块至少一题——自动覆盖。
- **内容正确性**：实现后派独立 reviewer，对每道题**实跑 solution 并把结果手算核对到 seed 数据**（模块 7 的留存/漏斗/连续天数尤其要核），杜绝"能跑但答非所问"。
- 上线后真浏览器抽查 1–2 道（模块 7 一道分析题、模块 8 一道面试题判对错正常）。

## 10. 验收标准

- `/learn` 出现模块 7（🔴 Senior）、模块 8（🔵 冲刺）两段位卡，进度可统计；8 模块路线图完整。
- 模块 7 分析题（留存/漏斗/连续天数）判对；模块 8 面试题（第二高薪/连续三次/重复邮箱等）判对，边界（空/并列/NULL）正确。
- `npx vitest run` 全绿（soundness 覆盖 16 道新题）；生产构建干净；线上可访问。

## 11. 风险与对策

| 风险 | 对策 |
|---|---|
| 分析题（留存/漏斗/gaps-islands）答案易算错 | EVENTS_SEED 数据小到可手算；soundness + 内容 reviewer 实跑核对双保险 |
| 第二高工资/上升温度等边界（并列、NULL、无解） | 题面明确边界期望；solution 处理 NULL/并列；reviewer 专门核边界用例 |
| 同义不同写法的判题误判 | 以结果集为准、明确 `orderMatters`；报表题需排序则设 true 并在题面说清排序 |
| 多个 module8 小种子增加体积 | 种子都很小（每张几行）；与 SHOP_SEED 一样内联在题库文件，易 review |
| 内容量大（16 题 + 概念课） | 沿用 5-6 的双 reviewer 流程；soundness 强制每题自洽 |
