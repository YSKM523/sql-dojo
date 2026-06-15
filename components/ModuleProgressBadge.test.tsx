// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModuleProgressBadge } from '@/components/ModuleProgressBadge';
import { markCompleted, clearProgress } from '@/lib/progress/store';

beforeEach(() => {
  localStorage.clear();
  clearProgress();
});

describe('ModuleProgressBadge', () => {
  it('显示 已通关/总数', () => {
    markCompleted('m1-01');
    render(<ModuleProgressBadge exerciseIds={['m1-01', 'm1-02', 'm1-03']} />);
    expect(screen.getByText(/1\s*\/\s*3/)).toBeInTheDocument();
  });
});
