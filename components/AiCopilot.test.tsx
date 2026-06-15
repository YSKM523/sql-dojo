// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiCopilot } from '@/components/AiCopilot';

afterEach(() => vi.unstubAllGlobals());

describe('AiCopilot', () => {
  it('点"给点提示"调 /api/ai 并展示回复', async () => {
    let seen: { url: string; body: Record<string, unknown> } = { url: '', body: {} };
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit) => {
        seen = { url, body: JSON.parse(init.body as string) };
        return Promise.resolve(
          new Response(JSON.stringify({ reply: '试试 GROUP BY' }), { status: 200 }),
        );
      }),
    );
    render(<AiCopilot exerciseId="m1-01" getSql={() => 'SELECT 1'} getError={() => null} />);
    fireEvent.click(screen.getByRole('button', { name: /提示/ }));
    await waitFor(() => expect(screen.getByText('试试 GROUP BY')).toBeInTheDocument());
    expect(seen.url).toBe('/api/ai');
    expect(seen.body).toMatchObject({ action: 'hint', exerciseId: 'm1-01', sql: 'SELECT 1' });
  });

  it('出错时显示错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ error: '次数用完了' }), { status: 429 })),
      ),
    );
    render(<AiCopilot exerciseId="m1-01" getSql={() => 'x'} getError={() => null} />);
    fireEvent.click(screen.getByRole('button', { name: /解释/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('次数用完了'));
  });
});
