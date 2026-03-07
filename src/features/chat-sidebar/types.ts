import type { ChatTargetUser } from '@/types';

export type ChatSidebarPanelTargetUser = ChatTargetUser;

export interface ChatSidebarPanelProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: ChatSidebarPanelTargetUser;
}

export type MenuPlacement = 'left' | 'right' | 'up' | 'down';
export type MenuSideAnchor = 'top' | 'middle' | 'bottom';
export type ComposerPendingFileKind = 'audio' | 'document';

export type PendingComposerFile = {
  file: File;
  fileName: string;
  fileTypeLabel: string;
  fileKind: ComposerPendingFileKind;
  mimeType: string;
};

export type PendingComposerAttachmentKind = 'image' | ComposerPendingFileKind;

export type PendingComposerAttachment = {
  id: string;
  file: File;
  fileName: string;
  fileTypeLabel: string;
  fileKind: PendingComposerAttachmentKind;
  mimeType: string;
  previewUrl: string | null;
  pdfCoverUrl: string | null;
};
