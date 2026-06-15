import type { Exercise } from '@/lib/sql/types';
import { SHOP_SEED } from './module2';

export const module3Exercises: Exercise[] = [
  {
    id: 'm3-01',
    moduleId: 'm3',
    title: '高于平均额的订单',
    difficulty: 3,
    prompt: '找出金额高于"所有订单平均金额"的订单 id 和 amount。',
    seedSql: SHOP_SEED,
    starterSql: 'SELECT id, amount FROM orders WHERE amount > (SELECT ... FROM orders);',
    solutionSql: 'SELECT id, amount FROM orders WHERE amount > (SELECT avg(amount) FROM orders);',
    orderMatters: false,
    hints: ['括号里的子查询先算出平均值，再用来过滤。'],
  },
  {
    id: 'm3-02',
    moduleId: 'm3',
    title: '北京客户的订单金额',
    difficulty: 3,
    prompt: '用子查询找出所有来自北京的客户，列出他们订单的 amount。',
    seedSql: SHOP_SEED,
    starterSql: 'SELECT amount FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE ...);',
    solutionSql:
      "SELECT amount FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE city = '北京');",
    orderMatters: false,
    hints: ['IN (子查询) 把子查询的结果当作一组值。'],
  },
  {
    id: 'm3-03',
    moduleId: 'm3',
    title: 'CTE：总消费过 200 的客户',
    difficulty: 4,
    prompt: '用 WITH 先算出每位客户的总消费，再选出总消费 > 200 的 customer_id 和 total。',
    seedSql: SHOP_SEED,
    starterSql:
      'WITH t AS (\n  SELECT customer_id, sum(amount) AS total FROM orders GROUP BY customer_id\n)\nSELECT customer_id, total FROM t WHERE ...;',
    solutionSql:
      'WITH t AS (SELECT customer_id, sum(amount)::int AS total FROM orders GROUP BY customer_id) SELECT customer_id, total FROM t WHERE total > 200;',
    orderMatters: false,
    hints: ['WITH 名字 AS (子查询) 之后就能像表一样用这个名字。'],
  },
  {
    id: 'm3-04',
    moduleId: 'm3',
    title: 'CASE：订单金额分档',
    difficulty: 3,
    prompt: "给每笔订单分档：amount >= 200 标'大'、>= 100 标'中'、其余'小'。输出 id 和 tier。",
    seedSql: SHOP_SEED,
    starterSql:
      "SELECT id,\n  CASE WHEN amount >= 200 THEN '大'\n       WHEN amount >= 100 THEN '中'\n       ELSE '小' END AS tier\nFROM orders;",
    solutionSql:
      "SELECT id, CASE WHEN amount >= 200 THEN '大' WHEN amount >= 100 THEN '中' ELSE '小' END AS tier FROM orders;",
    orderMatters: false,
    hints: ['CASE 从上往下匹配，命中第一个条件就停。'],
  },
  {
    id: 'm3-05',
    moduleId: 'm3',
    title: 'UNION：北京或上海的客户',
    difficulty: 3,
    prompt: '用 UNION 把"北京的客户名"和"上海的客户名"合并成一列 name（自动去重）。',
    seedSql: SHOP_SEED,
    starterSql:
      "SELECT name FROM customers WHERE city = '北京'\nUNION\nSELECT name FROM customers WHERE city = '上海';",
    solutionSql:
      "SELECT name FROM customers WHERE city = '北京' UNION SELECT name FROM customers WHERE city = '上海';",
    orderMatters: false,
    hints: ['UNION 上下两个查询的列数和含义要对应。'],
  },
  {
    id: 'm3-06',
    moduleId: 'm3',
    title: '最大订单是谁下的',
    difficulty: 4,
    prompt: '用子查询找出金额最高那笔订单所属客户的 name。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT name FROM customers WHERE id = (SELECT customer_id FROM orders ORDER BY ... LIMIT 1);',
    solutionSql:
      'SELECT name FROM customers WHERE id = (SELECT customer_id FROM orders ORDER BY amount DESC LIMIT 1);',
    orderMatters: false,
    hints: ['子查询用 ORDER BY ... DESC LIMIT 1 取出"金额最大那笔"的客户。'],
  },
  {
    id: 'm3-07',
    moduleId: 'm3',
    title: 'CTE 再连表',
    difficulty: 4,
    prompt: '用 WITH 算出每位客户总消费后，连回 customers，输出有订单客户的 name 和 total。',
    seedSql: SHOP_SEED,
    starterSql:
      'WITH t AS (\n  SELECT customer_id, sum(amount) AS total FROM orders GROUP BY customer_id\n)\nSELECT c.name, t.total FROM customers c JOIN t ON ...;',
    solutionSql:
      'WITH t AS (SELECT customer_id, sum(amount)::int AS total FROM orders GROUP BY customer_id) SELECT c.name, t.total FROM customers c JOIN t ON t.customer_id = c.id;',
    orderMatters: false,
    hints: ['CTE 算好后当成一张表，再和 customers JOIN。'],
  },
  {
    id: 'm3-08',
    moduleId: 'm3',
    title: 'CASE 配聚合：大小额计数',
    difficulty: 4,
    prompt: '统计金额 >= 200 的订单数 big 和 < 200 的订单数 small（用 CASE 配 sum）。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT\n  sum(CASE WHEN amount >= 200 THEN 1 ELSE 0 END) AS big,\n  sum(CASE WHEN amount < 200 THEN 1 ELSE 0 END) AS small\nFROM orders;',
    solutionSql:
      'SELECT sum(CASE WHEN amount >= 200 THEN 1 ELSE 0 END)::int AS big, sum(CASE WHEN amount < 200 THEN 1 ELSE 0 END)::int AS small FROM orders;',
    orderMatters: false,
    hints: ['CASE 把条件变成 1/0，再 sum 起来就是计数。'],
  },
];
