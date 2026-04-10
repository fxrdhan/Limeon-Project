import type { ChatTargetUser } from '@/types';

export type ChatSidebarPanelTargetUser = ChatTargetUser;

export interface ChatSidebarPanelProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: ChatSidebarPanelTargetUser;
}

export interface PendingSendRegistration {
  complete: () => void;
  isCancelled: () => boolean;
}

export interface ComposerHoverableAttachmentCandidate {
  id: string;
  url: string;
  pastedText: string;
  rangeStart: number;
  rangeEnd: number;
}

export interface ComposerPromptableLink {
  url: string;
  pastedText: string;
  rangeStart: number;
  rangeEnd: number;
}

export type MenuPlacement = 'left' | 'right' | 'up' | 'down';
export type MenuSideAnchor = 'top' | 'middle' | 'bottom';
export type MenuVerticalAnchor = 'left' | 'right';
export type ComposerPendingFileKind = 'audio' | 'document';

export type PendingComposerFile = {
  file: File;
  fileName: string;
  fileTypeLabel: string;
  fileKind: ComposerPendingFileKind;
  mimeType: string;
  pdfCoverUrl?: string | null;
  pdfPageCount?: number | null;
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
  pdfPageCount: number | null;
};

export type LoadingComposerAttachment = {
  id: string;
  fileName: string;
  sourceUrl: string;
  replaceAttachmentId?: string | null;
  loadingKind?: 'default' | 'pdf-compression';
  loadingPhase?: 'uploading' | 'processing' | 'done';
  status: 'loading';
};

export type ComposerAttachmentPreviewItem =
  | PendingComposerAttachment
  | LoadingComposerAttachment;
