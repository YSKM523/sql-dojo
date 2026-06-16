export interface Exercise {
  id: string;
  moduleId: string;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prompt: string; // 中文题面
  seedSql: string; // 建表+插数据，每次运行前重置
  starterSql?: string; // 编辑器初始内容
  solutionSql: string; // 标准答案，用于生成期望结果集
  orderMatters: boolean; // 是否要求特定行顺序
  // 有则判题=把"提交的 SQL"当 setup(exec 多语句)跑完→再跑 checkSql(query)取结果，
  // 与「solutionSql 当 setup + 同一 checkSql」比对。用于 DDL/写库类题。
  checkSql?: string;
  hints?: string[];
}

export interface ResultSet {
  columns: string[];
  rows: unknown[][];
}

export interface Verdict {
  passed: boolean;
  reason?: string;
}

export type TierKey = 'beginner' | 'intermediate' | 'advanced' | 'senior' | 'sprint';

export interface ModuleDef {
  id: string; // 'm1'
  order: number; // 1..4（本阶段）
  title: string; // '入门'
  tierKey: TierKey;
  tierLabel: string; // '小白' / '初级' / '中级'
  summary: string; // 一句话简介
  lesson: string; // 概念课 Markdown
}
