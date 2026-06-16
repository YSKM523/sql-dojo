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
      "-- 两个条件都要：① 注册当月有活跃 ② 次月仍有活跃\nSELECT count(*) AS retained\nFROM app_user u\nWHERE EXISTS (  -- ① 注册当月有活跃\n  SELECT 1 FROM event e WHERE e.user_id = u.id\n    AND date_trunc('month', e.ts) = date_trunc('month', u.signup_date)\n)\n  AND EXISTS (  -- ② 次月仍有活跃：补全下面的条件\n  SELECT 1 FROM event e WHERE e.user_id = u.id\n    AND date_trunc('month', e.ts) = ...\n);",
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
