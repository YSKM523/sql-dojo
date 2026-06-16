# SQL 道场 — 模块 5–6（建模/DDL + 性能/优化）+ checkSql 判题扩展 设计文档

- 日期：2026-06-16
- 状态：已通过头脑风暴确认，待进入实现计划
- 上游：`2026-06-15-sql-dojo-design.md`（总设计）§7 课程路线图、§8.2 执行计划、§9 判题
- 前置：Phase 1（模块 1–4 + 练习场 + AI 副驾 + 游客进度）与 登录+D1 云同步 均已上线

---

## 1. 目标与动机

当前课程止步于**模块 4（窗口函数，中级）**，未兑现总设计"练到 senior"的承诺。模块 5–8 才是 senior 内容；本 spec 交付其中第一批：**模块 5（建模与 DDL，进阶）+ 模块 6（性能与优化，senior）**。

模块 5/6 的题超出"写 SELECT 比结果集"的现有判题能力——DDL 题用户写的是 `CREATE`/`INSERT`（无结果集可比）。因此本 spec 含一个**小而通用的判题扩展 `checkSql`**（先建后验），它也为后续 UPDATE/DELETE/INSERT 类题铺路。

## 2. 范围与拆分

模块 5–8 共约 32 题 + 4 概念课 + 判题扩展，**一个实现计划过大**。拆两批：

- **本 spec（5–6）**：模块 5（建模/DDL）+ 模块 6（性能/优化）+ `checkSql` 判题扩展 + `TierKey` 加 `'advanced'`。
- **下一 spec（7–8）**：模块 7（留存/漏斗/cohort 实战）+ 模块 8（面试冲刺）——纯结果集题，跑在已扩展框架上，含新的事件流数据集。

**非目标（YAGNI / 留后续）**：
- 交互式"执行计划实验室"（§8.2 点按钮看 plan 树）——单独的功能，本 spec 只在概念课讲 EXPLAIN。
- 事务（BEGIN/COMMIT/ROLLBACK）出题——本 harness 每次 run 用 BEGIN/ROLLBACK 隔离，事务语义不好判；模块 5 概念课讲事务，但**不出事务练习题**。
- 模块 7–8（下一 spec）。
- 任何前端组件改动（见 §4，Playground 零改动）。

## 3. 判题扩展：`checkSql`（唯一的架构改动）

### 3.1 问题

现有 `ExerciseJudge`（`lib/sql/judgeExercise.ts`）：在 `SqlSession(seedSql)` 上跑 `solutionSql` 得期望、跑 `userSql` 得实际，`compareResults` 比对。`SqlSession.run` 用 `db.query()`（**单语句**）。DDL 题用户提交多语句 `CREATE ...; INSERT ...`，既无结果集、又是多语句，现有判题无法处理。

### 3.2 方案（A：先建后验）

给 `Exercise` 加可选字段：

```ts
// lib/sql/types.ts
checkSql?: string;
// 语义：若存在，则判题= 把"提交的 SQL"当 setup（exec 多语句）跑完后，
//       再跑 checkSql（query 单语句）取结果；
//       与「solutionSql 当 setup + 同一 checkSql」的结果做同样的 compareResults 比对。
//       不存在时维持现状（直接比 userSql 自身的结果集）。
```

**`SqlSession` 新增方法**（`lib/sql/runner.ts`）：

```ts
async runCheck(setupSql: string, checkSql: string): Promise<ResultSet> {
  // 确保已种子；BEGIN → exec(setupSql)（支持多语句 DDL）→ query(checkSql) → ROLLBACK；
  // 返回 checkSql 的结果；出错抛 SqlError（与 run 一致）。
}
```

**`ExerciseJudge` 分支**：

```ts
// ensureExpected：若 ex.checkSql → this.expected = session.runCheck(ex.solutionSql, ex.checkSql)
//                 否则           → this.expected = session.run(ex.solutionSql)
// judge(userSql)：若 ex.checkSql → actual = session.runCheck(userSql, ex.checkSql)
//                 否则           → actual = session.run(userSql)
//   其余（SqlError 兜底、compareResults(expected, actual, ex.orderMatters)）不变。
```

