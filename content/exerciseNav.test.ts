import { describe, it, expect } from 'vitest';
import { exerciseNav } from '@/content/exercises';

describe('exerciseNav', () => {
  it('首题没有上一题，有下一题', () => {
    const n = exerciseNav('m1-01');
    expect(n?.moduleId).toBe('m1');
    expect(n?.index).toBe(0);
    expect(n?.prevId).toBeUndefined();
    expect(n?.nextId).toBe('m1-02');
  });

  it('末题没有下一题', () => {
    const n = exerciseNav('m1-01');
    const last = exerciseNav(`m1-0${n!.total}`);
    expect(last?.nextId).toBeUndefined();
  });

  it('未知题返回 undefined', () => {
    expect(exerciseNav('nope')).toBeUndefined();
  });
});
