import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HistoryButton from './HistoryButton';

const useEntityModalMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/button', () => ({
  default: ({
    children,
    ...props
  }: React.ComponentPropsWithoutRef<'button'>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('../../shared/contexts/EntityModalContext', () => ({
  useEntityModal: useEntityModalMock,
}));

describe('HistoryButton', () => {
  beforeEach(() => {
    useEntityModalMock.mockReset();
  });

  it('opens history panel with provided entity identifiers', () => {
    const openHistory = vi.fn();
    useEntityModalMock.mockReturnValue({
      uiActions: { openHistory },
    });

    render(
      <HistoryButton
        entityTable="categories"
        entityId="cat-1"
        entityName="Kategori"
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Lihat riwayat perubahan Kategori');

    fireEvent.click(button);
    expect(openHistory).toHaveBeenCalledWith('categories', 'cat-1');
  });

  it('merges custom class name into base button styles', () => {
    useEntityModalMock.mockReturnValue({
      uiActions: { openHistory: vi.fn() },
    });

    render(
      <HistoryButton
        entityTable="types"
        entityId="type-1"
        entityName="Jenis"
        className="extra-history-class"
      />
    );

    expect(screen.getByRole('button')).toHaveClass(
      'text-slate-500',
      'extra-history-class'
    );
  });
});
