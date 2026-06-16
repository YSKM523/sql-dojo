import type { Exercise } from '@/lib/sql/types';

// 模块 5：建模与 DDL。多为空种子（用户从零建表），用 checkSql 先建后验。
// 约束类题用 pg_constraint 系统目录验证；数据类题直接读回数据比对。
export const module5Exercises: Exercise[] = [
  {
    id: 'm5-01',
    moduleId: 'm5',
    title: '建第一张表',
    difficulty: 2,
    prompt:
      "建一张叫 book 的表，字段：id 整数主键、title 文本、price 数值(numeric)、sold 布尔(boolean)。再插入两行：(1,'SQL入门',39.9,true) 和 (2,'数据建模',59.0,false)。",
    seedSql: '',
    starterSql:
      "CREATE TABLE book (\n  id integer PRIMARY KEY,\n  -- 补全 title / price / sold\n);\n-- INSERT INTO book VALUES ...",
    solutionSql:
      "CREATE TABLE book (id integer PRIMARY KEY, title text, price numeric, sold boolean); INSERT INTO book VALUES (1,'SQL入门',39.9,true),(2,'数据建模',59.0,false);",
    checkSql: 'SELECT id, title, price, sold FROM book ORDER BY id;',
    orderMatters: false,
    hints: ['CREATE TABLE 表名 (列名 类型, ...)；numeric 存小数、boolean 存 true/false。'],
  },
  {
    id: 'm5-02',
    moduleId: 'm5',
    title: '非空与默认值',
    difficulty: 3,
    prompt:
      "建表 account：id 整数主键、email 文本且非空(NOT NULL)、role 文本默认 'user'(DEFAULT)。只插入 id 和 email 两列（role 走默认值）：(1,'a@x.com')。",
    seedSql: '',
    starterSql:
      "CREATE TABLE account (\n  id integer PRIMARY KEY,\n  email text NOT NULL,\n  role text DEFAULT '...'\n);\n-- 只插 id 和 email",
    solutionSql:
      "CREATE TABLE account (id integer PRIMARY KEY, email text NOT NULL, role text DEFAULT 'user'); INSERT INTO account (id, email) VALUES (1,'a@x.com');",
    // 查系统目录确认 role 列声明了 DEFAULT（光在 INSERT 里硬编码 'user' 蒙不过去）。
    checkSql:
      "SELECT column_default FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'role';",
    orderMatters: false,
    hints: ["在列定义里写 role text DEFAULT 'user'；判题查的是这个 DEFAULT 声明，不是插进去的值。"],
  },
  {
    id: 'm5-03',
    moduleId: 'm5',
    title: '唯一约束',
    difficulty: 3,
    prompt:
      '建表 member：id 整数主键、username 文本且唯一(UNIQUE)。（我们会查系统目录确认 username 上有一个 UNIQUE 约束。）',
    seedSql: '',
    starterSql: 'CREATE TABLE member (\n  id integer PRIMARY KEY,\n  username text UNIQUE\n);',
    solutionSql: 'CREATE TABLE member (id integer PRIMARY KEY, username text UNIQUE);',
    checkSql:
      "SELECT count(*)::int AS n FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE t.relname = 'member' AND c.contype = 'u';",
    orderMatters: false,
    hints: ['列后面加 UNIQUE 就是唯一约束；contype=u 在系统目录里代表 unique。'],
  },
  {
    id: 'm5-04',
    moduleId: 'm5',
    title: '外键关联',
    difficulty: 4,
    prompt:
      '建两张表：team(id 整数主键、name 文本) 和 player(id 整数主键、team_id 整数，外键 REFERENCES team(id))。（会查目录确认 player 上有外键。）',
    seedSql: '',
    starterSql:
      'CREATE TABLE team (id integer PRIMARY KEY, name text);\nCREATE TABLE player (\n  id integer PRIMARY KEY,\n  team_id integer REFERENCES team(id)\n);',
    solutionSql:
      'CREATE TABLE team (id integer PRIMARY KEY, name text); CREATE TABLE player (id integer PRIMARY KEY, team_id integer REFERENCES team(id));',
    checkSql:
      "SELECT count(*)::int AS n FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE t.relname = 'player' AND c.contype = 'f';",
    orderMatters: false,
    hints: ['team_id integer REFERENCES team(id) 就声明了外键；先建被引用的 team。'],
  },
  {
    id: 'm5-05',
    moduleId: 'm5',
    title: 'CHECK 约束',
    difficulty: 4,
    prompt:
      '建表 goods：id 整数主键、price 数值，并加一个 CHECK 约束保证 price > 0。（会查目录确认有 CHECK。）',
    seedSql: '',
    starterSql: 'CREATE TABLE goods (\n  id integer PRIMARY KEY,\n  price numeric CHECK (price > 0)\n);',
    solutionSql: 'CREATE TABLE goods (id integer PRIMARY KEY, price numeric CHECK (price > 0));',
    checkSql:
      "SELECT count(*)::int AS n FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE t.relname = 'goods' AND c.contype = 'c';",
    orderMatters: false,
    hints: ['CHECK (条件) 写在列后或表级；contype=c 代表 check 约束。'],
  },
  {
    id: 'm5-06',
    moduleId: 'm5',
    title: '范式化：拆掉冗余',
    difficulty: 4,
    prompt:
      "把'订单里重复存客户名'的反范式拆开：建 cust(id 主键、name) 和 ord(id 主键、cust_id 外键 REFERENCES cust(id)、amount 整数)。插入客户 (1,'A')(2,'B')；订单 (1,1,100)(2,1,50)(3,2,80)。",
    seedSql: '',
    starterSql:
      'CREATE TABLE cust (id integer PRIMARY KEY, name text);\nCREATE TABLE ord (id integer PRIMARY KEY, cust_id integer REFERENCES cust(id), amount integer);\n-- 两张表各插数据',
    solutionSql:
      "CREATE TABLE cust (id integer PRIMARY KEY, name text); CREATE TABLE ord (id integer PRIMARY KEY, cust_id integer REFERENCES cust(id), amount integer); INSERT INTO cust VALUES (1,'A'),(2,'B'); INSERT INTO ord VALUES (1,1,100),(2,1,50),(3,2,80);",
    checkSql:
      'SELECT c.name, sum(o.amount)::int AS total FROM cust c JOIN ord o ON o.cust_id = c.id GROUP BY c.name ORDER BY c.name;',
    orderMatters: false,
    hints: ['客户名只存在 cust 一处，ord 用 cust_id 外键引用；校验会 JOIN 两表按客户求和。'],
  },
  {
    id: 'm5-07',
    moduleId: 'm5',
    title: '建索引',
    difficulty: 3,
    prompt:
      "建表 log(id 整数主键、level 文本、ts 日期) 并插两行 (1,'INFO','2026-01-01')(2,'ERROR','2026-01-02')，然后在 level 列上建一个名为 idx_log_level 的索引。",
    seedSql: '',
    starterSql:
      "CREATE TABLE log (id integer PRIMARY KEY, level text, ts date);\nINSERT INTO log VALUES (1,'INFO','2026-01-01'),(2,'ERROR','2026-01-02');\nCREATE INDEX idx_log_level ON log(level);",
    solutionSql:
      "CREATE TABLE log (id integer PRIMARY KEY, level text, ts date); INSERT INTO log VALUES (1,'INFO','2026-01-01'),(2,'ERROR','2026-01-02'); CREATE INDEX idx_log_level ON log(level);",
    checkSql:
      "SELECT count(*)::int AS n FROM pg_indexes WHERE tablename = 'log' AND indexname = 'idx_log_level';",
    orderMatters: false,
    hints: ['CREATE INDEX 索引名 ON 表(列)；pg_indexes 里能查到刚建的索引。'],
  },
  {
    id: 'm5-08',
    moduleId: 'm5',
    title: 'Boss：设计博客 schema',
    difficulty: 5,
    prompt:
      "为迷你博客设计 schema：blog_user(id 主键、name) 和 post(id 主键、author_id 外键 REFERENCES blog_user(id)、title、likes 整数)。插入用户 (1,'Ann')(2,'Bob')；文章 (1,1,'Hello',5)(2,1,'World',3)(3,2,'Hi',10)。",
    seedSql: '',
    starterSql:
      'CREATE TABLE blog_user (id integer PRIMARY KEY, name text);\nCREATE TABLE post (\n  id integer PRIMARY KEY,\n  author_id integer REFERENCES blog_user(id),\n  title text,\n  likes integer\n);\n-- 两张表插数据',
    solutionSql:
      "CREATE TABLE blog_user (id integer PRIMARY KEY, name text); CREATE TABLE post (id integer PRIMARY KEY, author_id integer REFERENCES blog_user(id), title text, likes integer); INSERT INTO blog_user VALUES (1,'Ann'),(2,'Bob'); INSERT INTO post VALUES (1,1,'Hello',5),(2,1,'World',3),(3,2,'Hi',10);",
    checkSql:
      'SELECT u.name, sum(p.likes)::int AS likes FROM blog_user u JOIN post p ON p.author_id = u.id GROUP BY u.name ORDER BY u.name;',
    orderMatters: false,
    hints: ['先建被引用的 blog_user，再建 post 带外键；校验按作者汇总获赞数。'],
  },
];
