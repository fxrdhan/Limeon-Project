import type { RefObject } from 'react';
import type { ComposerAttachmentPreviewItem } from '../../../types';

export interface ComposerAttachmentPreviewListProps {
  attachments: ComposerAttachmentPreviewItem[];
  openImageActionsAttachmentId: string | null;
  isSelectionMode: boolean;
  selectedAttachmentIds: string[];
  imageActionsButtonRef: RefObject<HTMLButtonElement | null>;
  transition: {
    duration: number;
    ease:
      | 'easeIn'
      | 'easeOut'
      | 'easeInOut'
      | readonly [number, number, number, number];
    layout: {
      type: 'tween';
      ease: readonly [number, number, number, number];
      duration: number;
    };
  };
  onToggleImageActionsMenu: (attachmentId: string) => void;
  onCloseImageActionsMenu?: () => void;
  onMenuRepositionPauseChange?: (isPaused: boolean) => void;
  onToggleAttachmentSelection: (attachmentId: string) => void;
  onCancelLoadingComposerAttachment: (attachmentId: string) => void;
  onRemovePendingComposerAttachment: (attachmentId: string) => void;
  onScrollStateChange?: (state: {
    hasOverflow: boolean;
    isAtTop: boolean;
    isAtBottom: boolean;
  }) => void;
}
