# 模块 7–8（实战场景 + 面试冲刺）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 SQL 道场加模块 7（实战场景：留存/漏斗/分群/gaps-islands/DAU，Senior）+ 模块 8（面试冲刺：LeetCode 式高频题，冲刺），补齐 8 模块路线图。

**Architecture:** 纯内容，引擎零改动。模块 7 共享一份事件流数据集 `EVENTS_SEED`；模块 8 用几张小型面试表 + 复用 `SHOP_SEED`。全部走现有结果集判题。`TierKey` 的 `senior`/`sprint` 与 `TIER_BADGE` 均已存在。

**Tech Stack:** PGlite（真 Postgres）、Vitest、Next.js 16、TypeScript。

参考 spec：`docs/superpowers/specs/2026-06-16-sql-dojo-modules-7-8-design.md`

> **答案已逐一对 seed 数据手算核对**（见每题注释）。实现后必跑 `npx vitest run content/`（soundness 证明每题 solution 能跑且确定）；个别 Postgres 函数（`FILTER`、`date_trunc`、`to_char`、`row_number` 日期运算）若 PGlite 行为异常导致 soundness 失败，**只调该题 SQL 使标准答案确定性通过、保持题意**，不要改判题器。

---

## File Structure

**新建：**
- `content/exercises/module7.ts` — `EVENTS_SEED` + 8 题
- `content/exercises/module8.ts` — 4 张小种子 + 8 题

**修改：**
- `content/exercises/index.ts` — 注册 module7/module8
- `content/modules/index.ts` — 加 m7/m8 的 `ModuleDef`（含概念课）

**不改：** lib/、components/（引擎/UI 零改动）。

约定：测试 `npx vitest run <path>`；提交信息中文、**不带 Co-Authored-By**。

---

## Task 1: 模块 7「实战场景」内容（EVENTS_SEED + 8 题 + 概念课）

**Files:**
- Create: `content/exercises/module7.ts`
- Modify: `content/exercises/index.ts`
- Modify: `content/modules/index.ts`

- [ ] **Step 1: 写 module7.ts**

Create `content/exercises/module7.ts`:

```ts
import type { Exercise } from '@/lib/sql/types';

// 模块 7：实战场景。共享事件流数据集。
// 用户注册 cohort：2026-01 = {1,2,6}(3人)、2026-02 = {3,4}(2人)、2026-03 = {5}(1人)。
// 漏斗(去重用户)：view={1,2,3,4,5}=5、cart={1,2,3}=3、purchase={1,2}=2。
// 次月留存(注册当月活跃且次月仍活跃)={1,2,3}=3。
export const EVENTS_SEED = `
CREATE TABLE app_user (id integer PRIMARY KEY, signup_date date);
CREATE TABLE event (id integer PRIMARY KEY, user_id integer, kind text, ts date);
INSERT INTO app_user VALUES
  (1,'2026-01-05'),(2,'2026-01-20'),(3,'2026-02-03'),(4,'2026-02-15'),(5,'2026-03-02'),(6,'2026-01-10');
INSERT INTO event VALUES
  (1,1,'view','2026-01-05'),(2,1,'cart','2026-01-06'),(3,1,'purchase','2026-01-07'),
  (4,1,'login','2026-02-10'),(5,1,'login','2026-02-11'),(6,1,'login','2026-02-12'),(7,1,'purchase','2026-02-12'),
  (8,2,'view','2026-01-20'),(9,2,'cart','2026-01-21'),(10,2,'purchase','2026-01-22'),
  (11,2,'login','2026-02-05'),(12,2,'login','2026-02-06'),(13,2,'login','2026-02-09'),
  (14,3,'view','2026-02-03'),(15,3,'cart','2026-02-04'),(16,3,'login','2026-03-02'),
  (17,4,'view','2026-02-15'),
  (18,5,'view','2026-03-02'),
  (19,6,'login','2026-01-20');
