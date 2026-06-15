import type { Exercise } from '@/lib/sql/types';

const SEED = `
CREATE TABLE users (
  id integer PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL,
  age integer NOT NULL
);
INSERT INTO users (id, name, city, age) VALUES
  (1, '小明', '北京', 25),
  (2, '小红', '上海', 30),
  (3, '小刚', '北京', 28),
  (4, '小美', '广州', 22),
  (5, '阿强', '上海', 35);
`;

export const module1Exercises: Exercise[] = [
  {
    id: 'm1-01',
    moduleId: 'm1',
    title: '选出全部用户',
    difficulty: 1,
    prompt: '用 SELECT 选出 users 表里所有用户的所有列。',
    seedSql: SEED,
    starterSql: 'SELECT ... FROM users;',
    solutionSql: 'SELECT * FROM users;',
    orderMatters: false,
    hints: ['用 * 代表“所有列”。'],
  },
  {
    id: 'm1-02',
    moduleId: 'm1',
    title: '筛选成年达标用户',
    difficulty: 2,
    prompt: '选出 age 大于等于 28 的用户的 name 和 age 两列。',
    seedSql: SEED,
    starterSql: 'SELECT name, age FROM users WHERE ...;',
    solutionSql: 'SELECT name, age FROM users WHERE age >= 28;',
    orderMatters: false,
    hints: ['WHERE 后面写筛选条件。'],
  },
  {
    id: 'm1-03',
    moduleId: 'm1',
    title: '去重城市',
    difficulty: 2,
    prompt: '选出所有用户来自的城市（city），不要有重复。',
    seedSql: SEED,
    starterSql: 'SELECT ... city FROM users;',
    solutionSql: 'SELECT DISTINCT city FROM users;',
    orderMatters: false,
    hints: ['DISTINCT 去掉重复行。'],
  },
  {
    id: 'm1-04',
    moduleId: 'm1',
    title: '按年龄排序',
    difficulty: 2,
    prompt: '选出所有用户的 name 和 age，并按 age 从大到小排序。',
    seedSql: SEED,
    starterSql: 'SELECT name, age FROM users ORDER BY ...;',
    solutionSql: 'SELECT name, age FROM users ORDER BY age DESC;',
    orderMatters: true,
    hints: ['ORDER BY ... DESC 表示降序。'],
  },
];
