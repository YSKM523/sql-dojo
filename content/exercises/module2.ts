import type { Exercise } from '@/lib/sql/types';

// 模块 2–4 共用的电商小数据集。阿强(5) 没有订单，专门给 LEFT JOIN / NULL 用。
export const SHOP_SEED = `
CREATE TABLE customers (id integer PRIMARY KEY, name text, city text);
CREATE TABLE orders (id integer PRIMARY KEY, customer_id integer, amount integer, created_at date);
INSERT INTO customers VALUES
  (1,'小明','北京'),(2,'小红','上海'),(3,'小刚','北京'),(4,'小美','广州'),(5,'阿强','深圳');
INSERT INTO orders VALUES
  (1,1,100,'2026-01-05'),(2,1,200,'2026-02-10'),(3,2,150,'2026-01-20'),
  (4,2,300,'2026-03-01'),(5,3,50,'2026-02-15'),(6,1,80,'2026-03-12'),(7,4,0,'2026-01-30');
`;

export const module2Exercises: Exercise[] = [
  {
    id: 'm2-01',
    moduleId: 'm2',
    title: '每位客户的订单数',
    difficulty: 2,
    prompt: '统计每位客户的订单数量，输出 name 和订单数 cnt（没有下单的客户 cnt 记 0）。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT c.name, count(o.id) AS cnt\nFROM customers c\nLEFT JOIN orders o ON ...\nGROUP BY ...;',
    solutionSql:
      'SELECT c.name, count(o.id)::int AS cnt FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.name;',
    orderMatters: false,
    hints: ['没有订单也要出现 → LEFT JOIN；count(o.id) 不会把 NULL 算进去。'],
  },
  {
    id: 'm2-02',
    moduleId: 'm2',
    title: '消费满 300 的客户',
    difficulty: 3,
    prompt: '找出订单总金额 >= 300 的客户 name 和总额 total。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT c.name, sum(o.amount) AS total\nFROM customers c\nJOIN orders o ON ...\nGROUP BY ...\nHAVING ...;',
    solutionSql:
      'SELECT c.name, sum(o.amount)::int AS total FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.name HAVING sum(o.amount) >= 300;',
    orderMatters: false,
    hints: ['过滤聚合结果用 HAVING，不是 WHERE。'],
  },
  {
    id: 'm2-03',
    moduleId: 'm2',
    title: '订单对应的客户名',
    difficulty: 2,
    prompt: '把每一笔订单和它的客户连起来，输出客户 name 和订单 amount。',
    seedSql: SHOP_SEED,
    starterSql: 'SELECT c.name, o.amount\nFROM customers c\nJOIN orders o ON ...;',
    solutionSql:
      'SELECT c.name, o.amount FROM customers c JOIN orders o ON o.customer_id = c.id;',
    orderMatters: false,
    hints: ['INNER JOIN 只保留两边都匹配的行。'],
  },
  {
    id: 'm2-04',
    moduleId: 'm2',
    title: '没下过单的客户',
    difficulty: 3,
    prompt: '找出从来没有下过订单的客户 name。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT c.name\nFROM customers c\nLEFT JOIN orders o ON ...\nWHERE o.id IS NULL;',
    solutionSql:
      'SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL;',
    orderMatters: false,
    hints: ['LEFT JOIN 后，右表为 NULL 的就是没匹配上的。'],
  },
  {
    id: 'm2-05',
    moduleId: 'm2',
    title: '全站订单总数与总额',
    difficulty: 1,
    prompt: '统计所有订单的笔数 cnt 和总金额 total。',
    seedSql: SHOP_SEED,
    starterSql: 'SELECT count(*) AS cnt, sum(amount) AS total FROM orders;',
    solutionSql: 'SELECT count(*)::int AS cnt, sum(amount)::int AS total FROM orders;',
    orderMatters: false,
    hints: ['count(*) 数行数，sum(amount) 求和。'],
  },
  {
    id: 'm2-06',
    moduleId: 'm2',
    title: '每个城市的客户数',
    difficulty: 2,
    prompt: '统计每个 city 有多少位客户，输出 city 和人数 cnt。',
    seedSql: SHOP_SEED,
    starterSql: 'SELECT city, count(*) AS cnt FROM customers GROUP BY ...;',
    solutionSql: 'SELECT city, count(*)::int AS cnt FROM customers GROUP BY city;',
    orderMatters: false,
    hints: ['按 city 分组再 count。'],
  },
  {
    id: 'm2-07',
    moduleId: 'm2',
    title: '每位客户的最大单笔',
    difficulty: 3,
    prompt: '对有订单的客户，输出 name 和其单笔最高金额 mx。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT c.name, max(o.amount) AS mx\nFROM customers c\nJOIN orders o ON ...\nGROUP BY ...;',
    solutionSql:
      'SELECT c.name, max(o.amount)::int AS mx FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.name;',
    orderMatters: false,
    hints: ['max() 取每组里的最大值。'],
  },
  {
    id: 'm2-08',
    moduleId: 'm2',
    title: '最大的一笔订单',
    difficulty: 1,
    prompt: '所有订单里金额最高的是多少？输出 mx 一列。',
    seedSql: SHOP_SEED,
    starterSql: 'SELECT max(amount) AS mx FROM orders;',
    solutionSql: 'SELECT max(amount)::int AS mx FROM orders;',
    orderMatters: false,
    hints: ['不分组的 max 直接得全局最大。'],
  },
  {
    id: 'm2-09',
    moduleId: 'm2',
    title: '回头客（≥2 单）',
    difficulty: 3,
    prompt: '找出下过 2 笔及以上订单的客户 name。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT c.name\nFROM customers c\nJOIN orders o ON ...\nGROUP BY ...\nHAVING count(*) >= 2;',
    solutionSql:
      'SELECT c.name FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.name HAVING count(*) >= 2;',
    orderMatters: false,
    hints: ['先分组，再用 HAVING count(*) >= 2 过滤。'],
  },
  {
    id: 'm2-10',
    moduleId: 'm2',
    title: '每位客户的总消费（含 0）',
    difficulty: 4,
    prompt: '输出每位客户 name 和总消费 total，没下单的客户 total 显示 0（用 coalesce）。',
    seedSql: SHOP_SEED,
    starterSql:
      'SELECT c.name, coalesce(sum(o.amount), 0) AS total\nFROM customers c\nLEFT JOIN orders o ON ...\nGROUP BY ...;',
    solutionSql:
      'SELECT c.name, coalesce(sum(o.amount), 0)::int AS total FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.name;',
    orderMatters: false,
    hints: ['coalesce(x, 0) 把 NULL 变成 0。'],
  },
];