`;

export const module7Exercises: Exercise[] = [
  {
    id: 'm7-01',
    moduleId: 'm7',
    title: '注册 cohort 规模',
    difficulty: 3,
    // 期望：2026-01→3, 2026-02→2, 2026-03→1
    prompt: '按注册月份统计用户数：输出月份 mon（YYYY-MM 文本）和该月注册用户数 cnt。',
    seedSql: EVENTS_SEED,
    starterSql: "SELECT to_char(signup_date,'YYYY-MM') AS mon, count(*) AS cnt\nFROM app_user\nGROUP BY 1;",
    solutionSql:
      "SELECT to_char(signup_date,'YYYY-MM') AS mon, count(*)::int AS cnt FROM app_user GROUP BY to_char(signup_date,'YYYY-MM');",
    orderMatters: false,
    hints: ["to_char(日期,'YYYY-MM') 取年月字符串；按它分组计数。"],
  },
  {
    id: 'm7-02',
    moduleId: 'm7',
    title: '漏斗各步人数',
    difficulty: 4,
    // 期望：view_users=5, cart_users=3, purchase_users=2
    prompt:
      '统计漏斗各步的去重用户数：分别有多少用户做过 view / cart / purchase。输出三列 view_users、cart_users、purchase_users。',
    seedSql: EVENTS_SEED,
    starterSql:
      "SELECT\n  count(DISTINCT user_id) FILTER (WHERE kind='view') AS view_users,\n  count(DISTINCT user_id) FILTER (WHERE kind='cart') AS cart_users,\n  count(DISTINCT user_id) FILTER (WHERE kind='purchase') AS purchase_users\nFROM event;",
    solutionSql:
      "SELECT count(DISTINCT user_id) FILTER (WHERE kind='view')::int AS view_users, count(DISTINCT user_id) FILTER (WHERE kind='cart')::int AS cart_users, count(DISTINCT user_id) FILTER (WHERE kind='purchase')::int AS purchase_users FROM event;",
    orderMatters: false,
    hints: ["count(DISTINCT user_id) FILTER (WHERE kind='view') 一次算出某一步的去重人数。"],
  },
  {
    id: 'm7-03',
    moduleId: 'm7',
    title: '漏斗转化率',
    difficulty: 4,
    // 期望：100.0 * 2 / 5 = 40.0
    prompt:
      'purchase 用户数 / view 用户数 的转化率，按百分比保留 1 位小数输出（列名 rate）。例如 40.0 表示 40%。',
    seedSql: EVENTS_SEED,
    starterSql:
      "SELECT round(100.0 * count(DISTINCT user_id) FILTER (WHERE kind='purchase')\n  / count(DISTINCT user_id) FILTER (WHERE kind='view'), 1) AS rate\nFROM event;",
    solutionSql:
      "SELECT round(100.0 * count(DISTINCT user_id) FILTER (WHERE kind='purchase') / count(DISTINCT user_id) FILTER (WHERE kind='view'), 1) AS rate FROM event;",
    orderMatters: false,
    hints: ['先乘 100.0（变小数避免整除），再 round(..., 1) 保留一位。'],
  },
  {
    id: 'm7-04',
    moduleId: 'm7',
    title: '次月留存用户数',
    difficulty: 5,
    // 期望：3（用户 1,2,3 注册当月活跃且次月仍有活跃）
    prompt:
      '统计"次月留存"用户数：注册当月有活跃、且注册次月（下个月）仍有活跃的用户数。输出单个数 retained。',
    seedSql: EVENTS_SEED,
    starterSql:
      "SELECT count(*) AS retained\nFROM app_user u\nWHERE EXISTS (\n  SELECT 1 FROM event e\n  WHERE e.user_id = u.id\n    AND date_trunc('month', e.ts) = date_trunc('month', u.signup_date) + interval '1 month'\n);",
    solutionSql:
      "SELECT count(*)::int AS retained FROM app_user u WHERE EXISTS (SELECT 1 FROM event e WHERE e.user_id = u.id AND date_trunc('month', e.ts) = date_trunc('month', u.signup_date)) AND EXISTS (SELECT 1 FROM event e WHERE e.user_id = u.id AND date_trunc('month', e.ts) = date_trunc('month', u.signup_date) + interval '1 month');",
    orderMatters: false,
    hints: ["date_trunc('month', ts) 把日期归到月初；次月 = 注册月 + interval '1 month'。"],
  },
  {
    id: 'm7-05',
    moduleId: 'm7',
    title: '用户价值分群',
    difficulty: 4,
    // 期望：高(>=2购买)=1人(用户1), 中(=1)=1人(用户2), 低(=0)=4人(3,4,5,6)
    prompt:
      '按购买次数把用户分群：>=2 次记"高"、=1 次记"中"、0 次记"低"。输出分群 seg 和该群用户数 users。',
    seedSql: EVENTS_SEED,
    starterSql:
      "WITH pc AS (\n  SELECT u.id, count(e.id) FILTER (WHERE e.kind='purchase') AS cnt\n  FROM app_user u LEFT JOIN event e ON e.user_id = u.id\n  GROUP BY u.id\n)\nSELECT CASE WHEN cnt>=2 THEN '高' WHEN cnt=1 THEN '中' ELSE '低' END AS seg,\n       count(*) AS users\nFROM pc GROUP BY 1;",
    solutionSql:
      "WITH pc AS (SELECT u.id, count(e.id) FILTER (WHERE e.kind='purchase') AS cnt FROM app_user u LEFT JOIN event e ON e.user_id = u.id GROUP BY u.id) SELECT CASE WHEN cnt>=2 THEN '高' WHEN cnt=1 THEN '中' ELSE '低' END AS seg, count(*)::int AS users FROM pc GROUP BY CASE WHEN cnt>=2 THEN '高' WHEN cnt=1 THEN '中' ELSE '低' END;",
    orderMatters: false,
    hints: ['先 LEFT JOIN 算每个用户的购买次数（没买的算 0），再用 CASE 分桶后分组计数。'],
  },
  {
    id: 'm7-06',
    moduleId: 'm7',
    title: '最长连续登录天数（gaps-and-islands）',
    difficulty: 5,
    // 期望：(1,3),(2,2),(3,1),(6,1)
    prompt:
      '对每位有 login 的用户，求其最长连续登录天数。输出 user_id 和 max_streak。（连续 = 相邻日期相差 1 天。）',
    seedSql: EVENTS_SEED,
    starterSql:
      "WITH d AS (SELECT DISTINCT user_id, ts FROM event WHERE kind='login'),\n     g AS (SELECT user_id, ts - (row_number() OVER (PARTITION BY user_id ORDER BY ts))::int AS grp\n           FROM d)\nSELECT user_id, max(c) AS max_streak FROM (\n  SELECT user_id, grp, count(*) AS c FROM g GROUP BY user_id, grp\n) s GROUP BY user_id;",
    solutionSql:
      "WITH d AS (SELECT DISTINCT user_id, ts FROM event WHERE kind='login'), g AS (SELECT user_id, ts - (row_number() OVER (PARTITION BY user_id ORDER BY ts))::int AS grp FROM d) SELECT user_id, max(c)::int AS max_streak FROM (SELECT user_id, grp, count(*) AS c FROM g GROUP BY user_id, grp) s GROUP BY user_id;",
    orderMatters: false,
    hints: ['经典套路：连续日期减去行号得到不变的分组键；同一键就是一段连续区间，count 即长度。'],
  },
  {
    id: 'm7-07',
    moduleId: 'm7',
    title: '每日活跃用户 DAU',
    difficulty: 3,
    // 期望：16 行，01-20=2、03-02=2，其余各 1
    prompt: '统计每天的活跃用户数 DAU（按 ts 分组，对 user_id 去重）。输出 ts 和 dau，按 ts 升序。',
    seedSql: EVENTS_SEED,
    starterSql: 'SELECT ts, count(DISTINCT user_id) AS dau\nFROM event\nGROUP BY ts\nORDER BY ts;',
    solutionSql:
      'SELECT ts, count(DISTINCT user_id)::int AS dau FROM event GROUP BY ts ORDER BY ts;',
    orderMatters: true,
    hints: ['一天可能有同一用户多条事件，所以 count(DISTINCT user_id)；按 ts 分组并升序。'],
  },
  {
    id: 'm7-08',
    moduleId: 'm7',
    title: 'Boss：各 cohort 购买转化',
    difficulty: 5,
    // 期望：(2026-01,3,2),(2026-02,2,0),(2026-03,1,0)
    prompt:
      '按注册月统计：该 cohort 的用户数 users，以及其中购买过的用户数 buyers。输出 cohort（YYYY-MM）、users、buyers，按 cohort 升序。',
    seedSql: EVENTS_SEED,
    starterSql:
      "WITH buyer AS (SELECT DISTINCT user_id FROM event WHERE kind='purchase')\nSELECT to_char(u.signup_date,'YYYY-MM') AS cohort,\n       count(*) AS users,\n       count(b.user_id) AS buyers\nFROM app_user u LEFT JOIN buyer b ON b.user_id = u.id\nGROUP BY 1 ORDER BY 1;",
    solutionSql:
      "WITH buyer AS (SELECT DISTINCT user_id FROM event WHERE kind='purchase') SELECT to_char(u.signup_date,'YYYY-MM') AS cohort, count(*)::int AS users, count(b.user_id)::int AS buyers FROM app_user u LEFT JOIN buyer b ON b.user_id = u.id GROUP BY to_char(u.signup_date,'YYYY-MM') ORDER BY to_char(u.signup_date,'YYYY-MM');",
    orderMatters: true,
    hints: ['先取购买过的用户集合 buyer，再 LEFT JOIN 回 app_user；count(b.user_id) 只数匹配到的（买家）。'],
  },
];
```

