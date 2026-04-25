import type { Dispatch, SetStateAction, RefObject } from "react";
import { useCallback, useEffect, useMemo } from "react";
import type { PendingComposerAttachment } from "../types";
import { useComposerAttachmentLinkPrompt } from "./useComposerAttachmentLinkPrompt";
import { useComposerAttachmentPickers } from "./useComposerAttachmentPickers";
import { useComposerAttachmentPreviewState } from "./useComposerAttachmentPreviewState";
import { useComposerAttachMenu } from "./useComposerAttachMenu";
import { useComposerLoadingAttachments } from "./useComposerLoadingAttachments";
import { useComposerPendingAttachments } from "./useComposerPendingAttachments";

interface UseChatComposerAttachmentsProps {
  currentChannelId?: string | null;
  userId?: string | null;
  editingMessageId: string | null;
  closeMessageMenu: () => void;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
}

export const useChatComposerAttachments = ({
  currentChannelId = null,
  userId = null,
  editingMessageId,
  closeMessageMenu,
  messageInputRef,
  message,
  setMessage,
}: UseChatComposerAttachmentsProps) => {
  const attachMenu = useComposerAttachMenu({ closeMessageMenu });

  const {
    pendingComposerAttachments,
    pendingImagePreviewUrlsRef,
    removePendingComposerAttachment: removePendingComposerAttachmentFromQueue,
    clearPendingComposerAttachments: clearPendingComposerAttachmentsFromQueue,
    restorePendingComposerAttachments: restorePendingComposerAttachmentsFromQueue,
    queueComposerImage,
    queueComposerFile,
    compressPendingComposerImage,
    replacePendingComposerAttachmentFile,
  } = useComposerPendingAttachments({
    currentChannelId,
    userId,
    editingMessageId,
    messageInputRef,
  });

  const {
    closeAttachModal,
    isAttachModalOpen,
    attachButtonRef,
    attachModalRef,
    handleAttachButtonClick,
  } = attachMenu;

  const preview = useComposerAttachmentPreviewState({
    closeAttachModal,
    closeMessageMenu,
    pendingComposerAttachments,
    resetKey: currentChannelId,
  });

  const loading = useComposerLoadingAttachments({
    editingMessageId,
    pendingComposerAttachments,
    queueComposerFile,
    queueComposerImage,
    replacePendingComposerAttachmentFile,
    resetKey: currentChannelId,
  });

  const linkPrompt = useComposerAttachmentLinkPrompt({
    closeAttachModal,
    closeMessageMenu,
    message,
    messageInputRef,
    queueAttachmentComposerLink: loading.queueAttachmentComposerLink,
    queueComposerImage,
    queueLoadingComposerAttachment: loading.queueLoadingComposerAttachment,
    setMessage,
    resetKey: currentChannelId,
  });

  const pickers = useComposerAttachmentPickers({
    closeAttachModal,
    queueComposerImage,
    queueComposerFile,
  });

  const {
    previewComposerImageAttachment,
    composerImageExpandedUrl,
    isComposerImageExpanded,
    isComposerImageExpandedVisible,
    openComposerImagePreview,
    closeComposerImagePreview,
    resetComposerImagePreviewState,
  } = preview;
  const {
    loadingComposerAttachments,
    isLoadingAttachmentComposerAttachments,
    cancelLoadingComposerAttachment,
    compressPendingComposerPdf,
    resetLoadingComposerAttachments,
  } = loading;
  const {
    attachmentPastePromptRef,
    attachmentPastePromptUrl,
    isAttachmentPastePromptAttachmentCandidate,
    isAttachmentPastePromptShortenable,
    hoverableAttachmentCandidates,
    hoverableAttachmentUrl,
    rawAttachmentUrl,
    clearAttachmentPasteState,
    dismissAttachmentPastePrompt,
    openAttachmentPastePrompt,
    openComposerLinkPrompt,
    handleEditAttachmentLink,
    handleOpenAttachmentPastePromptLink,
    handleCopyAttachmentPastePromptLink,
    handleShortenAttachmentPastePromptLink,
    handleComposerPaste,
    handleUseAttachmentPasteAsUrl,
    handleUseAttachmentPasteAsAttachment,
    resetComposerLinkPromptState,
  } = linkPrompt;
  const {
    imageInputRef,
    documentInputRef,
    audioInputRef,
    clearReplaceComposerAttachmentTargets,
    handleAttachImageClick,
    handleAttachDocumentClick,
    handleAttachAudioClick,
    handleImageFileChange,
    handleDocumentFileChange,
    handleAudioFileChange,
  } = pickers;

  const composerAttachmentPreviewItems = useMemo(() => {
    if (loadingComposerAttachments.length === 0) {
      return pendingComposerAttachments;
    }

    const pendingAttachmentIds = new Set(
      pendingComposerAttachments.map((attachment) => attachment.id),
    );
    const loadingByReplacedAttachmentId = new Map(
      loadingComposerAttachments
        .filter(
          (attachment) =>
            attachment.replaceAttachmentId &&
            pendingAttachmentIds.has(attachment.replaceAttachmentId),
        )
        .map((attachment) => [attachment.replaceAttachmentId!, attachment]),
    );

    const previewItems = pendingComposerAttachments.map((attachment) => {
      return loadingByReplacedAttachmentId.get(attachment.id) ?? attachment;
    });
    const danglingLoadingAttachments = loadingComposerAttachments.filter(
      (attachment) =>
        !attachment.replaceAttachmentId ||
        !pendingAttachmentIds.has(attachment.replaceAttachmentId),
    );

    return [...previewItems, ...danglingLoadingAttachments];
  }, [loadingComposerAttachments, pendingComposerAttachments]);

  const resetScopedComposerAttachmentState = useCallback(() => {
    closeAttachModal();
    clearReplaceComposerAttachmentTargets();
    resetComposerImagePreviewState();
    resetLoadingComposerAttachments();
    resetComposerLinkPromptState();
  }, [
    clearReplaceComposerAttachmentTargets,
    closeAttachModal,
    resetComposerImagePreviewState,
    resetComposerLinkPromptState,
    resetLoadingComposerAttachments,
  ]);

  useEffect(() => {
    resetScopedComposerAttachmentState();
  }, [currentChannelId, resetScopedComposerAttachmentState]);

  const removePendingComposerAttachment = useCallback(
    (attachmentId: string) => {
      removePendingComposerAttachmentFromQueue(attachmentId);

      if (previewComposerImageAttachment?.id === attachmentId) {
        resetComposerImagePreviewState();
      }

      clearReplaceComposerAttachmentTargets(attachmentId);
    },
    [
      clearReplaceComposerAttachmentTargets,
      previewComposerImageAttachment?.id,
      removePendingComposerAttachmentFromQueue,
      resetComposerImagePreviewState,
    ],
  );

  const clearPendingComposerAttachments = useCallback(() => {
    resetScopedComposerAttachmentState();
    clearPendingComposerAttachmentsFromQueue();
  }, [clearPendingComposerAttachmentsFromQueue, resetScopedComposerAttachmentState]);

  const restorePendingComposerAttachments = useCallback(
    (attachments: PendingComposerAttachment[]) => {
      resetScopedComposerAttachmentState();
      restorePendingComposerAttachmentsFromQueue(attachments);
    },
    [resetScopedComposerAttachmentState, restorePendingComposerAttachmentsFromQueue],
  );

  return {
    linkPrompt,
    isAttachModalOpen,
    pendingComposerAttachments,
    composerAttachmentPreviewItems,
    loadingComposerAttachments,
    isLoadingAttachmentComposerAttachments,
    attachmentPastePromptUrl,
    isAttachmentPastePromptAttachmentCandidate,
    isAttachmentPastePromptShortenable,
    hoverableAttachmentCandidates,
    hoverableAttachmentUrl,
    rawAttachmentUrl,
    previewComposerImageAttachment,
    composerImageExpandedUrl,
    isComposerImageExpanded,
    isComposerImageExpandedVisible,
    attachButtonRef,
    attachModalRef,
    attachmentPastePromptRef,
    imageInputRef,
    documentInputRef,
    audioInputRef,
    pendingImagePreviewUrlsRef,
    closeAttachModal,
    clearAttachmentPasteState,
    dismissAttachmentPastePrompt,
    openAttachmentPastePrompt,
    openComposerLinkPrompt,
    handleEditAttachmentLink,
    handleOpenAttachmentPastePromptLink,
    handleCopyAttachmentPastePromptLink,
    handleShortenAttachmentPastePromptLink,
    handleAttachButtonClick,
    handleAttachImageClick,
    handleAttachDocumentClick,
    handleAttachAudioClick,
    handleImageFileChange,
    handleDocumentFileChange,
    handleAudioFileChange,
    handleComposerPaste,
    handleUseAttachmentPasteAsUrl,
    handleUseAttachmentPasteAsAttachment,
    openComposerImagePreview,
    closeComposerImagePreview,
    cancelLoadingComposerAttachment,
    removePendingComposerAttachment,
    clearPendingComposerAttachments,
    restorePendingComposerAttachments,
    queueComposerImage,
    compressPendingComposerImage,
    compressPendingComposerPdf,
  };
};
