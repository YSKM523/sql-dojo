import type { Exercise } from '@/lib/sql/types';
import { SHOP_SEED } from './module2';

// 模块 6：性能与优化。结果集等价的改写题（证明改写前后等价）+ 一道建索引(checkSql)。
export const module6Exercises: Exercise[] = [
  {
    id: 'm6-01',
    moduleId: 'm6',
    title: '相关子查询改成 JOIN',
    difficulty: 3,
    prompt:
      '下面这种"对每个订单都去查一次客户名"的相关子查询写法慢。请改写成 JOIN，输出订单 id、客户 name、amount。',
    seedSql: SHOP_SEED,
    starterSql:
      '-- 慢写法：SELECT id, (SELECT name FROM customers c WHERE c.id=o.customer_id) AS name, amount FROM orders o;\nSELECT o.id, c.name, o.amount\nFROM orders o\nJOIN customers c ON ...;',
    solutionSql: 'SELECT o.id, c.name, o.amount FROM orders o JOIN customers c ON c.id = o.customer_id;',
    orderMatters: false,
    hints: ['把子查询里的关联条件 c.id = o.customer_id 变成 JOIN ... ON。'],
  },
  {
    id: 'm6-02',
    moduleId: 'm6',
    title: '用 EXISTS 替代 IN',
    difficulty: 3,
    prompt: '找出"有订单"的客户 name。用 EXISTS 改写（比 IN 更稳，避免大子集与 NULL 陷阱）。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT name FROM customers c\nWHERE EXISTS (\n  SELECT 1 FROM orders o WHERE ...\n);',
    solutionSql:
      'SELECT name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);',
    orderMatters: false,
    hints: ['EXISTS (SELECT 1 FROM orders WHERE 关联条件) 一旦匹配就返回真。'],
  },
  {
    id: 'm6-03',
    moduleId: 'm6',
    title: '列裁剪：别 SELECT *',
    difficulty: 2,
    prompt: '只取需要的列：输出每位客户的 id 和 city（不要 SELECT *，避免白读 name 列）。',
    seedSql: SHOP_SEED,
    starterSql: '-- 把下面的 * 换成只要的列\nSELECT * FROM customers;',
    solutionSql: 'SELECT id, city FROM customers;',
    orderMatters: false,
    hints: ['明确写出要的列（id, city），既省 IO 又让覆盖索引有机会生效。'],
  },
  {
    id: 'm6-04',
    moduleId: 'm6',
    title: '去重：DISTINCT',
    difficulty: 2,
    prompt: '列出"有订单的客户 id"，去重。输出 customer_id。',
    seedSql: SHOP_SEED,
    starterSql: '-- 给下面这条去重（orders 里同一客户有多笔）\nSELECT customer_id FROM orders;',
    solutionSql: 'SELECT DISTINCT customer_id FROM orders;',
    orderMatters: false,
    hints: ['加 DISTINCT 去掉重复行；这里也可以用 GROUP BY customer_id。'],
  },
  {
    id: 'm6-05',
    moduleId: 'm6',
    title: 'sargable：别把列包在函数里',
    difficulty: 4,
    prompt:
      '查 2026 年 2 月的订单 id。不要用 EXTRACT(month FROM created_at)=2 这种"函数包裹列"的写法（索引用不上），改用日期范围。',
    seedSql: SHOP_SEED,
    starterSql:
      "-- 慢：WHERE EXTRACT(month FROM created_at)=2\nSELECT id FROM orders WHERE created_at >= '...' AND created_at < '...';",
    solutionSql:
      "SELECT id FROM orders WHERE created_at >= '2026-02-01' AND created_at < '2026-03-01';",
    orderMatters: false,
    hints: ['写成 created_at >= 月初 AND < 下月初，列没被函数包裹，索引才用得上（sargable）。'],
  },
  {
    id: 'm6-06',
    moduleId: 'm6',
    title: '加一个有用的索引',
    difficulty: 3,
    prompt:
      '为加速"按客户查订单"，给 orders 的 customer_id 建一个名为 idx_orders_cust 的索引。',
    seedSql: SHOP_SEED,
    starterSql: 'CREATE INDEX idx_orders_cust ON orders(customer_id);',
    solutionSql: 'CREATE INDEX idx_orders_cust ON orders(customer_id);',
    checkSql:
      "SELECT count(*)::int AS n FROM pg_indexes WHERE tablename = 'orders' AND indexname = 'idx_orders_cust';",
    orderMatters: false,
    hints: ['CREATE INDEX 索引名 ON orders(customer_id)；高频按客户过滤/JOIN 的列适合建。'],
  },
  {
    id: 'm6-07',
    moduleId: 'm6',
    title: '提前过滤：WHERE 不是 HAVING',
    difficulty: 4,
    prompt:
      '统计每位客户的订单数，但先把金额为 0 的订单用 WHERE 过滤掉再统计（提前减少要处理的行）。输出 customer_id 和 cnt。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT customer_id, count(*) AS cnt\nFROM orders\nWHERE amount > 0\nGROUP BY customer_id;',
    solutionSql:
      'SELECT customer_id, count(*)::int AS cnt FROM orders WHERE amount > 0 GROUP BY customer_id;',
    orderMatters: false,
    hints: ['过滤"行"用 WHERE（分组前），过滤"组"才用 HAVING；先 WHERE 减少行数更省。'],
  },
  {
    id: 'm6-08',
    moduleId: 'm6',
    title: 'Boss：重写慢查询',
    difficulty: 5,
    prompt:
      '把嵌套子查询重写得更清爽（用 CTE 或 JOIN），结果不变：找出"总额 ≥ 200"的客户 name 和总额 total。',
    seedSql: SHOP_SEED,
    starterSql:
      'WITH t AS (\n  SELECT customer_id, sum(amount) AS total\n  FROM orders GROUP BY customer_id HAVING sum(amount) >= 200\n)\nSELECT c.name, t.total\nFROM t JOIN customers c ON c.id = t.customer_id;',
    solutionSql:
      'WITH t AS (SELECT customer_id, sum(amount) AS total FROM orders GROUP BY customer_id HAVING sum(amount) >= 200) SELECT c.name, t.total::int AS total FROM t JOIN customers c ON c.id = t.customer_id;',
    orderMatters: false,
    hints: ['先用 CTE 算每个客户总额并 HAVING 过滤，再 JOIN 回 customers 取名字。'],
  },
];
