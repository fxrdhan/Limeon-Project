export interface ChatSidebarPanelTargetUser {
  id: string;
  name: string;
  email: string;
  profilephoto?: string | null;
}

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