- [ ] **Step 2: 注册 module7 + 加 ModuleDef/概念课**

`content/exercises/index.ts`：加 import `import { module7Exercises } from './module7';` 并在 `allExercises` 末尾加 `...module7Exercises,`。

`content/modules/index.ts`：在 m6 对象之后、`];` 之前，加 m7 的 `ModuleDef`：

```ts
  {
    id: 'm7',
    order: 7,
    title: '实战场景',
    tierKey: 'senior',
    tierLabel: 'Senior',
    summary: '把 SQL 用到业务分析：留存、漏斗、分群、连续活跃、DAU。',
    lesson: [
      '## 实战场景：把 SQL 用到业务分析',
      '',
      'senior 数据岗每天都在算这些——留存、漏斗、分群。',
      '',
      '### 留存 cohort',
      '',
      '把用户按"注册月"分组（cohort），看后续各月还有多少人活跃。**次月留存** = 注册当月活跃、且次月仍活跃的用户（比例）。`date_trunc(\'month\', ts)` 把日期归到月初便于按月比较。',
      '',
      '### 漏斗 funnel',
      '',
      '一串递进事件（浏览 → 加购 → 下单），每步人数递减；**转化率** = 末步人数 / 首步人数。用 `count(DISTINCT user_id) FILTER (WHERE kind = \'view\')` 一次算出各步的去重人数。',
      '',
      '### 用户分群',
      '',
      '按行为（如购买次数）用 `CASE` 分桶成 高 / 中 / 低 价值。',
      '',
      '### gaps-and-islands（连续区间）',
      '',
      '求"连续活跃天数"的经典套路：**连续日期减去其行号 `row_number()` 得到一个不变的分组键**，同一键即一段连续区间，`count` 就是长度。',
      '',
      '### DAU',
      '',
      '每天活跃用户数 = 按天 `count(DISTINCT user_id)`。',
    ].join('\n'),
  },
