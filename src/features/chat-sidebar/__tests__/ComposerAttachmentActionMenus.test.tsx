import { createRef } from 'react';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { ComposerAttachmentActionMenus } from '../components/composer/ComposerAttachmentActionMenus';

vi.mock('@/components/shared/popup-menu-popover', () => ({
  default: ({
    children,
    className,
    style,
    animate,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    animate?: {
      opacity?: number;
    };
  }) => (
    <div
      data-testid="popup-menu-popover"
      data-animate-opacity={animate?.opacity}
      className={className}
      style={style}
    >
      {children}
    </div>
  ),
}));

vi.mock('@/components/image-manager/PopupMenuContent', () => ({
  default: ({
    actions,
  }: {
    actions: Array<{
      label: string;
    }>;
  }) => (
    <div>
      {actions.map(action => (
        <button key={action.label} type="button">
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

describe('ComposerAttachmentActionMenus', () => {
  it('mounts the image actions menu offscreen before the measured position is ready', () => {
    render(
      <ComposerAttachmentActionMenus
        openImageActionsAttachmentId="attachment-1"
        imageActionsMenuPosition={null}
        pdfCompressionMenuPosition={null}
        imageActions={[
          {
            label: 'Buka',
            icon: <span>icon</span>,
            onClick: vi.fn(),
          },
        ]}
        pdfCompressionLevelActions={[]}
        imageActionsMenuRef={createRef<HTMLDivElement>()}
        pdfCompressionMenuRef={createRef<HTMLDivElement>()}
      />
    );

    const popover = screen.getByTestId('popup-menu-popover');

    expect(screen.getByText('Buka')).toBeTruthy();
    expect(popover.getAttribute('style')).toContain('top: -10000px');
    expect(popover.getAttribute('style')).toContain('left: -10000px');
    expect(popover.getAttribute('style')).toContain('visibility: hidden');
    expect(popover.getAttribute('style')).toContain('pointer-events: none');
  });

  it('keeps the attachment menu mounted briefly so the exit animation can play', () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <ComposerAttachmentActionMenus
        openImageActionsAttachmentId="attachment-1"
        imageActionsMenuPosition={{ top: 24, left: 48 }}
        pdfCompressionMenuPosition={null}
        imageActions={[
          {
            label: 'Buka',
            icon: <span>icon</span>,
            onClick: vi.fn(),
          },
        ]}
        pdfCompressionLevelActions={[]}
        imageActionsMenuRef={createRef<HTMLDivElement>()}
        pdfCompressionMenuRef={createRef<HTMLDivElement>()}
      />
    );

    act(() => {
      rerender(
        <ComposerAttachmentActionMenus
          openImageActionsAttachmentId={null}
          imageActionsMenuPosition={null}
          pdfCompressionMenuPosition={null}
          imageActions={[]}
          pdfCompressionLevelActions={[]}
          imageActionsMenuRef={createRef<HTMLDivElement>()}
          pdfCompressionMenuRef={createRef<HTMLDivElement>()}
        />
      );
    });

    expect(screen.getByText('Buka')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(160);
    });

    expect(screen.queryByText('Buka')).toBeNull();
    vi.useRealTimers();
  });

  it('keeps the popup mounted but hidden while the initial open is paused', () => {
    render(
      <ComposerAttachmentActionMenus
        openImageActionsAttachmentId="attachment-1"
        isMenuRepositionPaused
        imageActionsMenuPosition={{ top: 24, left: 48 }}
        pdfCompressionMenuPosition={null}
        imageActions={[
          {
            label: 'Buka',
            icon: <span>icon</span>,
            onClick: vi.fn(),
          },
        ]}
        pdfCompressionLevelActions={[]}
        imageActionsMenuRef={createRef<HTMLDivElement>()}
        pdfCompressionMenuRef={createRef<HTMLDivElement>()}
      />
    );

    const popover = screen.getByTestId('popup-menu-popover');

    expect(screen.getByText('Buka')).toBeTruthy();
    expect(popover.getAttribute('style')).toContain('top: -10000px');
    expect(popover.dataset.animateOpacity).toBe('0');
  });

  it('holds the popup at the previous position while reposition is paused', () => {
    const { rerender } = render(
      <ComposerAttachmentActionMenus
        openImageActionsAttachmentId="attachment-1"
        imageActionsMenuPosition={{ top: 24, left: 48 }}
        pdfCompressionMenuPosition={null}
        imageActions={[
          {
            label: 'Buka',
            icon: <span>icon</span>,
            onClick: vi.fn(),
          },
        ]}
        pdfCompressionLevelActions={[]}
        imageActionsMenuRef={createRef<HTMLDivElement>()}
        pdfCompressionMenuRef={createRef<HTMLDivElement>()}
      />
    );

    rerender(
      <ComposerAttachmentActionMenus
        openImageActionsAttachmentId="attachment-1"
        isMenuRepositionPaused
        imageActionsMenuPosition={{ top: 96, left: 120 }}
        pdfCompressionMenuPosition={null}
        imageActions={[
          {
            label: 'Buka',
            icon: <span>icon</span>,
            onClick: vi.fn(),
          },
        ]}
        pdfCompressionLevelActions={[]}
        imageActionsMenuRef={createRef<HTMLDivElement>()}
        pdfCompressionMenuRef={createRef<HTMLDivElement>()}
      />
    );

    const popover = screen.getByTestId('popup-menu-popover');

    expect(popover.getAttribute('style')).toContain('top: 24px');
    expect(popover.getAttribute('style')).toContain('left: 48px');
    expect(popover.dataset.animateOpacity).toBe('1');
  });
});
