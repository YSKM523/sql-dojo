// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModuleCard } from '@/components/ModuleCard';
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

describe('ModuleCard', () => {
  it('显示序号、标题、段位、题数，并链到模块页', () => {
    render(<ModuleCard module={M} exerciseCount={8} />);
    expect(screen.getByText('入门')).toBeInTheDocument();
    expect(screen.getByText('小白')).toBeInTheDocument();
    expect(screen.getByText(/8\s*题/)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/learn/m1');
  });
});
