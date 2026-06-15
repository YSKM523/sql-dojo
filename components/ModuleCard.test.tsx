// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModuleCard } from '@/components/ModuleCard';
import { clearProgress } from '@/lib/progress/store';
import type { ModuleDef } from '@/lib/sql/types';

const M: ModuleDef = {
  id: 'm1',
  order: 1,
  title: '入门',
  tierKey: 'beginner',
  tierLabel: '小白',
  summary: '取数据',
  lesson: '# x',
};

beforeEach(() => {
  localStorage.clear();
  clearProgress();
});

describe('ModuleCard', () => {
  it('显示标题、段位、通关进度，并链到模块页', () => {
    render(<ModuleCard module={M} exerciseIds={['m1-01', 'm1-02']} />);
    expect(screen.getByText('入门')).toBeInTheDocument();
    expect(screen.getByText('小白')).toBeInTheDocument();
    expect(screen.getByText(/0\s*\/\s*2/)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/learn/m1');
  });
});
