import type { Dispatch, RefObject, SetStateAction } from 'react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
} from 'react';
import toast from 'react-hot-toast';
import {
  CHAT_SIDEBAR_TOASTER_ID,
  COMPOSER_IMAGE_PREVIEW_EXIT_DURATION,
  COMPOSER_IMAGE_PREVIEW_OFFSET,
  EDITING_COMPOSER_OFFSET,
  MAX_PENDING_COMPOSER_ATTACHMENTS,
  MESSAGE_INPUT_MAX_HEIGHT,
  MESSAGE_INPUT_MIN_HEIGHT,
  SEND_SUCCESS_GLOW_DURATION,
  SEND_SUCCESS_GLOW_RESET_BUFFER,
} from '../constants';
import { useChatComposerActions } from './useChatComposerActions';
import type {
  ChatSidebarPanelTargetUser,
  ComposerPendingFileKind,
  PendingComposerAttachment,
} from '../types';
import type { ChatMessage } from '@/services/api/chat.service';

interface UseChatComposerProps {
  isOpen: boolean;
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  closeMessageMenu: () => void;
  scheduleScrollMessagesToBottom: () => void;
  broadcastNewMessage: (message: ChatMessage) => void;
  broadcastUpdatedMessage: (message: ChatMessage) => void;
  broadcastDeletedMessage: (messageId: string) => void;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  focusMessageComposer: () => void;
}

