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

export type TierKey = 'beginner' | 'intermediate' | 'senior' | 'sprint';

export interface ModuleDef {
  id: string; // 'm1'
  order: number; // 1..4（本阶段）
  title: string; // '入门'
  tierKey: TierKey;
  tierLabel: string; // '小白' / '初级' / '中级'
  summary: string; // 一句话简介
  lesson: string; // 概念课 Markdown
}
