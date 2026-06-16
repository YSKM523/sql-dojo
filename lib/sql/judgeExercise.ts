import type { Exercise, ResultSet, Verdict } from './types';
import { SqlSession, SqlError } from './runner';
import { compareResults } from './compare';

export interface JudgeResult {
  verdict: Verdict;
  actual?: ResultSet;
  expected?: ResultSet;
}

/**
 * 会话化判题器：一个练习只启动一次 PGlite、种子一次、把标准答案结果缓存下来，
 * 之后每次 judge() 只在同一会话里跑用户查询（BEGIN/ROLLBACK 隔离）。
 * → 首次点击约几秒（含 WASM 编译），之后每次点击都很快。
 */
export class ExerciseJudge {
  private readonly ex: Exercise;
  private readonly session: SqlSession;
  private expected: ResultSet | null = null;

  constructor(ex: Exercise) {
    this.ex = ex;
    this.session = new SqlSession(ex.seedSql);
  }

  private async ensureExpected(): Promise<ResultSet> {
    if (!this.expected) {
      this.expected = this.ex.checkSql
        ? await this.session.runCheck(this.ex.solutionSql, this.ex.checkSql)
        : await this.session.run(this.ex.solutionSql);
    }
    return this.expected;
  }

  async judge(userSql: string): Promise<JudgeResult> {
    const expected = await this.ensureExpected();
    let actual: ResultSet;
    try {
      actual = this.ex.checkSql
        ? await this.session.runCheck(userSql, this.ex.checkSql)
        : await this.session.run(userSql);
    } catch (e) {
      if (e instanceof SqlError) {
        return { verdict: { passed: false, reason: `SQL 报错：${e.message}` }, expected };
      }
      throw e;
    }
    return { verdict: compareResults(expected, actual, this.ex.orderMatters), actual, expected };
  }

  async close(): Promise<void> {
    await this.session.close();
  }
}

// 一次性判题（用于测试/一次性场景）：建判题器 → 判一次 → 关闭。
export async function judgeExercise(ex: Exercise, userSql: string): Promise<JudgeResult> {
  const judge = new ExerciseJudge(ex);
  try {
    return await judge.judge(userSql);
  } finally {
    await judge.close();
  }
}
