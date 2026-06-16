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