`judgeExercise()`（一次性封装）签名不变。

### 3.3 为什么不选备选

- **B：查 `information_schema`/`pg_catalog` 验证表结构** —— 写题繁琐、对列序/类型表示脆弱，且无法验证"插入的数据对不对"。
- **C：模块 5 只读不写（不出 DDL 题）** —— 违背"练 senior 真实技能"。

A 最简单、与现有 `compareResults` 复用、且通用（UPDATE/DELETE/INSERT 类题同样适用）。

### 3.4 不变量

- **Playground 零改动**：它渲染 `JudgeResult.actual/expected/verdict`，与 `actual` 如何算出无关。checkSql 题"运行"时，`actual` = checkSql 结果 → 自动作为结果表展示（即"你的库现在长这样"）。
- **soundness 测试天然成立**：`judgeExercise(ex, ex.solutionSql)` 对 checkSql 题 → `runCheck(solutionSql, checkSql)` 必等于 expected → 通过。无需改测试逻辑，只是覆盖到新题。

## 4. 受影响文件

**修改：**
- `lib/sql/types.ts` —— `Exercise` 加 `checkSql?: string`；`TierKey` 加 `'advanced'`。
- `lib/sql/runner.ts` —— `SqlSession` 加 `runCheck(setupSql, checkSql)`。
- `lib/sql/judgeExercise.ts` —— `ExerciseJudge` 按 `ex.checkSql` 分支。
- `content/exercises/index.ts` —— 注册模块 5、6 题库（`allExercises`/`exercisesByModule`/`exerciseNav`）。
- `content/modules/index.ts` —— 加模块 5、6 的 `ModuleDef`（含概念课 Markdown）。

**新建：**
- `content/exercises/module5.ts` —— 模块 5 题库（~8 题）。
- `content/exercises/module6.ts` —— 模块 6 题库（~8 题）。
- `lib/sql/runCheck.test.ts`（或并入 runner 测试）—— `runCheck` 与 checkSql 判题的单测。

**不改：** 任何 React 组件（Playground/ExerciseList/路线图卡等）——它们按数据驱动，新模块/新段位自动出现。

## 5. 模块 5「建模与 DDL」(~8 题，🟠 进阶 / `advanced`)

多为 `checkSql` 题、**空种子**（`seedSql: ''`，用户从零建表）。每题给业务化中文题面 + `starterSql` 脚手架 + `solutionSql`（参考建表/插数）+ `checkSql`（校验查询）。

1. `CREATE TABLE` + 常用类型（TEXT/INTEGER/NUMERIC/BOOLEAN/DATE）
2. `NOT NULL` + `DEFAULT`
3. `PRIMARY KEY` + `UNIQUE`
4. `FOREIGN KEY`（两表关联）
5. `CHECK` 约束（如价格 > 0）
6. 范式化：把一张冗余表拆成两张 + 外键
7. `CREATE INDEX` 基础（建索引后 checkSql 查询仍正确）
8. **Boss**：按业务需求设计完整 schema（多表 + 约束 + 外键 + 插样例数据），checkSql 跑一个跨表 JOIN 验证。

概念课讲：数据类型、约束、主外键、范式 vs 反范式、索引是什么、**事务概念（只讲不出题）**。

## 6. 模块 6「性能与优化」(~8 题，🔴 Senior / `senior`)

**判题靠结果集等价（证明改写前后等价）+ 少量 checkSql（索引）**。数据复用现有 `SHOP_SEED`（电商）。EXPLAIN 在**概念课**里讲并贴真实 plan；练习场可自由跑 `EXPLAIN (ANALYZE)` 探索。