```

- [ ] **Step 3: 跑 soundness + integrity**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run content/`
Expected: 全绿。**若某题失败**（多为 PGlite 对 `FILTER`/`date_trunc`/`row_number` 日期运算的细节）：读失败信息，仅微调该题 SQL 使标准答案确定性通过、保持题意（答案应符合该题注释里手算的期望值），重跑直到全绿。不要改判题器。

- [ ] **Step 4: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add content/exercises/module7.ts content/exercises/index.ts content/modules/index.ts
git commit -m "feat: 模块7 实战场景(留存/漏斗/分群/gaps-islands/DAU,8题+概念课)"
```

---

## Task 2: 模块 8「面试冲刺」内容（4 小种子 + 8 题 + 概念课）

**Files:**
- Create: `content/exercises/module8.ts`
- Modify: `content/exercises/index.ts`
- Modify: `content/modules/index.ts`

- [ ] **Step 1: 写 module8.ts**

Create `content/exercises/module8.ts`:

```ts
import type { Exercise } from '@/lib/sql/types';
import { SHOP_SEED } from './module2';

// 模块 8：面试冲刺。LeetCode 式高频题，按题用小种子，并复用电商 SHOP_SEED。
const EMP_SEED = `
CREATE TABLE dept (id integer PRIMARY KEY, name text);
CREATE TABLE emp (id integer PRIMARY KEY, name text, salary integer, dept_id integer);
INSERT INTO dept VALUES (1,'工程'),(2,'销售');
INSERT INTO emp VALUES (1,'Ann',9000,1),(2,'Bob',8000,1),(3,'Cara',9000,1),(4,'Dan',7000,2),(5,'Eve',6000,2);
`;
const PERSON_SEED = `
CREATE TABLE person (id integer PRIMARY KEY, email text);
INSERT INTO person VALUES (1,'a@x.com'),(2,'b@x.com'),(3,'a@x.com'),(4,'c@x.com'),(5,'b@x.com');
`;
const LOGS_SEED = `
CREATE TABLE logs (id integer PRIMARY KEY, num integer);
INSERT INTO logs VALUES (1,1),(2,1),(3,1),(4,2),(5,1),(6,2),(7,2);
`;
const WEATHER_SEED = `
CREATE TABLE weather (id integer PRIMARY KEY, rec_date date, temp integer);
INSERT INTO weather VALUES (1,'2026-01-01',10),(2,'2026-01-02',12),(3,'2026-01-03',11),(4,'2026-01-04',15);
`;

