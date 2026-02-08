import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DiffText from './DiffText';

const diffCharsMock = vi.hoisted(() => vi.fn());
const convertChangesToSegmentsMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/jsdiff', () => ({
  diffChars: diffCharsMock,
  convertChangesToSegments: convertChangesToSegmentsMock,
}));

describe('DiffText', () => {
  beforeEach(() => {
    diffCharsMock.mockReset();
    convertChangesToSegmentsMock.mockReset();

    diffCharsMock.mockReturnValue([]);
    convertChangesToSegmentsMock.mockReturnValue([]);
  });

  it('renders plain new text when no diff segments are available', () => {
    render(<DiffText oldText="old" newText="new" className="custom" />);

    expect(diffCharsMock).toHaveBeenCalledWith('old', 'new');
    expect(screen.getByText('new')).toBeInTheDocument();
  });

  it('renders added/removed/unchanged segments with the expected styles', () => {
    convertChangesToSegmentsMock.mockReturnValue([
      { type: 'unchanged', text: 'Para' },
      { type: 'removed', text: 'ce' },
      { type: 'added', text: 'si' },
    ]);

    render(<DiffText oldText="Parace" newText="Parasi" />);

    expect(screen.getByText('Para')).toHaveClass('text-slate-800');
    expect(screen.getByText('ce')).toHaveAttribute('title', 'Dihapus');
    expect(screen.getByText('si')).toHaveAttribute('title', 'Ditambahkan');
  });

  it('fails gracefully when diff computation throws', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    diffCharsMock.mockImplementation(() => {
      throw new Error('boom');
    });

    render(<DiffText oldText="A" newText="B" />);

    expect(screen.getByText('B')).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
