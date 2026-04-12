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
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <div data-testid="popup-menu-popover" className={className} style={style}>
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
});
