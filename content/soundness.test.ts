import { describe, it, expect } from 'vitest';
import { allExercises } from '@/content/exercises';
import { judgeExercise } from '@/lib/sql/judgeExercise';

describe('每道题的标准答案都能通过自己的判题', () => {
  for (const ex of allExercises) {
    it(`${ex.id} ${ex.title}`, async () => {
      const r = await judgeExercise(ex, ex.solutionSql);
      expect(r.verdict.passed, r.verdict.reason).toBe(true);
    });
  }
});
