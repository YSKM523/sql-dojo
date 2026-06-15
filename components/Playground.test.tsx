// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// 用普通 textarea 替换 CodeMirror（jsdom 下不易驱动 contenteditable）
vi.mock('@/components/SqlEditor', () => ({
  SqlEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

// mock 会话化判题器，记录传入的用户 SQL
const judgeMock = vi.fn();
vi.mock('@/lib/sql/judgeExercise', () => ({
  ExerciseJudge: class {
    judge(sql: string) {
      return judgeMock(sql);
    }
    async close() {}
  },
}));

import { Playground } from '@/components/Playground';
import type { Exercise } from '@/lib/sql/types';
import { getCompleted, clearProgress } from '@/lib/progress/store';

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

beforeEach(() => {
  judgeMock.mockReset();
  clearProgress();
});

describe('Playground', () => {
  it('judges the current sql on run and shows a passing verdict', async () => {
    judgeMock.mockResolvedValue({
      verdict: { passed: true },
      actual: { columns: ['n'], rows: [[1]] },
    });
    render(<Playground exercise={EX} />);
    fireEvent.click(screen.getByRole('button', { name: /运行/ }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('通过'));
    expect(judgeMock).toHaveBeenCalledWith('SELECT 1');
    expect(getCompleted()).toContain('x'); // EX.id === 'x'
  });

  it('shows a failing verdict with reason', async () => {
    judgeMock.mockResolvedValue({ verdict: { passed: false, reason: '期望 1 行' } });
    render(<Playground exercise={EX} />);
    fireEvent.click(screen.getByRole('button', { name: /运行/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('期望 1 行'));
  });
});
