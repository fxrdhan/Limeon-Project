import type { PendingComposerAttachmentKind } from '../../types';

export interface PersistedComposerDraftMessageRecord {
  message: string;
  updatedAt: number;
}

export interface PersistedComposerDraftMessageStore {
  [channelId: string]: PersistedComposerDraftMessageRecord;
}

export interface PersistedComposerDraftAttachmentRecord {
  id: string;
  file: File | Blob;
  fileKind: PendingComposerAttachmentKind;
  fileName: string;
  fileTypeLabel: string;
  mimeType: string;
  pdfCoverUrl: string | null;
  pdfPageCount: number | null;
}

export interface PersistedComposerDraftRecord {
  channelId: string;
  attachments: PersistedComposerDraftAttachmentRecord[];
  updatedAt: number;
}

export interface PersistedComposerDraftAttachment {
  id: string;
  file: File;
  fileKind: PendingComposerAttachmentKind;
  fileName: string;
  fileTypeLabel: string;
  mimeType: string;
  pdfCoverUrl: string | null;
  pdfPageCount: number | null;
}
