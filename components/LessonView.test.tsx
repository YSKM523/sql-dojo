// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LessonView } from '@/components/LessonView';

describe('LessonView', () => {
  it('把 Markdown 渲染成 HTML', () => {
    render(<LessonView markdown={'## 标题\n\n一段**加粗**文字。'} />);
    expect(screen.getByRole('heading', { name: '标题' })).toBeInTheDocument();
    expect(screen.getByText('加粗')).toBeInTheDocument();
  });
});
