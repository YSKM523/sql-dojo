import type { Exercise, ResultSet, Verdict } from './types';
import { SqlSession, SqlError } from './runner';
import { compareResults } from './compare';

export interface JudgeResult {
  verdict: Verdict;
  actual?: ResultSet;
  expected?: ResultSet;
}

export async function judgeExercise(ex: Exercise, userSql: string): Promise<JudgeResult> {
  // 一个会话里跑标准答案与用户查询：只启动一次 PGlite。
  const session = new SqlSession(ex.seedSql);
  try {
    const expected = await session.run(ex.solutionSql);
    let actual: ResultSet;
    try {
      actual = await session.run(userSql);
    } catch (e) {
      if (e instanceof SqlError) {
        return { verdict: { passed: false, reason: `SQL 报错：${e.message}` }, expected };
      }
      throw e;
    }
    return { verdict: compareResults(expected, actual, ex.orderMatters), actual, expected };
  } finally {
    await session.close();
  }
}
