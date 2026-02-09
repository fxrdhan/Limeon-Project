import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityModalTemplate from './EntityModalTemplate';

const useEntityModalMock = vi.hoisted(() => vi.fn());

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: (props: React.ComponentPropsWithoutRef<'div'>) => <div {...props} />,
  },
}));

vi.mock('../../shared/contexts/EntityModalContext', () => ({
  useEntityModal: useEntityModalMock,
}));

describe('EntityModalTemplate', () => {
  beforeEach(() => {
    useEntityModalMock.mockReset();
  });

  it('returns null when modal is not open', () => {
    useEntityModalMock.mockReturnValue({
      ui: { isOpen: false, isClosing: false },
      uiActions: { handleBackdropClick: vi.fn() },
      comparison: { isOpen: false },
    });

    const { container } = render(
      <EntityModalTemplate>
        <div>Child</div>
      </EntityModalTemplate>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders modal and handles backdrop click when not closing', () => {
    const handleBackdropClick = vi.fn();
    useEntityModalMock.mockReturnValue({
      ui: { isOpen: true, isClosing: false },
      uiActions: { handleBackdropClick },
      comparison: { isOpen: false },
    });

    render(
      <EntityModalTemplate>
        <div data-testid="template-child">Inside Modal</div>
      </EntityModalTemplate>
    );

    const backdrop = document.querySelector('.fixed.inset-0');
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop as Element);
    expect(handleBackdropClick).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('template-child')).toBeInTheDocument();
  });

  it('ignores backdrop click while closing', () => {
    const handleBackdropClick = vi.fn();
    useEntityModalMock.mockReturnValue({
      ui: { isOpen: true, isClosing: true },
      uiActions: { handleBackdropClick },
      comparison: { isOpen: true },
    });

    render(
      <EntityModalTemplate>
        <div data-testid="template-child">Inside Modal</div>
      </EntityModalTemplate>
    );

    const backdrop = document.querySelector('.fixed.inset-0');
    fireEvent.click(backdrop as Element);
    expect(handleBackdropClick).not.toHaveBeenCalled();
  });

  it('stops propagation on content click', () => {
    const handleBackdropClick = vi.fn();
    useEntityModalMock.mockReturnValue({
      ui: { isOpen: true, isClosing: false },
      uiActions: { handleBackdropClick },
      comparison: { isOpen: false },
    });

    render(
      <EntityModalTemplate>
        <button data-testid="inner-action" type="button">
          Click
        </button>
      </EntityModalTemplate>
    );

    fireEvent.click(screen.getByTestId('inner-action'));
    expect(handleBackdropClick).not.toHaveBeenCalled();
  });
});
