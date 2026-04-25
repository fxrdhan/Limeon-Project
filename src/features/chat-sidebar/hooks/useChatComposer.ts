import type { RefObject, SetStateAction } from 'react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  COMPOSER_IMAGE_PREVIEW_OFFSET,
  EDITING_COMPOSER_OFFSET,
  MESSAGE_INPUT_MAX_HEIGHT,
  MESSAGE_INPUT_MIN_HEIGHT,
  SEND_SUCCESS_GLOW_DURATION,
  SEND_SUCCESS_GLOW_RESET_BUFFER,
} from '../constants';
import {
  readPersistedComposerDraftMessage,
  writePersistedComposerDraftMessage,
} from '../utils/composer-draft-persistence';
import { getAttachmentFileName } from '../utils/attachment';
import { useChatComposerAttachments } from './useChatComposerAttachments';
import type { ChatMessage } from '../data/chatSidebarGateway';

interface UseChatComposerProps {
  isOpen: boolean;
  currentChannelId: string | null;
  messages: ChatMessage[];
  userId?: string;
  closeMessageMenu: () => void;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
}

export const useChatComposer = ({
  isOpen,
  currentChannelId,
  messages,
  userId,
  closeMessageMenu,
  messageInputRef,
}: UseChatComposerProps) => {
  const [message, setMessageState] = useState(() =>
    readPersistedComposerDraftMessage(currentChannelId, userId)
  );
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(
    null
  );
  const [messageInputHeight, setMessageInputHeight] = useState(
    MESSAGE_INPUT_MIN_HEIGHT
  );
  const [composerLayoutMode, setComposerLayoutMode] = useState<
    'inline' | 'multiline'
  >('inline');
  const [isSendSuccessGlowVisible, setIsSendSuccessGlowVisible] =
    useState(false);

  const messageInputHeightRafRef = useRef<number | null>(null);
  const sendSuccessGlowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inlineOverflowThresholdRef = useRef<number | null>(null);

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

  const setMessage = useCallback(
    (nextMessage: SetStateAction<string>) => {
      setMessageState(previousMessage => {
        const resolvedNextMessage =
          typeof nextMessage === 'function'
            ? nextMessage(previousMessage)
            : nextMessage;

        if (!editingMessageId && currentChannelId) {
          writePersistedComposerDraftMessage(
            currentChannelId,
            resolvedNextMessage,
            userId
          );
        }

        return resolvedNextMessage;
      });
    },
    [currentChannelId, editingMessageId, userId]
  );

  const attachments = useChatComposerAttachments({
    currentChannelId,
    userId,
    editingMessageId,
    closeMessageMenu,
    messageInputRef,
    message,
    setMessage,
  });
  const {
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
  } = attachments;

  const isHoldingMultilineByInlineOverflow =
    inlineOverflowThresholdRef.current !== null &&
    message.length >= inlineOverflowThresholdRef.current;
  const isTargetMultiline =
    messageInputHeight > MESSAGE_INPUT_MIN_HEIGHT + 2 ||
    isHoldingMultilineByInlineOverflow;
  const isMessageInputMultiline = composerLayoutMode === 'multiline';
  const editingMessage =
    editingMessageId === null
      ? null
      : (messages.find(candidate => candidate.id === editingMessageId) ?? null);
  const replyingMessage =
    replyingMessageId === null
      ? null
      : (messages.find(candidate => candidate.id === replyingMessageId) ??
        null);
  const editingMessagePreview = editingMessage?.message ?? null;
  const isEditingMessageFromCurrentUser = editingMessage
    ? editingMessage.sender_id === userId
    : false;
  const editingMessageAuthorLabel = editingMessage
    ? isEditingMessageFromCurrentUser
      ? 'Anda'
      : editingMessage.sender_name?.trim() || 'Pengguna'
    : null;
  const replyingMessagePreview =
    replyingMessage === null
      ? null
      : replyingMessage.message_type === 'text'
        ? replyingMessage.message.replace(/\s+/g, ' ').trim() || 'Pesan'
        : getAttachmentFileName(replyingMessage);
  const isReplyingMessageFromCurrentUser = replyingMessage
    ? replyingMessage.sender_id === userId
    : false;
  const replyingMessageAuthorLabel = replyingMessage
    ? isReplyingMessageFromCurrentUser
      ? 'Anda'
      : replyingMessage.sender_name?.trim() || 'Pengguna'
    : null;
  const hasComposerContextBanner =
    editingMessagePreview !== null || replyingMessagePreview !== null;
  const composerContextualOffset =
    (hasComposerContextBanner ? EDITING_COMPOSER_OFFSET : 0) +
    (pendingComposerAttachments.length + loadingComposerAttachments.length > 0
      ? COMPOSER_IMAGE_PREVIEW_OFFSET
      : 0);

  const resetConversationScopedComposerState = useCallback(() => {
    closeAttachModal();
    setMessageState(
      readPersistedComposerDraftMessage(currentChannelId, userId)
    );
    setEditingMessageId(null);
    setReplyingMessageId(null);
    inlineOverflowThresholdRef.current = null;
    setIsSendSuccessGlowVisible(false);
  }, [closeAttachModal, currentChannelId, userId]);

  const handleMessageChange = useCallback(
    (nextMessage: string) => {
      if (attachmentPastePromptUrl) {
        dismissAttachmentPastePrompt();
      }

      setMessage(nextMessage);
    },
    [attachmentPastePromptUrl, dismissAttachmentPastePrompt, setMessage]
  );

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
        if (nextHeight < currentHeight) {
          void textarea.offsetHeight;
          textarea.style.height = `${nextHeight}px`;
        } else {
          messageInputHeightRafRef.current = requestAnimationFrame(() => {
            const currentTextarea = messageInputRef.current;
            if (currentTextarea) {
              currentTextarea.style.height = `${nextHeight}px`;
            }
            messageInputHeightRafRef.current = null;
          });
        }
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

  useLayoutEffect(() => {
    resetConversationScopedComposerState();
  }, [currentChannelId, resetConversationScopedComposerState]);

  useEffect(() => {
    return () => {
      if (messageInputHeightRafRef.current !== null) {
        cancelAnimationFrame(messageInputHeightRafRef.current);
        messageInputHeightRafRef.current = null;
      }

      if (sendSuccessGlowTimeoutRef.current) {
        clearTimeout(sendSuccessGlowTimeoutRef.current);
        sendSuccessGlowTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (message.length > 0) return;
    clearAttachmentPasteState();
  }, [clearAttachmentPasteState, message]);

  useLayoutEffect(() => {
    const nextMode = isTargetMultiline ? 'multiline' : 'inline';
    setComposerLayoutMode(previousMode =>
      previousMode === nextMode ? previousMode : nextMode
    );
  }, [isTargetMultiline]);

  return {
    linkPrompt: attachments.linkPrompt,
    message,
    setMessage,
    editingMessageId,
    setEditingMessageId,
    replyingMessageId,
    setReplyingMessageId,
    messageInputHeight,
    isMessageInputMultiline,
    isSendSuccessGlowVisible,
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
    editingMessagePreview,
    editingMessageAuthorLabel,
    isEditingMessageFromCurrentUser,
    replyingMessagePreview,
    replyingMessageAuthorLabel,
    isReplyingMessageFromCurrentUser,
    composerContextualOffset,
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
    handleMessageChange,
    triggerSendSuccessGlow,
  };
};
