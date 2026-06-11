import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { PendingComposerAttachment } from '../../types';

export type SetPendingComposerAttachments = Dispatch<
  SetStateAction<PendingComposerAttachment[]>
>;

export type PendingComposerAttachmentsRef = MutableRefObject<
  PendingComposerAttachment[]
>;

export type ReleasePendingImagePreviewUrl = (
  attachmentId: string,
  previewUrl?: string | null
) => void;
