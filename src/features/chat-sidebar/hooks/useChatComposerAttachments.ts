import type { Dispatch, SetStateAction, ChangeEvent, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PendingComposerAttachment } from '../types';
import { useComposerAttachmentLinkPrompt } from './useComposerAttachmentLinkPrompt';
import { useComposerAttachmentPreviewState } from './useComposerAttachmentPreviewState';
import { useComposerLoadingAttachments } from './useComposerLoadingAttachments';
import { useComposerPendingAttachments } from './useComposerPendingAttachments';

interface UseChatComposerAttachmentsProps {
  currentChannelId: string | null;
  editingMessageId: string | null;
  closeMessageMenu: () => void;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
}

export const useChatComposerAttachments = ({
  currentChannelId,
  editingMessageId,
  closeMessageMenu,
  messageInputRef,
  message,
  setMessage,
}: UseChatComposerAttachmentsProps) => {
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const attachModalRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const replaceComposerImageAttachmentIdRef = useRef<string | null>(null);
  const replaceComposerDocumentAttachmentIdRef = useRef<string | null>(null);

  const closeAttachModal = useCallback(() => {
    setIsAttachModalOpen(false);
  }, []);

  const {
    pendingComposerAttachments,
    pendingImagePreviewUrlsRef,
    removePendingComposerAttachment: removePendingComposerAttachmentFromQueue,
    clearPendingComposerAttachments: clearPendingComposerAttachmentsFromQueue,
    restorePendingComposerAttachments:
      restorePendingComposerAttachmentsFromQueue,
    queueComposerImage,
    queueComposerFile,
    compressPendingComposerImage,
    replacePendingComposerAttachmentFile,
  } = useComposerPendingAttachments({
    currentChannelId,
    editingMessageId,
    messageInputRef,
  });

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

  const {
    previewComposerImageAttachment,
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

  const composerAttachmentPreviewItems = useMemo(() => {
    if (loadingComposerAttachments.length === 0) {
      return pendingComposerAttachments;
    }

    const pendingAttachmentIds = new Set(
      pendingComposerAttachments.map(attachment => attachment.id)
    );
    const loadingByReplacedAttachmentId = new Map(
      loadingComposerAttachments
        .filter(
          attachment =>
            attachment.replaceAttachmentId &&
            pendingAttachmentIds.has(attachment.replaceAttachmentId)
        )
        .map(attachment => [attachment.replaceAttachmentId!, attachment])
    );

    const previewItems = pendingComposerAttachments.map(attachment => {
      return loadingByReplacedAttachmentId.get(attachment.id) ?? attachment;
    });
    const danglingLoadingAttachments = loadingComposerAttachments.filter(
      attachment =>
        !attachment.replaceAttachmentId ||
        !pendingAttachmentIds.has(attachment.replaceAttachmentId)
    );

    return [...previewItems, ...danglingLoadingAttachments];
  }, [loadingComposerAttachments, pendingComposerAttachments]);

  const resetScopedComposerAttachmentState = useCallback(() => {
    closeAttachModal();
    replaceComposerImageAttachmentIdRef.current = null;
    replaceComposerDocumentAttachmentIdRef.current = null;
    resetComposerImagePreviewState();
    resetLoadingComposerAttachments();
    resetComposerLinkPromptState();
  }, [
    closeAttachModal,
    resetComposerImagePreviewState,
    resetComposerLinkPromptState,
    resetLoadingComposerAttachments,
  ]);

  useEffect(() => {
    resetScopedComposerAttachmentState();
  }, [currentChannelId, resetScopedComposerAttachmentState]);

  const handleAttachButtonClick = useCallback(() => {
    if (isAttachModalOpen) {
      closeAttachModal();
      return;
    }

    closeMessageMenu();
    setIsAttachModalOpen(true);
  }, [closeAttachModal, closeMessageMenu, isAttachModalOpen]);

  const removePendingComposerAttachment = useCallback(
    (attachmentId: string) => {
      removePendingComposerAttachmentFromQueue(attachmentId);

      if (previewComposerImageAttachment?.id === attachmentId) {
        resetComposerImagePreviewState();
      }

      replaceComposerImageAttachmentIdRef.current =
        replaceComposerImageAttachmentIdRef.current === attachmentId
          ? null
          : replaceComposerImageAttachmentIdRef.current;
      replaceComposerDocumentAttachmentIdRef.current =
        replaceComposerDocumentAttachmentIdRef.current === attachmentId
          ? null
          : replaceComposerDocumentAttachmentIdRef.current;
    },
    [
      previewComposerImageAttachment?.id,
      resetComposerImagePreviewState,
      removePendingComposerAttachmentFromQueue,
    ]
  );

  const clearPendingComposerAttachments = useCallback(() => {
    resetScopedComposerAttachmentState();
    clearPendingComposerAttachmentsFromQueue();
  }, [
    clearPendingComposerAttachmentsFromQueue,
    resetScopedComposerAttachmentState,
  ]);

  const restorePendingComposerAttachments = useCallback(
    (attachments: PendingComposerAttachment[]) => {
      resetScopedComposerAttachmentState();
      restorePendingComposerAttachmentsFromQueue(attachments);
    },
    [
      resetScopedComposerAttachmentState,
      restorePendingComposerAttachmentsFromQueue,
    ]
  );

  const handleAttachImageClick = useCallback(
    (replaceAttachmentId?: string) => {
      replaceComposerImageAttachmentIdRef.current = replaceAttachmentId ?? null;
      replaceComposerDocumentAttachmentIdRef.current = null;
      closeAttachModal();
      imageInputRef.current?.click();
    },
    [closeAttachModal]
  );

  const handleAttachDocumentClick = useCallback(
    (replaceAttachmentId?: string) => {
      replaceComposerImageAttachmentIdRef.current = null;
      replaceComposerDocumentAttachmentIdRef.current =
        replaceAttachmentId ?? null;
      closeAttachModal();
      documentInputRef.current?.click();
    },
    [closeAttachModal]
  );

  const handleAttachAudioClick = useCallback(() => {
    closeAttachModal();
    replaceComposerImageAttachmentIdRef.current = null;
    replaceComposerDocumentAttachmentIdRef.current = null;
    audioInputRef.current?.click();
  }, [closeAttachModal]);

  const handleImageFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      event.target.value = '';
      if (selectedFiles.length === 0) {
        return;
      }

      const replaceAttachmentId = replaceComposerImageAttachmentIdRef.current;
      replaceComposerImageAttachmentIdRef.current = null;
      replaceComposerDocumentAttachmentIdRef.current = null;

      for (const [fileIndex, selectedFile] of selectedFiles.entries()) {
        const didQueue = queueComposerImage(
          selectedFile,
          fileIndex === 0 ? (replaceAttachmentId ?? undefined) : undefined
        );
        if (!didQueue) {
          break;
        }
      }
    },
    [queueComposerImage]
  );

  const handleDocumentFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      event.target.value = '';
      if (selectedFiles.length === 0) {
        return;
      }

      const replaceAttachmentId =
        replaceComposerDocumentAttachmentIdRef.current;
      replaceComposerDocumentAttachmentIdRef.current = null;

      for (const [fileIndex, selectedFile] of selectedFiles.entries()) {
        const didQueue = queueComposerFile(
          selectedFile,
          'document',
          fileIndex === 0 ? (replaceAttachmentId ?? undefined) : undefined
        );
        if (!didQueue) {
          break;
        }
      }
    },
    [queueComposerFile]
  );

  const handleAudioFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      event.target.value = '';
      if (selectedFiles.length === 0) {
        return;
      }

      replaceComposerDocumentAttachmentIdRef.current = null;
      for (const selectedFile of selectedFiles) {
        const didQueue = queueComposerFile(selectedFile, 'audio');
        if (!didQueue) {
          break;
        }
      }
    },
    [queueComposerFile]
  );

  useEffect(() => {
    if (!isAttachModalOpen) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Node)) {
        return;
      }

      if (eventTarget instanceof Element) {
        const profileLayer = eventTarget.closest(
          '[data-profile-trigger="true"], [data-profile-portal="true"]'
        );
        if (profileLayer) {
          return;
        }
      }

      if (attachModalRef.current?.contains(eventTarget)) {
        return;
      }
      if (attachButtonRef.current?.contains(eventTarget)) {
        return;
      }

      closeAttachModal();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAttachModal();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeAttachModal, isAttachModalOpen]);

  return {
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
