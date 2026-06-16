// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCompleted,
  isCompleted,
  markCompleted,
  clearProgress,
  subscribe,
  setAll,
} from '@/lib/progress/store';

beforeEach(() => {
  localStorage.clear();
  clearProgress(); // 同时重置模块内缓存
});

describe('progress store', () => {
  it('初始为空', () => {
    expect(getCompleted()).toEqual([]);
    expect(isCompleted('m1-01')).toBe(false);
  });

  it('markCompleted 记录且去重', () => {
    markCompleted('m1-01');
    markCompleted('m1-01');
    markCompleted('m1-02');
    expect(getCompleted().sort()).toEqual(['m1-01', 'm1-02']);
    expect(isCompleted('m1-01')).toBe(true);
  });

  it('写入 localStorage 并能再读出', () => {
    markCompleted('m2-03');
    expect(JSON.parse(localStorage.getItem('sqldojo:completed')!)).toContain('m2-03');
  });

  it('clearProgress 清空', () => {
    markCompleted('m1-01');
    clearProgress();
    expect(getCompleted()).toEqual([]);
  });

  it('subscribe 在变化时被通知', () => {
    const cb = vi.fn();
    const unsub = subscribe(cb);
    markCompleted('m1-01');
    expect(cb).toHaveBeenCalled();
    unsub();
  });

  it('setAll 整体替换并去重', () => {
    markCompleted('m1-01');
    setAll(['m2-01', 'm2-01', 'm3-01']);
    expect(getCompleted().sort()).toEqual(['m2-01', 'm3-01']);
  });

  it('setAll 触发订阅通知', () => {
    const cb = vi.fn();
    const unsub = subscribe(cb);
    setAll(['m4-01']);
    expect(cb).toHaveBeenCalled();
    unsub();
  });
});
