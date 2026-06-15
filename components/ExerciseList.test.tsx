// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExerciseList } from '@/components/ExerciseList';
import type { Exercise } from '@/lib/sql/types';

const mk = (id: string, title: string): Exercise => ({
  id,
  moduleId: 'm1',
  title,
  difficulty: 1,
  prompt: '',
  seedSql: '',
  solutionSql: '',
  orderMatters: false,
});

describe('ExerciseList', () => {
  it('每题一个链接，指向练习页', () => {
    render(<ExerciseList exercises={[mk('m1-01', '选出全部用户'), mk('m1-02', '筛选')]} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/exercise/m1-01');
    expect(screen.getByText('选出全部用户')).toBeInTheDocument();
  });
});
