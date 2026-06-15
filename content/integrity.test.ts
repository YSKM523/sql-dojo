import { describe, it, expect } from 'vitest';
import { allModules, getModuleById } from '@/content/modules';
import { allExercises, exercisesByModule } from '@/content/exercises';

describe('content integrity', () => {
  it('每道题的 moduleId 都对应一个已知模块', () => {
    const ids = new Set(allModules.map((m) => m.id));
    for (const ex of allExercises) {
      expect(ids.has(ex.moduleId), `${ex.id} -> ${ex.moduleId}`).toBe(true);
    }
  });

  it('模块 order 唯一且升序排列', () => {
    const orders = allModules.map((m) => m.order);
    expect(new Set(orders).size).toBe(orders.length);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it('模块 id 唯一', () => {
    const ids = allModules.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getModuleById 能查到、查不到返回 undefined', () => {
    expect(getModuleById('m1')?.title).toBe('入门');
    expect(getModuleById('nope')).toBeUndefined();
  });

  it('exercisesByModule 过滤正确', () => {
    expect(exercisesByModule('m1').every((e) => e.moduleId === 'm1')).toBe(true);
  });

  it('每个模块至少有一道题', () => {
    for (const m of allModules) {
      expect(exercisesByModule(m.id).length, m.id).toBeGreaterThan(0);
    }
  });
});
