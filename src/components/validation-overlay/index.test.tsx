import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ValidationOverlay from './index';

const useOverlayPositionMock = vi.hoisted(() => vi.fn());
const useOverlayVisibilityMock = vi.hoisted(() => vi.fn());
const useAutoHideMock = vi.hoisted(() => vi.fn());

vi.mock('./hooks/useOverlayPosition', () => ({
  useOverlayPosition: useOverlayPositionMock,
}));

vi.mock('./hooks/useOverlayVisibility', () => ({
  useOverlayVisibility: useOverlayVisibilityMock,
}));

vi.mock('./hooks/useAutoHide', () => ({
  useAutoHide: useAutoHideMock,
}));

vi.mock('./components/ValidationPortal', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="validation-portal">{children}</div>
  ),
}));

vi.mock('./components/ValidationOverlayContent', () => ({
  default: ({ error }: { error: string }) => (
    <div data-testid="validation-content">{error}</div>
  ),
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('ValidationOverlay', () => {
  beforeEach(() => {
    useOverlayPositionMock.mockReset();
    useOverlayVisibilityMock.mockReset();
    useAutoHideMock.mockReset();

    useOverlayPositionMock.mockReturnValue({
      top: 120,
      left: 240,
      width: 200,
    });
    useOverlayVisibilityMock.mockReturnValue({
      showOverlay: true,
    });
  });

  it('returns null when error is empty or position is unavailable', () => {
    const { rerender, container } = render(
      <ValidationOverlay
        error={null}
        showError={true}
        targetRef={{ current: document.createElement('input') }}
      />
    );

    expect(container.firstChild).toBeNull();

    useOverlayPositionMock.mockReturnValue(null);
    rerender(
      <ValidationOverlay
        error="Required"
        showError={true}
        targetRef={{ current: document.createElement('input') }}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders portal/content when showOverlay is true and wires hook inputs', () => {
    const onAutoHide = vi.fn();

    render(
      <ValidationOverlay
        error="Wajib diisi"
        showError={true}
        targetRef={{ current: document.createElement('input') }}
        autoHide={true}
        autoHideDelay={1500}
        onAutoHide={onAutoHide}
        isHovered={true}
        hasAutoHidden={false}
        isOpen={false}
      />
    );

    expect(screen.getByTestId('validation-portal')).toBeInTheDocument();
    expect(screen.getByTestId('validation-content')).toHaveTextContent(
      'Wajib diisi'
    );

    expect(useOverlayPositionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        showError: true,
        error: 'Wajib diisi',
        isOpen: false,
      })
    );
    expect(useOverlayVisibilityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        showError: true,
        hasAutoHidden: false,
        isHovered: true,
      })
    );
    expect(useAutoHideMock).toHaveBeenCalledWith(
      expect.objectContaining({
        showOverlay: true,
        autoHide: true,
        autoHideDelay: 1500,
        onAutoHide,
      })
    );
  });

  it('keeps portal mounted but hides content when showOverlay is false', () => {
    useOverlayVisibilityMock.mockReturnValue({ showOverlay: false });

    render(
      <ValidationOverlay
        error="Invalid"
        showError={true}
        targetRef={{ current: document.createElement('input') }}
      />
    );

    expect(screen.getByTestId('validation-portal')).toBeInTheDocument();
    expect(screen.queryByTestId('validation-content')).not.toBeInTheDocument();
  });
});
