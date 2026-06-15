// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerdictBanner } from '@/components/VerdictBanner';

describe('VerdictBanner', () => {
  it('shows a success status when passed', () => {
    render(<VerdictBanner verdict={{ passed: true }} />);
    expect(screen.getByRole('status')).toHaveTextContent('通过');
  });

  it('shows an alert with the reason when failed', () => {
    render(<VerdictBanner verdict={{ passed: false, reason: '期望 5 行，实际 4 行' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('期望 5 行，实际 4 行');
  });
});