export const module8Exercises: Exercise[] = [
  {
    id: 'm8-01',
    moduleId: 'm8',
    title: '第二高的工资',
    difficulty: 3,
    // 期望：8000（distinct 工资 9000/8000/7000/6000，第二高=8000）
    prompt: '查出第二高的工资 second（去重后第二高；若不存在应为 NULL）。',
    seedSql: EMP_SEED,
    starterSql: 'SELECT max(salary) AS second\nFROM emp\nWHERE salary < (SELECT max(salary) FROM emp);',
    solutionSql:
      'SELECT max(salary)::int AS second FROM emp WHERE salary < (SELECT max(salary) FROM emp);',
    orderMatters: false,
    hints: ['先排除最高工资，再取剩下里的最高；没有第二高时 max 自然返回 NULL。'],
  },
  {
    id: 'm8-02',
    moduleId: 'm8',
    title: '连续出现三次的数字',
    difficulty: 4,
    // 期望：1（id 1,2,3 都是 1，三连）
    prompt: '找出在 logs 中按 id 连续出现至少 3 次的数字 num。',
    seedSql: LOGS_SEED,
    starterSql:
      'SELECT DISTINCT l1.num\nFROM logs l1\nJOIN logs l2 ON l2.id = l1.id + 1 AND l2.num = l1.num\nJOIN logs l3 ON l3.id = l1.id + 2 AND l3.num = l1.num;',
    solutionSql:
      'SELECT DISTINCT l1.num FROM logs l1 JOIN logs l2 ON l2.id = l1.id + 1 AND l2.num = l1.num JOIN logs l3 ON l3.id = l1.id + 2 AND l3.num = l1.num;',
    orderMatters: false,
    hints: ['自连接 id+1、id+2 且 num 相同，三行连上就是连续三次。'],
  },
  {
    id: 'm8-03',
    moduleId: 'm8',
    title: '重复的邮箱',
    difficulty: 2,
    // 期望：a@x.com, b@x.com
    prompt: '找出 person 表里重复（出现 >1 次）的邮箱 email。',
    seedSql: PERSON_SEED,
    starterSql: 'SELECT email\nFROM person\nGROUP BY email\nHAVING count(*) > 1;',
    solutionSql: 'SELECT email FROM person GROUP BY email HAVING count(*) > 1;',
    orderMatters: false,
    hints: ['按 email 分组，HAVING count(*) > 1 留下重复的。'],
  },
  {
    id: 'm8-04',
    moduleId: 'm8',
    title: '从不下单的客户',
    difficulty: 3,
    // 期望：阿强（SHOP_SEED 里客户 5 无订单）
    prompt: '找出从来没有下过单的客户 name（电商数据集）。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT name FROM customers c\nWHERE NOT EXISTS (\n  SELECT 1 FROM orders o WHERE o.customer_id = c.id\n);',
    solutionSql:
      'SELECT name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);',
    orderMatters: false,
    hints: ['NOT EXISTS 子查询：客户没有任何匹配订单。也可用 LEFT JOIN ... WHERE o.id IS NULL。'],
  },
  {
    id: 'm8-05',
    moduleId: 'm8',
    title: '部门最高薪员工',
    difficulty: 4,
    // 期望：(工程,Ann,9000),(工程,Cara,9000),(销售,Dan,7000)
    prompt: '找出每个部门工资最高的员工。输出部门 dept、员工 emp、工资 salary（并列都要）。',
    seedSql: EMP_SEED,
    starterSql:
      'SELECT d.name AS dept, e.name AS emp, e.salary\nFROM emp e JOIN dept d ON d.id = e.dept_id\nWHERE e.salary = (SELECT max(salary) FROM emp e2 WHERE e2.dept_id = e.dept_id);',
    solutionSql:
      'SELECT d.name AS dept, e.name AS emp, e.salary FROM emp e JOIN dept d ON d.id = e.dept_id WHERE e.salary = (SELECT max(salary) FROM emp e2 WHERE e2.dept_id = e.dept_id);',
    orderMatters: false,
    hints: ['相关子查询取本部门最高薪；等于它的就是最高薪员工（并列都留）。'],
  },
  {
    id: 'm8-06',
    moduleId: 'm8',
    title: '工资排名（dense_rank）',
    difficulty: 3,
    // 期望：(Ann,9000,1),(Cara,9000,1),(Bob,8000,2),(Dan,7000,3),(Eve,6000,4)
    prompt: '给所有员工按工资从高到低用 dense_rank 排名。输出 name、salary、rnk（并列同名次、名次不跳号）。',
    seedSql: EMP_SEED,
    starterSql: 'SELECT name, salary,\n  dense_rank() OVER (ORDER BY salary DESC) AS rnk\nFROM emp;',
    solutionSql:
      'SELECT name, salary, dense_rank() OVER (ORDER BY salary DESC)::int AS rnk FROM emp;',
    orderMatters: false,
    hints: ['dense_rank() 并列同名次且不跳号（9000,9000 都是 1，下一个 8000 是 2）。'],
  },
  {
    id: 'm8-07',
    moduleId: 'm8',
    title: '上升的温度',
    difficulty: 4,
    // 期望：id 2（12>10）、id 4（15>11）
    prompt: '找出比"前一天"温度更高的记录 id（前一天 = rec_date 减 1 天）。',
    seedSql: WEATHER_SEED,
    starterSql:
      'SELECT w.id\nFROM weather w\nJOIN weather p ON p.rec_date = w.rec_date - 1\nWHERE w.temp > p.temp;',
    solutionSql:
      'SELECT w.id FROM weather w JOIN weather p ON p.rec_date = w.rec_date - 1 WHERE w.temp > p.temp;',
    orderMatters: false,
    hints: ['自连接：用 rec_date - 1 找到前一天那行，再比较 temp。'],
  },
  {
    id: 'm8-08',
    moduleId: 'm8',
    title: 'Boss：各部门工资 Top-2',
    difficulty: 5,
    // 期望：(工程,Ann,9000,1),(工程,Cara,9000,1),(工程,Bob,8000,2),(销售,Dan,7000,1),(销售,Eve,6000,2)
    prompt:
      '取每个部门工资 Top-2（按 dense_rank，并列算同名次）。输出 dept、name、salary、rnk。',
    seedSql: EMP_SEED,
    starterSql:
      'SELECT dept, name, salary, rnk FROM (\n  SELECT d.name AS dept, e.name AS name, e.salary AS salary,\n    dense_rank() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rnk\n  FROM emp e JOIN dept d ON d.id = e.dept_id\n) t WHERE rnk <= 2;',
    solutionSql:
      'SELECT dept, name, salary, rnk FROM (SELECT d.name AS dept, e.name AS name, e.salary AS salary, dense_rank() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC)::int AS rnk FROM emp e JOIN dept d ON d.id = e.dept_id) t WHERE rnk <= 2;',
    orderMatters: false,
    hints: ['先在子查询里按部门 PARTITION 算 dense_rank，再外层筛 rnk <= 2（Top-N per group）。'],
  },
];
```

- [ ] **Step 2: 注册 module8 + 加 ModuleDef/概念课**

`content/exercises/index.ts`：加 import `import { module8Exercises } from './module8';` 并在 `allExercises` 末尾加 `...module8Exercises,`。

`content/modules/index.ts`：在 m7 对象之后、`];` 之前，加 m8 的 `ModuleDef`：

```ts
  {
    id: 'm8',
    order: 8,
    title: '面试冲刺',
    tierKey: 'sprint',
    tierLabel: '冲刺',
    summary: 'LeetCode 式 SQL 高频真题，练套路与边界正确性。',
    lesson: [
      '## 面试冲刺：高频 SQL 真题套路',
      '',
      '面试常考这几类套路，重点是**边界正确性**（空结果、并列、NULL）。',
      '',
      '- **第 N 高 / Top-N per group**：`dense_rank() OVER (PARTITION BY ... ORDER BY ... DESC)`，外层取 `rnk <= N`；并列用 `dense_rank`（不跳号）。',
      '- **连续出现 N 次**：自连接 `id+1` / `id+2`，或 gaps-and-islands。',
      '- **找重复**：`GROUP BY 列 HAVING count(*) > 1`。',
      '- **"从不…"**：`NOT EXISTS` 子查询，或 `LEFT JOIN ... WHERE 右表 IS NULL`。',
      '- **相邻比较**：自连接，如天气按 `rec_date = 前一天 + 1` 比温度。',
      '',
      '> 边界：第二高工资不存在时应返回 `NULL`；排名要分清 `rank`（跳号）/ `dense_rank`（不跳号）/ `row_number`（强制唯一）。',
    ].join('\n'),
  },
