import type { RefObject } from 'react';
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
import { useChatComposerAttachments } from './useChatComposerAttachments';
import type { ChatMessage } from '../data/chatSidebarGateway';

interface UseChatComposerProps {
  isOpen: boolean;
  currentChannelId: string | null;
  messages: ChatMessage[];
  closeMessageMenu: () => void;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
}

export const useChatComposer = ({
  isOpen,
  currentChannelId,
  messages,
  closeMessageMenu,
  messageInputRef,
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

  const messageInputHeightRafRef = useRef<number | null>(null);
  const sendSuccessGlowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inlineOverflowThresholdRef = useRef<number | null>(null);

  const attachments = useChatComposerAttachments({
    editingMessageId,
    closeMessageMenu,
    messageInputRef,
  });
  const {
    isAttachModalOpen,
    pendingComposerAttachments,
    previewComposerImageAttachment,
    isComposerImageExpanded,
    isComposerImageExpandedVisible,
    attachButtonRef,
    attachModalRef,
    imageInputRef,
    documentInputRef,
    audioInputRef,
    pendingImagePreviewUrlsRef,
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
    clearPendingComposerAttachments,
    restorePendingComposerAttachments,
    queueComposerImage,
  } = attachments;

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
  const composerContextualOffset =
    (editingMessagePreview ? EDITING_COMPOSER_OFFSET : 0) +
    (pendingComposerAttachments.length > 0 ? COMPOSER_IMAGE_PREVIEW_OFFSET : 0);

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

  const resetConversationScopedComposerState = useCallback(() => {
    closeAttachModal();
    setMessage('');
    setEditingMessageId(null);
    inlineOverflowThresholdRef.current = null;
    setIsSendSuccessGlowVisible(false);
    clearPendingComposerAttachments();
  }, [clearPendingComposerAttachments, closeAttachModal]);

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

  useEffect(() => {
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

  useLayoutEffect(() => {
    const nextMode = isTargetMultiline ? 'multiline' : 'inline';
    setComposerLayoutMode(previousMode =>
      previousMode === nextMode ? previousMode : nextMode
    );
  }, [isTargetMultiline]);

  return {
    message,
    setMessage,
    editingMessageId,
    setEditingMessageId,
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
    pendingImagePreviewUrlsRef,
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
    clearPendingComposerAttachments,
    restorePendingComposerAttachments,
    queueComposerImage,
    triggerSendSuccessGlow,
  };
};