1. 相关/非相关子查询 → `JOIN` 改写（结果集等价）
2. 用 `EXISTS` / `NOT EXISTS` 替代 `IN` / `NOT IN`（含 NULL 陷阱）
3. 列裁剪：避免 `SELECT *`，只取所需列
4. `DISTINCT` vs `GROUP BY` 去重、分页（`LIMIT/OFFSET`）
5. sargable：别用函数包裹被过滤列（改写 `WHERE`，结果等价）
6. `CREATE INDEX` 针对性加索引（checkSql：建索引后目标查询结果正确）
7. 聚合下推 / 提前过滤（`WHERE` vs `HAVING`，减少扫描）
8. **Boss**：综合重写一个"慢查询"（多重子查询 → CTE/JOIN，结果等价）。

概念课讲：`EXPLAIN`/`EXPLAIN ANALYZE` 怎么读、Seq Scan vs Index Scan、索引何时有用、常见反模式（SELECT \*、函数包裹列、`OR` 链、`NOT IN` + NULL）、查询重写思路。

## 7. 段位（TierKey 扩展）

`TierKey` 当前 = `'beginner' | 'intermediate' | 'senior' | 'sprint'`。加 `'advanced'`：

| 模块 | tierKey | tierLabel | 色 |
|---|---|---|---|
| 5 建模与 DDL | `advanced` | 进阶 | 🟠 |
| 6 性能与优化 | `senior` | Senior | 🔴 |

路线图段位树/卡片按 `ModuleDef` 数据驱动，新增段位自动渲染（若某处有 tier→颜色映射，补 `advanced` 一项）。

## 8. 测试策略（TDD）

- **`runCheck` 单测**（`lib/sql/` 下，真 PGlite）：在空种子上 `exec` 建表+插数、`query` 校验，验证返回 checkSql 结果且 ROLLBACK 不污染（连跑两次互不影响）；多语句 setup 正常；setup 出错抛 SqlError。
- **checkSql 判题单测**：构造一个最小 checkSql 练习，正确提交 → passed，结构/数据错误提交 → failed。
- **soundness 测试**：现有 `content/soundness.test.ts` 自动覆盖模块 5、6 全部新题（每题 `solutionSql` 过自身判题）——含 checkSql 题。
- **integrity 测试**：现有 `content/integrity.test.ts` 自动覆盖（id 唯一、moduleId 合法、字段完整等；如其断言依赖结构，补 checkSql 题的字段约束）。
- 新模块上线后用真浏览器抽查 1–2 道（DDL 题运行显示 checkSql 结果、判对判错正常）。

## 9. 验收标准

- 路线图 `/learn` 出现模块 5（🟠 进阶）、模块 6（🔴 Senior）两段位卡，进度可统计。
- 模块 5 DDL 题：用户从零写 `CREATE/INSERT`，"运行"显示校验查询结果，判对错正确；Boss 设计 schema 题可过。
- 模块 6 题：改写等价判对、加索引题判对；概念课能读到 EXPLAIN 讲解。
- `npx vitest run` 全绿（含 runCheck/checkSql 新测 + soundness 覆盖新题）；生产构建干净；线上可访问。

## 10. 风险与对策

| 风险 | 对策 |
|---|---|
| checkSql 题的 setup 多语句在 PGlite 行为 | `db.exec` 支持多语句；`runCheck` 用 exec 跑 setup、query 跑 check；单测覆盖 |
| DDL 题用户漏建某列/约束导致 checkSql 报错 | judge 的 SqlError 兜底 → 友好 verdict（"SQL 报错：…"），与现有一致 |
| 模块 6 改写题"结果集等价"但顺序不定 | 沿用 `orderMatters` 语义；改写题一般 `orderMatters:false`（集合比对） |
| 内容质量（~16 题正确性） | soundness 测试强制每题 solution 自洽；题面/答案人工校对 |
| TierKey 新增档遗漏颜色映射 | 全局搜 tier→样式映射处补 `advanced`；段位树数据驱动 |
| 事务难判被强行出题 | 明确非目标：事务只在概念课讲，不出练习题 |