```

- [ ] **Step 3: 跑 soundness + integrity**

Run: `cd /home/ubuntu/sql-dojo && npx vitest run content/`
Expected: 全绿（含模块 7、8 全部新题）。失败处理同 Task 1 Step 3（仅微调题目 SQL，对照注释里的期望值，不改判题器）。

- [ ] **Step 4: 提交**

```bash
cd /home/ubuntu/sql-dojo
git add content/exercises/module8.ts content/exercises/index.ts content/modules/index.ts
git commit -m "feat: 模块8 面试冲刺(LeetCode式8题+概念课)"
```

---

## Task 3: 全量验证 + 部署 + 收尾

**Files:**（无新增）

- [ ] **Step 1: 全量测试 + 类型检查 + 构建**

Run:
```bash
cd /home/ubuntu/sql-dojo
npx vitest run
npx tsc --noEmit
npm run build
```
Expected: vitest 全绿（原有 134 + 模块 7/8 的 16 道 soundness = 150）；tsc 干净；build 成功，`/learn/m7`、`/learn/m8`、`/exercise/m7-01`、`/exercise/m8-01` 等路由出现。

- [ ] **Step 2: 部署**

Run: `cd /home/ubuntu/sql-dojo && npm run deploy`
Expected: 部署成功，线上 `https://sql-dojo.pp-account.workers.dev`。