export const useChatComposer = ({
  isOpen,
  user,
  targetUser,
  currentChannelId,
  messages,
  setMessages,
  closeMessageMenu,
  scheduleScrollMessagesToBottom,
  broadcastNewMessage,
  broadcastUpdatedMessage,
  broadcastDeletedMessage,
  messageInputRef,
  focusMessageComposer,
}: UseChatComposerProps) => {
  const [message, setMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [messageInputHeight, setMessageInputHeight] = useState(
    MESSAGE_INPUT_MIN_HEIGHT
  );
  const [composerLayoutMode, setComposerLayoutMode] = useState<
    'inline' | 'multiline'
  >('inline');
  const [isSendSuccessGlowVisible, setIsSendSuccessGlowVisible] =
    useState(false);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [pendingComposerAttachments, setPendingComposerAttachments] = useState<
    PendingComposerAttachment[]
  >([]);
  const [
    composerImagePreviewAttachmentId,
    setComposerImagePreviewAttachmentId,
  ] = useState<string | null>(null);
  const [isComposerImageExpanded, setIsComposerImageExpanded] = useState(false);
  const [isComposerImageExpandedVisible, setIsComposerImageExpandedVisible] =
    useState(false);

  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const attachModalRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const replaceComposerImageAttachmentIdRef = useRef<string | null>(null);
  const replaceComposerDocumentAttachmentIdRef = useRef<string | null>(null);
  const pendingComposerAttachmentsRef = useRef<PendingComposerAttachment[]>([]);
  const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());
  const messageInputHeightRafRef = useRef<number | null>(null);
  const sendSuccessGlowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const composerImagePreviewCloseTimerRef = useRef<number | null>(null);
  const inlineOverflowThresholdRef = useRef<number | null>(null);

  const isHoldingMultilineByInlineOverflow =
    inlineOverflowThresholdRef.current !== null &&
    message.length >= inlineOverflowThresholdRef.current;
  const isTargetMultiline =
    messageInputHeight > MESSAGE_INPUT_MIN_HEIGHT + 2 ||
    isHoldingMultilineByInlineOverflow;
  const isMessageInputMultiline = composerLayoutMode === 'multiline';
  const editingMessagePreview =
    editingMessageId === null
      ? null
      : (messages.find(candidate => candidate.id === editingMessageId)
          ?.message ?? null);
  const previewComposerImageAttachment = pendingComposerAttachments.find(
    attachment =>
      attachment.id === composerImagePreviewAttachmentId &&
      attachment.fileKind === 'image'
  );
  const composerContextualOffset =
    (editingMessagePreview ? EDITING_COMPOSER_OFFSET : 0) +
    (pendingComposerAttachments.length > 0 ? COMPOSER_IMAGE_PREVIEW_OFFSET : 0);

  useEffect(() => {
    pendingComposerAttachmentsRef.current = pendingComposerAttachments;
  }, [pendingComposerAttachments]);

  const triggerSendSuccessGlow = useCallback(() => {
    if (sendSuccessGlowTimeoutRef.current) {
      clearTimeout(sendSuccessGlowTimeoutRef.current);
    }
    setIsSendSuccessGlowVisible(false);
    requestAnimationFrame(() => {
      setIsSendSuccessGlowVisible(true);
    });
    sendSuccessGlowTimeoutRef.current = setTimeout(() => {
      setIsSendSuccessGlowVisible(false);
      sendSuccessGlowTimeoutRef.current = null;
    }, SEND_SUCCESS_GLOW_DURATION + SEND_SUCCESS_GLOW_RESET_BUFFER);
  }, []);

  useEffect(() => {
    const pendingImagePreviewUrls = pendingImagePreviewUrlsRef.current;
    const pendingAttachments = pendingComposerAttachmentsRef.current;

    return () => {
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }

      if (sendSuccessGlowTimeoutRef.current) {
        clearTimeout(sendSuccessGlowTimeoutRef.current);
        sendSuccessGlowTimeoutRef.current = null;
      }

      pendingImagePreviewUrls.forEach(previewUrl => {
        URL.revokeObjectURL(previewUrl);
      });
      pendingImagePreviewUrls.clear();

      pendingAttachments.forEach(attachment => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
      pendingComposerAttachmentsRef.current = [];
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const pendingPdfAttachments = pendingComposerAttachments.filter(
      attachment =>
        attachment.fileKind === 'document' &&
        attachment.pdfCoverUrl === null &&
        (attachment.mimeType === 'application/pdf' ||
          attachment.fileName.toLowerCase().endsWith('.pdf'))
    );
    if (pendingPdfAttachments.length === 0) return;

    const renderPdfCovers = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const pdfWorkerModule =
          await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerModule.default;

        for (const pendingAttachment of pendingPdfAttachments) {
          if (isCancelled) return;

          const fileBuffer = await pendingAttachment.file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument(new Uint8Array(fileBuffer));
          const pdfDocument = await loadingTask.promise;
          const firstPage = await pdfDocument.getPage(1);
          const baseViewport = firstPage.getViewport({ scale: 1 });
          const targetWidth = 44;
          const scale = targetWidth / Math.max(baseViewport.width, 1);
          const viewport = firstPage.getViewport({ scale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          if (!context) {
            void pdfDocument.cleanup();
            void pdfDocument.destroy();
            continue;
          }

          canvas.width = Math.max(1, Math.round(viewport.width));
          canvas.height = Math.max(1, Math.round(viewport.height));

          await firstPage.render({
            canvas,
            canvasContext: context,
            viewport,
            background: 'rgb(255, 255, 255)',
          }).promise;

          void pdfDocument.cleanup();
          void pdfDocument.destroy();
          if (isCancelled) return;

          const coverDataUrl = canvas.toDataURL('image/png');
          setPendingComposerAttachments(previousAttachments =>
            previousAttachments.map(attachment =>
              attachment.id === pendingAttachment.id
                ? { ...attachment, pdfCoverUrl: coverDataUrl }
                : attachment
            )
          );
        }
      } catch (error) {
        console.error('Error rendering PDF cover preview:', error);
      }
    };

    void renderPdfCovers();

    return () => {
      isCancelled = true;
    };
  }, [pendingComposerAttachments]);

  useEffect(() => {
    if (previewComposerImageAttachment || !isComposerImageExpanded) return;
    if (composerImagePreviewCloseTimerRef.current) {
      window.clearTimeout(composerImagePreviewCloseTimerRef.current);
      composerImagePreviewCloseTimerRef.current = null;
    }
    setIsComposerImageExpandedVisible(false);
    setIsComposerImageExpanded(false);
    setComposerImagePreviewAttachmentId(null);
  }, [isComposerImageExpanded, previewComposerImageAttachment]);

  useEffect(() => {
    if (!isComposerImageExpanded) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsComposerImageExpandedVisible(false);
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }
      composerImagePreviewCloseTimerRef.current = window.setTimeout(() => {
        setIsComposerImageExpanded(false);
        setComposerImagePreviewAttachmentId(null);
        composerImagePreviewCloseTimerRef.current = null;
      }, COMPOSER_IMAGE_PREVIEW_EXIT_DURATION);
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isComposerImageExpanded]);

  const closeAttachModal = useCallback(() => {
    setIsAttachModalOpen(false);
  }, []);

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
      setPendingComposerAttachments(previousAttachments => {
        const targetAttachment = previousAttachments.find(
          attachment => attachment.id === attachmentId
        );
        if (targetAttachment?.previewUrl) {
          URL.revokeObjectURL(targetAttachment.previewUrl);
        }
        return previousAttachments.filter(
          attachment => attachment.id !== attachmentId
        );
      });
      setComposerImagePreviewAttachmentId(currentId =>
        currentId === attachmentId ? null : currentId
      );
      replaceComposerImageAttachmentIdRef.current =
        replaceComposerImageAttachmentIdRef.current === attachmentId
          ? null
          : replaceComposerImageAttachmentIdRef.current;
      replaceComposerDocumentAttachmentIdRef.current =
        replaceComposerDocumentAttachmentIdRef.current === attachmentId
          ? null
          : replaceComposerDocumentAttachmentIdRef.current;
    },
    []
  );

  const clearPendingComposerAttachments = useCallback(() => {
    if (composerImagePreviewCloseTimerRef.current) {
      window.clearTimeout(composerImagePreviewCloseTimerRef.current);
      composerImagePreviewCloseTimerRef.current = null;
    }
    setIsComposerImageExpandedVisible(false);
    setIsComposerImageExpanded(false);
    setComposerImagePreviewAttachmentId(null);
    replaceComposerImageAttachmentIdRef.current = null;
    replaceComposerDocumentAttachmentIdRef.current = null;
    setPendingComposerAttachments(previousAttachments => {
      previousAttachments.forEach(attachment => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
      return [];
    });
  }, []);

  const resetConversationScopedComposerState = useCallback(() => {
    closeAttachModal();
    setMessage('');
    setEditingMessageId(null);
    inlineOverflowThresholdRef.current = null;
    setIsSendSuccessGlowVisible(false);
    clearPendingComposerAttachments();
  }, [clearPendingComposerAttachments, closeAttachModal]);

  const closeComposerImagePreview = useCallback(() => {
    setIsComposerImageExpandedVisible(false);
    if (composerImagePreviewCloseTimerRef.current) {
      window.clearTimeout(composerImagePreviewCloseTimerRef.current);
      composerImagePreviewCloseTimerRef.current = null;
    }
    composerImagePreviewCloseTimerRef.current = window.setTimeout(() => {
      setIsComposerImageExpanded(false);
      setComposerImagePreviewAttachmentId(null);
      composerImagePreviewCloseTimerRef.current = null;
    }, COMPOSER_IMAGE_PREVIEW_EXIT_DURATION);
  }, []);

  const openComposerImagePreview = useCallback(
    (attachmentId: string) => {
      const targetAttachment = pendingComposerAttachments.find(
        attachment =>
          attachment.id === attachmentId && attachment.fileKind === 'image'
      );
      if (!targetAttachment) return;

      closeAttachModal();
      closeMessageMenu();
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }
      setComposerImagePreviewAttachmentId(attachmentId);
      setIsComposerImageExpanded(true);
      window.requestAnimationFrame(() => {
        setIsComposerImageExpandedVisible(true);
      });
    },
    [closeAttachModal, closeMessageMenu, pendingComposerAttachments]
  );

  const queueComposerImage = useCallback(
    (file: File, replaceAttachmentId?: string) => {
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return false;
      }

      if (editingMessageId) {
        toast.error('Selesaikan edit pesan terlebih dahulu', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return false;
      }

      const mimeSubtype = file.type.split('/')[1];
      const extensionFromName = file.name.split('.').pop();
      const fileTypeLabel = (
        mimeSubtype ||
        extensionFromName ||
        'image'
      ).toUpperCase();
      const nextAttachment: PendingComposerAttachment = {
        id: `pending_image_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        fileName: file.name || 'Gambar',
        fileTypeLabel,
        fileKind: 'image',
        mimeType: file.type,
        pdfCoverUrl: null,
      };
      let exceededAttachmentLimit = false;

      setPendingComposerAttachments(previousAttachments => {
        if (replaceAttachmentId) {
          const replaceIndex = previousAttachments.findIndex(
            attachment =>
              attachment.id === replaceAttachmentId &&
              attachment.fileKind === 'image'
          );
          if (replaceIndex !== -1) {
            const targetAttachment = previousAttachments[replaceIndex];
            if (targetAttachment.previewUrl) {
              URL.revokeObjectURL(targetAttachment.previewUrl);
            }
            const nextAttachments = [...previousAttachments];
            nextAttachments[replaceIndex] = nextAttachment;
            return nextAttachments;
          }
        }

        if (previousAttachments.length >= MAX_PENDING_COMPOSER_ATTACHMENTS) {
          exceededAttachmentLimit = true;
          return previousAttachments;
        }

        return [...previousAttachments, nextAttachment];
      });

      if (exceededAttachmentLimit) {
        if (nextAttachment.previewUrl) {
          URL.revokeObjectURL(nextAttachment.previewUrl);
        }
        toast.error(
          `Maksimal ${MAX_PENDING_COMPOSER_ATTACHMENTS} lampiran dalam satu kirim`,
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        return false;
      }

      requestAnimationFrame(() => {
        const textarea = messageInputRef.current;
        if (!textarea) return;

        textarea.focus();
        const cursorPosition = textarea.value.length;
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      });

      return true;
    },
    [editingMessageId, messageInputRef]
  );

  const queueComposerFile = useCallback(
    (
      file: File,
      fileKind: ComposerPendingFileKind,
      replaceAttachmentId?: string
    ) => {
      const isAudioFile = file.type.startsWith('audio/');
      if (fileKind === 'audio' && !isAudioFile) {
        toast.error('File harus berupa audio', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return false;
      }

      if (editingMessageId) {
        toast.error('Selesaikan edit pesan terlebih dahulu', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return false;
      }

      const mimeSubtype = file.type.split('/')[1];
      const extensionFromName = file.name.split('.').pop();
      const fileTypeLabel = (
        mimeSubtype ||
        extensionFromName ||
        (fileKind === 'audio' ? 'audio' : 'document')
      ).toUpperCase();
      const nextAttachment: PendingComposerAttachment = {
        id: `pending_file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        fileName: file.name || (fileKind === 'audio' ? 'Audio' : 'Dokumen'),
        fileTypeLabel,
        fileKind,
        mimeType: file.type,
        previewUrl: null,
        pdfCoverUrl: null,
      };
      let exceededAttachmentLimit = false;

      setPendingComposerAttachments(previousAttachments => {
        if (replaceAttachmentId) {
          const replaceIndex = previousAttachments.findIndex(
            attachment =>
              attachment.id === replaceAttachmentId &&
              attachment.fileKind === fileKind
          );
          if (replaceIndex !== -1) {
            const targetAttachment = previousAttachments[replaceIndex];
            if (targetAttachment.previewUrl) {
              URL.revokeObjectURL(targetAttachment.previewUrl);
            }
            const nextAttachments = [...previousAttachments];
            nextAttachments[replaceIndex] = nextAttachment;
            return nextAttachments;
          }
        }

        if (previousAttachments.length >= MAX_PENDING_COMPOSER_ATTACHMENTS) {
          exceededAttachmentLimit = true;
          return previousAttachments;
        }
        return [...previousAttachments, nextAttachment];
      });

      if (exceededAttachmentLimit) {
        toast.error(
          `Maksimal ${MAX_PENDING_COMPOSER_ATTACHMENTS} lampiran dalam satu kirim`,
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        return false;
      }

      requestAnimationFrame(() => {
        const textarea = messageInputRef.current;
        if (!textarea) return;

        textarea.focus();
        const cursorPosition = textarea.value.length;
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      });

      return true;
    },
    [editingMessageId, messageInputRef]
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
      if (selectedFiles.length === 0) return;

      const replaceAttachmentId = replaceComposerImageAttachmentIdRef.current;
      replaceComposerImageAttachmentIdRef.current = null;
      replaceComposerDocumentAttachmentIdRef.current = null;

      for (const [fileIndex, selectedFile] of selectedFiles.entries()) {
        const didQueue = queueComposerImage(
          selectedFile,
          fileIndex === 0 ? (replaceAttachmentId ?? undefined) : undefined
        );
        if (!didQueue) break;
      }
    },
    [queueComposerImage]
  );

  const handleDocumentFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      event.target.value = '';
      if (selectedFiles.length === 0) return;

      const replaceAttachmentId =
        replaceComposerDocumentAttachmentIdRef.current;
      replaceComposerDocumentAttachmentIdRef.current = null;

      for (const [fileIndex, selectedFile] of selectedFiles.entries()) {
        const didQueue = queueComposerFile(
          selectedFile,
          'document',
          fileIndex === 0 ? (replaceAttachmentId ?? undefined) : undefined
        );
        if (!didQueue) break;
      }
    },
    [queueComposerFile]
  );

  const handleAudioFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      event.target.value = '';
      if (selectedFiles.length === 0) return;
      replaceComposerDocumentAttachmentIdRef.current = null;
      for (const selectedFile of selectedFiles) {
        const didQueue = queueComposerFile(selectedFile, 'audio');
        if (!didQueue) break;
      }
    },
    [queueComposerFile]
  );

  const handleComposerPaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const imageItem = Array.from(event.clipboardData.items).find(item =>
        item.type.startsWith('image/')
      );
      if (!imageItem) return;

      const imageFile = imageItem.getAsFile();
      if (!imageFile) return;

      event.preventDefault();
      closeAttachModal();
      closeMessageMenu();
      queueComposerImage(imageFile);
    },
    [closeAttachModal, closeMessageMenu, queueComposerImage]
  );

  useEffect(() => {
    if (!isAttachModalOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Node)) return;
      if (eventTarget instanceof Element) {
        const profileLayer = eventTarget.closest(
          '[data-profile-trigger="true"], [data-profile-portal="true"]'
        );
        if (profileLayer) return;
      }

      if (attachModalRef.current?.contains(eventTarget)) return;
      if (attachButtonRef.current?.contains(eventTarget)) return;

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

  const resizeMessageInput = useCallback(
    (value: string) => {
      const textarea = messageInputRef.current;
      if (!textarea) return;

      if (messageInputHeightRafRef.current !== null) {
        cancelAnimationFrame(messageInputHeightRafRef.current);
        messageInputHeightRafRef.current = null;
      }

      const currentHeight =
        textarea.getBoundingClientRect().height || MESSAGE_INPUT_MIN_HEIGHT;
      textarea.style.height = 'auto';

      const hasValue = value.length > 0;
      const isOverflowingCurrentLayout =
        hasValue && textarea.scrollHeight > MESSAGE_INPUT_MIN_HEIGHT + 2;
      const currentThreshold = inlineOverflowThresholdRef.current;

      if (!hasValue) {
        inlineOverflowThresholdRef.current = null;
      } else if (
        composerLayoutMode === 'inline' &&
        isOverflowingCurrentLayout
      ) {
        if (currentThreshold === null || value.length < currentThreshold) {
          inlineOverflowThresholdRef.current = value.length;
        }
      } else if (currentThreshold !== null && value.length < currentThreshold) {
        inlineOverflowThresholdRef.current = null;
      }

      const contentHeight = hasValue
        ? textarea.scrollHeight
        : MESSAGE_INPUT_MIN_HEIGHT;
      const nextHeight = Math.min(
        Math.max(contentHeight, MESSAGE_INPUT_MIN_HEIGHT),
        MESSAGE_INPUT_MAX_HEIGHT
      );

      const isOverflowingMaxHeight = contentHeight > MESSAGE_INPUT_MAX_HEIGHT;
      textarea.style.overflowY = isOverflowingMaxHeight ? 'auto' : 'hidden';
      if (!isOverflowingMaxHeight) {
        textarea.scrollTop = 0;
      }

      const shouldAnimateHeight =
        Math.abs(nextHeight - currentHeight) > 0.5 &&
        messageInputHeight !== nextHeight;
      if (shouldAnimateHeight) {
        textarea.style.height = `${currentHeight}px`;
        messageInputHeightRafRef.current = requestAnimationFrame(() => {
          const currentTextarea = messageInputRef.current;
          if (currentTextarea) {
            currentTextarea.style.height = `${nextHeight}px`;
          }
          messageInputHeightRafRef.current = null;
        });
      } else {
        textarea.style.height = `${nextHeight}px`;
      }

      setMessageInputHeight(previousHeight =>
        previousHeight === nextHeight ? previousHeight : nextHeight
      );
    },
    [composerLayoutMode, messageInputHeight, messageInputRef]
  );

  useLayoutEffect(() => {
    if (!isOpen) return;
    resizeMessageInput(message);
  }, [isOpen, message, resizeMessageInput]);

  useEffect(() => {
    resetConversationScopedComposerState();
  }, [currentChannelId, resetConversationScopedComposerState]);

  useEffect(() => {
    return () => {
      if (messageInputHeightRafRef.current !== null) {
        cancelAnimationFrame(messageInputHeightRafRef.current);
        messageInputHeightRafRef.current = null;
      }
    };
  }, []);

  useLayoutEffect(() => {
    const nextMode = isTargetMultiline ? 'multiline' : 'inline';
    setComposerLayoutMode(previousMode =>
      previousMode === nextMode ? previousMode : nextMode
    );
  }, [isTargetMultiline]);

  const actions = useChatComposerActions({
    user,
    targetUser,
    currentChannelId,
    messages,
    setMessages,
    message,
    setMessage,
    editingMessageId,
    setEditingMessageId,
    pendingComposerAttachments,
    clearPendingComposerAttachments,
    closeMessageMenu,
    focusMessageComposer,
    scheduleScrollMessagesToBottom,
    triggerSendSuccessGlow,
    broadcastNewMessage,
    broadcastUpdatedMessage,
    broadcastDeletedMessage,
    pendingImagePreviewUrlsRef,
  });

  return {
    message,
    setMessage,
    editingMessageId,
    messageInputHeight,
    isMessageInputMultiline,
    isSendSuccessGlowVisible,
    isAttachModalOpen,
    pendingComposerAttachments,
    previewComposerImageAttachment,
    isComposerImageExpanded,
    isComposerImageExpandedVisible,
    editingMessagePreview,
    composerContextualOffset,
    attachButtonRef,
    attachModalRef,
    imageInputRef,
    documentInputRef,
    audioInputRef,
    closeAttachModal,
    handleAttachButtonClick,
    handleAttachImageClick,
    handleAttachDocumentClick,
    handleAttachAudioClick,
    handleImageFileChange,
    handleDocumentFileChange,
    handleAudioFileChange,
    handleComposerPaste,
    openComposerImagePreview,
    closeComposerImagePreview,
    removePendingComposerAttachment,
    queueComposerImage,
    ...actions,
  };
};
