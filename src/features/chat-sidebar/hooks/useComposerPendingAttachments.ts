import { useEffect, useRef, useState, type RefObject } from 'react';
import type { PendingComposerAttachment } from '../types';
import { useComposerAttachmentPreviews } from './composer-pending-attachments/useComposerAttachmentPreviews';
import { useComposerAttachmentQueueActions } from './composer-pending-attachments/useComposerAttachmentQueueActions';
import { useComposerDraftAttachmentPersistence } from './composer-pending-attachments/useComposerDraftAttachmentPersistence';

interface UseComposerPendingAttachmentsProps {
  currentChannelId: string | null;
  userId?: string | null;
  editingMessageId: string | null;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
}

export const useComposerPendingAttachments = ({
  currentChannelId,
  userId = null,
  editingMessageId,
  messageInputRef,
}: UseComposerPendingAttachmentsProps) => {
  const [pendingComposerAttachments, setPendingComposerAttachments] = useState<
    PendingComposerAttachment[]
  >([]);
  const pendingComposerAttachmentsRef = useRef<PendingComposerAttachment[]>([]);

  useEffect(() => {
    pendingComposerAttachmentsRef.current.length = 0;
    pendingComposerAttachmentsRef.current.push(...pendingComposerAttachments);
  }, [pendingComposerAttachments]);

  const { pendingImagePreviewUrlsRef, releasePendingImagePreviewUrl } =
    useComposerAttachmentPreviews({
      pendingComposerAttachments,
      pendingComposerAttachmentsRef,
      setPendingComposerAttachments,
    });
  const { markPendingComposerAttachmentsDirty } =
    useComposerDraftAttachmentPersistence({
      currentChannelId,
      pendingComposerAttachments,
      releasePendingImagePreviewUrl,
      setPendingComposerAttachments,
      userId,
    });
  const {
    clearPendingComposerAttachments,
    compressPendingComposerImage,
    queueComposerFile,
    queueComposerImage,
    removePendingComposerAttachment,
    replacePendingComposerAttachmentFile,
    restorePendingComposerAttachments,
  } = useComposerAttachmentQueueActions({
    editingMessageId,
    markPendingComposerAttachmentsDirty,
    messageInputRef,
    pendingComposerAttachmentsRef,
    releasePendingImagePreviewUrl,
    setPendingComposerAttachments,
  });

  return {
    pendingComposerAttachments,
    pendingImagePreviewUrlsRef,
    removePendingComposerAttachment,
    clearPendingComposerAttachments,
    restorePendingComposerAttachments,
    queueComposerImage,
    queueComposerFile,
    compressPendingComposerImage,
    replacePendingComposerAttachmentFile,
  };
};
