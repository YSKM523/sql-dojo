import { describe, it, expect } from 'vitest';
import { allExercises, getExerciseById } from '@/content/exercises';

describe('exercise registry', () => {
  it('exposes module1 exercises', () => {
    expect(allExercises.length).toBeGreaterThanOrEqual(4);
  });
  it('finds an exercise by id', () => {
    expect(getExerciseById('m1-01')?.title).toBe('选出全部用户');
  });
  it('returns undefined for unknown id', () => {
    expect(getExerciseById('nope')).toBeUndefined();
  });
  it('has unique ids', () => {
    const ids = allExercises.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
