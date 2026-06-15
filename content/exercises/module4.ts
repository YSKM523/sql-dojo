import type { Exercise } from '@/lib/sql/types';
import { SHOP_SEED } from './module2';

export const module4Exercises: Exercise[] = [
  {
    id: 'm4-01',
    moduleId: 'm4',
    title: '每位客户的订单排名',
    difficulty: 4,
    prompt: '为每位客户的订单，按 amount 从大到小标出名次 rn，输出 customer_id、amount、rn。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT customer_id, amount,\n  row_number() OVER (PARTITION BY ... ORDER BY ...) AS rn\nFROM orders;',
    solutionSql:
      'SELECT customer_id, amount, row_number() OVER (PARTITION BY customer_id ORDER BY amount DESC)::int AS rn FROM orders;',
    orderMatters: false,
    hints: ['窗口函数 OVER(PARTITION BY 客户 ORDER BY 金额 DESC)，每个客户单独排。'],
  },
  {
    id: 'm4-02',
    moduleId: 'm4',
    title: '全站订单金额排名',
    difficulty: 3,
    prompt: '对所有订单按 amount 从大到小用 rank() 排名，输出 id、amount、rk。',
    seedSql: SHOP_SEED,
    starterSql: 'SELECT id, amount, rank() OVER (ORDER BY ...) AS rk FROM orders;',
    solutionSql:
      'SELECT id, amount, rank() OVER (ORDER BY amount DESC)::int AS rk FROM orders;',
    orderMatters: false,
    hints: ['不写 PARTITION BY 就是对全表排名。'],
  },
  {
    id: 'm4-03',
    moduleId: 'm4',
    title: '按时间的累计金额',
    difficulty: 5,
    prompt: '按 created_at（同日按 id）从早到晚，算出累计总金额 running，输出 id、amount、running。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT id, amount,\n  sum(amount) OVER (ORDER BY created_at, id) AS running\nFROM orders;',
    solutionSql:
      'SELECT id, amount, sum(amount) OVER (ORDER BY created_at, id)::int AS running FROM orders;',
    orderMatters: false,
    hints: ['sum() OVER (ORDER BY ...) 会从第一行累加到当前行。'],
  },
  {
    id: 'm4-04',
    moduleId: 'm4',
    title: '上一笔订单金额',
    difficulty: 5,
    prompt: '对每位客户，按时间顺序取"上一笔"订单金额 prev（第一笔没有上一笔，为 NULL），输出 customer_id、amount、prev。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT customer_id, amount,\n  lag(amount) OVER (PARTITION BY ... ORDER BY ...) AS prev\nFROM orders;',
    solutionSql:
      'SELECT customer_id, amount, lag(amount) OVER (PARTITION BY customer_id ORDER BY created_at, id)::int AS prev FROM orders;',
    orderMatters: false,
    hints: ['lag(列) 取窗口内当前行的前一行。'],
  },
  {
    id: 'm4-05',
    moduleId: 'm4',
    title: '每位客户最大的一笔',
    difficulty: 5,
    prompt: '用窗口函数 + 子查询，取出每位客户金额最高的那笔订单，输出 customer_id、amount。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT customer_id, amount FROM (\n  SELECT customer_id, amount,\n    row_number() OVER (PARTITION BY customer_id ORDER BY amount DESC) AS rn\n  FROM orders\n) t WHERE rn = 1;',
    solutionSql:
      'SELECT customer_id, amount FROM (SELECT customer_id, amount, row_number() OVER (PARTITION BY customer_id ORDER BY amount DESC) AS rn FROM orders) t WHERE rn = 1;',
    orderMatters: false,
    hints: ['窗口函数不能直接写在 WHERE 里，要先在子查询里算 rn，再在外层筛 rn = 1。'],
  },
  {
    id: 'm4-06',
    moduleId: 'm4',
    title: '每月订单数',
    difficulty: 4,
    prompt: '按月份统计订单数：输出月份 mon（数字）和该月订单数 cnt。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT EXTRACT(month FROM created_at)::int AS mon, count(*) AS cnt\nFROM orders GROUP BY ...;',
    solutionSql:
      'SELECT EXTRACT(month FROM created_at)::int AS mon, count(*)::int AS cnt FROM orders GROUP BY EXTRACT(month FROM created_at);',
    orderMatters: false,
    hints: ['EXTRACT(month FROM 日期) 取出月份数字。'],
  },
  {
    id: 'm4-07',
    moduleId: 'm4',
    title: '拼出城市-姓名标签',
    difficulty: 2,
    prompt: "把每位客户拼成 '城市-姓名' 的标签，输出 id 和 label（如 '北京-小明'）。",
    seedSql: SHOP_SEED,
    starterSql: "SELECT id, city || '-' || name AS label FROM customers;",
    solutionSql: "SELECT id, city || '-' || name AS label FROM customers;",
    orderMatters: false,
    hints: ['|| 是字符串拼接运算符。'],
  },
  {
    id: 'm4-08',
    moduleId: 'm4',
    title: '二月的订单',
    difficulty: 3,
    prompt: '选出 2026 年 2 月的订单 id 和 amount（用日期范围过滤）。',
    seedSql: SHOP_SEED,
    starterSql: "SELECT id, amount FROM orders WHERE created_at >= '...' AND created_at < '...';",
    solutionSql:
      "SELECT id, amount FROM orders WHERE created_at >= '2026-02-01' AND created_at < '2026-03-01';",
    orderMatters: false,
    hints: ['用 >= 月初、< 下月初 来框一个月，比 BETWEEN 更稳。'],
  },
];
