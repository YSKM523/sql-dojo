// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultTable } from '@/components/ResultTable';

describe('ResultTable', () => {
  it('renders column headers and cells', () => {
    render(<ResultTable result={{ columns: ['id', 'name'], rows: [[1, '小明']] }} />);
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('小明')).toBeInTheDocument();
  });

  it('renders NULL marker for null cells', () => {
    render(<ResultTable result={{ columns: ['c'], rows: [[null]] }} />);
    expect(screen.getByText('NULL')).toBeInTheDocument();
  });

  it('shows an empty-result message', () => {
    render(<ResultTable result={{ columns: ['c'], rows: [] }} />);
    expect(screen.getByText(/没有返回任何行/)).toBeInTheDocument();
  });
});
