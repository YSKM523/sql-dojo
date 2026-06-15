// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// 用普通 textarea 替换 CodeMirror（jsdom 下不易驱动 contenteditable）
vi.mock('@/components/SqlEditor', () => ({
  SqlEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const judgeExercise = vi.fn();
vi.mock('@/lib/sql/judgeExercise', () => ({
  judgeExercise: (...a: unknown[]) => judgeExercise(...a),
}));

import { Playground } from '@/components/Playground';
import type { Exercise } from '@/lib/sql/types';

const EX: Exercise = {
  id: 'x',
  moduleId: 'm1',
  title: 't',
  difficulty: 1,
  prompt: 'p',
  seedSql: '',
  solutionSql: 'SELECT 1',
  orderMatters: false,
  starterSql: 'SELECT 1',
};

beforeEach(() => judgeExercise.mockReset());

describe('Playground', () => {
  it('judges the current sql on run and shows a passing verdict', async () => {
    judgeExercise.mockResolvedValue({
      verdict: { passed: true },
      actual: { columns: ['n'], rows: [[1]] },
    });
    render(<Playground exercise={EX} />);
    fireEvent.click(screen.getByRole('button', { name: /运行/ }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('通过'));
    expect(judgeExercise).toHaveBeenCalledWith(EX, 'SELECT 1');
  });

  it('shows a failing verdict with reason', async () => {
    judgeExercise.mockResolvedValue({ verdict: { passed: false, reason: '期望 1 行' } });
    render(<Playground exercise={EX} />);
    fireEvent.click(screen.getByRole('button', { name: /运行/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('期望 1 行'));
  });
});