- [ ] **Step 3: 真浏览器抽查（线上）**

用 browser-harness（`new_tab`、PGlite 页等待，编辑器填值用 `execCommand('insertText')`、点"运行"用 JS 找按钮 `.click()`，全程同一新标签避免 stale tab）：
1. `/learn` 出现模块 7（🔴 Senior）、模块 8（🔵 冲刺）两段位卡，8 模块齐全。
2. 进 `/exercise/m7-06`（gaps-islands）：贴标准答案 → "运行" → 判通过 ✅，结果表含 (1,3)(2,2)(3,1)(6,1)。
3. 进 `/exercise/m8-01`（第二高工资）：贴标准答案 → 判通过 ✅，结果 8000。
4. 故意写错（如 m8-01 改成 max(salary)）→ 判失败 ❌。

Expected: 1–4 全过。失败用 systematic-debugging 定位。

- [ ] **Step 4: 收尾**

- 更新记忆 `project_sql_dojo.md` + `MEMORY.md`：模块 7–8 上线，8 模块路线图闭环（小白→Senior→冲刺）；EVENTS_SEED 事件流数据集；纯内容无引擎改动。
- `git push origin main`（先合并分支，见执行收尾）。
- 向用户汇报：模块 7–8 上线、8 模块全齐、线上 URL、抽查结果。

