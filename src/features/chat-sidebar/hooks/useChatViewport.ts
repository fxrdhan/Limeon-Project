import {
  useCallback,
  useEffect,
  type MutableRefObject,
  type RefObject,
} from 'react';
import type { VisibleBounds } from '../utils/viewport-visibility';
import { useComposerContainerHeight } from './useComposerContainerHeight';
import { useChatViewportFocus } from './useChatViewportFocus';
import { useChatViewportReadReceipts } from './useChatViewportReadReceipts';
import { useChatViewportMenu } from './useChatViewportMenu';
import { useChatViewportScroll } from './useChatViewportScroll';

interface UseChatViewportProps {
  isOpen: boolean;
  currentChannelId: string | null;
  messages: Array<{
    id: string;
    sender_id: string;
    receiver_id: string | null;
    is_read: boolean;
  }>;
  userId?: string;
  targetUserId?: string;
  messagesCount: number;
  loading: boolean;
  messageInputHeight: number;
  composerContextualOffset: number;
  isMessageInputMultiline: boolean;
  pendingComposerAttachmentsCount: number;
  normalizedMessageSearchQuery: string;
  isMessageSearchMode: boolean;
  activeSearchMessageId: string | null;
  searchNavigationTick: number;
  editingMessageId: string | null;
  focusMessageComposer: () => void;
  markMessageIdsAsRead: (messageIds: string[]) => Promise<void>;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesContentRef?: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  composerContainerRef: RefObject<HTMLDivElement | null>;
  chatHeaderContainerRef: RefObject<HTMLDivElement | null>;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
}

export const useChatViewport = ({
  isOpen,
  currentChannelId,
  messages,
  userId,
  targetUserId,
  messagesCount,
  loading,
  messageInputHeight,
  composerContextualOffset,
  isMessageInputMultiline,
  pendingComposerAttachmentsCount,
  normalizedMessageSearchQuery,
  isMessageSearchMode,
  activeSearchMessageId,
  searchNavigationTick,
  editingMessageId,
  focusMessageComposer,
  markMessageIdsAsRead,
  messagesContainerRef,
  messagesContentRef,
  messagesEndRef,
  composerContainerRef,
  chatHeaderContainerRef,
  messageBubbleRefs,
}: UseChatViewportProps) => {
  const getVisibleMessagesBounds = useCallback((): VisibleBounds | null => {
    const containerRect =
      messagesContainerRef.current?.getBoundingClientRect() ?? null;
    if (!containerRect) return null;

    const composerTop =
      composerContainerRef.current?.getBoundingClientRect().top;
    const hasValidComposerTop =
      typeof composerTop === 'number' &&
      Number.isFinite(composerTop) &&
      composerTop > containerRect.top &&
      composerTop < containerRect.bottom;
    const visibleBottom = hasValidComposerTop
      ? composerTop
      : containerRect.bottom;

    return {
      containerRect,
      visibleBottom,
    };
  }, [composerContainerRef, messagesContainerRef]);

  const menu = useChatViewportMenu({
    getVisibleMessagesBounds,
    messagesContainerRef,
  });

  const focus = useChatViewportFocus({
    getVisibleMessagesBounds,
    closeMessageMenu: menu.closeMessageMenu,
    chatHeaderContainerRef,
    messageBubbleRefs,
    messagesContainerRef,
    editingMessageId,
  });
  const { focusEditingTargetMessage, focusSearchTargetMessage } = focus;

  const { composerContainerHeight } = useComposerContainerHeight({
    composerContainerRef,
    composerContextualOffset,
    isMessageInputMultiline,
    messageInputHeight,
    pendingComposerAttachmentsCount,
  });

  const { scheduleVisibleUnreadReadReceipts } = useChatViewportReadReceipts({
    messages,
    userId,
    targetUserId,
    markMessageIdsAsRead,
    getVisibleMessagesBounds,
    chatHeaderContainerRef,
    messageBubbleRefs,
  });

  const scroll = useChatViewportScroll({
    isOpen,
    currentChannelId,
    messages,
    messagesCount,
    loading,
    messageInputHeight,
    composerContextualOffset,
    composerContainerHeight,
    getVisibleMessagesBounds,
    messagesContainerRef,
    messagesContentRef,
    messagesEndRef,
    scheduleVisibleUnreadReadReceipts,
  });

  useEffect(() => {
    if (
      !isOpen ||
      !isMessageSearchMode ||
      !normalizedMessageSearchQuery ||
      !activeSearchMessageId
    ) {
      return;
    }

    const rafId = requestAnimationFrame(() => {
      focusSearchTargetMessage(activeSearchMessageId);
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [
    activeSearchMessageId,
    focusSearchTargetMessage,
    isMessageSearchMode,
    isOpen,
    normalizedMessageSearchQuery,
    searchNavigationTick,
  ]);

  const handleChatPortalBackgroundClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      if (
        target.closest(
          'button, [role="button"], a, input, textarea, select, [contenteditable="true"]'
        )
      ) {
        return;
      }

      focusMessageComposer();
    },
    [focusMessageComposer]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    scheduleVisibleUnreadReadReceipts();
  }, [isOpen, messages, scheduleVisibleUnreadReadReceipts]);

  return {
    isAtBottom: scroll.isAtBottom,
    isAtTop: scroll.isAtTop,
    hasNewMessages: scroll.hasNewMessages,
    isInitialOpenPinPending: scroll.isInitialOpenPinPending,
    composerContainerHeight,
    openMenuMessageId: menu.openMenuMessageId,
    menuPlacement: menu.menuPlacement,
    menuSideAnchor: menu.menuSideAnchor,
    menuVerticalAnchor: menu.menuVerticalAnchor,
    shouldAnimateMenuOpen: menu.shouldAnimateMenuOpen,
    menuTransitionSourceId: menu.menuTransitionSourceId,
    menuOffsetX: menu.menuOffsetX,
    flashingMessageId: focus.flashingMessageId,
    isFlashHighlightVisible: focus.isFlashHighlightVisible,
    getVisibleMessagesBounds,
    closeMessageMenu: menu.closeMessageMenu,
    toggleMessageMenu: menu.toggleMessageMenu,
    scheduleScrollMessagesToBottom: scroll.scheduleScrollMessagesToBottom,
    focusEditingTargetMessage,
    focusReplyTargetMessage: focus.focusReplyTargetMessage,
    handleChatPortalBackgroundClick,
    scrollToBottom: scroll.scrollToBottom,
  };
};