---

## Self-Review（写完计划的回查）

**Spec 覆盖：**
- §4 EVENTS_SEED（app_user + event，cohort/漏斗/留存可手算）→ Task 1 Step 1 ✓
- §5 模块 7 八题（cohort/漏斗/转化/留存/分群/gaps-islands/DAU/Boss）→ Task 1，每题带手算期望注释 ✓
- §6 模块 8 数据集（EMP/PERSON/LOGS/WEATHER + 复用 SHOP_SEED）→ Task 2 Step 1 ✓
- §7 模块 8 八题（第二高薪/连续三次/重复邮箱/从不下单/部门最高薪/排名/上升温度/Boss）→ Task 2 ✓
- §8 段位（m7 senior、m8 sprint，无需改 TierKey/TIER_BADGE）→ Task 1/2 ModuleDef ✓
- §9 测试（soundness/integrity 覆盖 + 内容 reviewer + 浏览器抽查）→ Task 1/2 Step 3 + Task 3 ✓
- §10 验收（路线图两卡、分析题/面试题判对、build 干净）→ Task 3 ✓
- §2 非目标（EXPLAIN 实验室/AI批改/成就，引擎零改动）→ 计划未触碰 lib/组件 ✓

**占位扫描：** 无 TODO/TBD；16 题均给完整 prompt/seedSql/starterSql/solutionSql/hints + 手算期望注释。soundness 失败有"对照注释期望微调题目 SQL"的确定性指引（非占位）。

**类型一致性：** 沿用既有 `Exercise`（含 5-6 引入的可选 `checkSql`，本批未用）；`module7Exercises`/`module8Exercises`/`EVENTS_SEED` 命名与 import 一致；`ModuleDef` 字段（id/order/title/tierKey/tierLabel/summary/lesson）与现有 m1–m6 一致；order 7/8 唯一升序（满足 integrity）；m7 `senior`、m8 `sprint` 均在现有 `TierKey` 内。
