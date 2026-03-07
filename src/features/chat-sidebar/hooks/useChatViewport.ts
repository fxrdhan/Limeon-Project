import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import { MESSAGE_BOTTOM_GAP } from '../constants';
import { useChatViewportFocus } from './useChatViewportFocus';
import { useChatViewportMenu } from './useChatViewportMenu';

type VisibleBounds = {
  containerRect: DOMRect;
  visibleBottom: number;
};

interface UseChatViewportProps {
  isOpen: boolean;
  currentChannelId: string | null;
  messages: Array<{
    id: string;
    sender_id: string;
    receiver_id: string;
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
  messagesEndRef,
  composerContainerRef,
  chatHeaderContainerRef,
  messageBubbleRefs,
}: UseChatViewportProps) => {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [composerContainerHeight, setComposerContainerHeight] = useState(0);

  const atTopVisibilityRef = useRef(true);
  const shouldPinToBottomOnOpenRef = useRef(false);
  const scrollToBottomAnimationFrameRef = useRef<number | null>(null);

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

  const scrollMessagesToBottom = useCallback(
    (behavior: ScrollBehavior) => {
      const container = messagesContainerRef.current;
      const endMarker = messagesEndRef.current;
      const bounds = getVisibleMessagesBounds();
      if (!container || !endMarker || !bounds) return;

      const hiddenBottom = Math.max(
        0,
        bounds.containerRect.bottom - bounds.visibleBottom
      );
      const visibleHeight = container.clientHeight - hiddenBottom;
      if (visibleHeight <= 0) return;

      const endTopInContent =
        endMarker.getBoundingClientRect().top -
        bounds.containerRect.top +
        container.scrollTop;
      const targetScrollTop =
        endTopInContent - Math.max(visibleHeight - MESSAGE_BOTTOM_GAP, 0);
      const maxScrollTop = Math.max(
        0,
        container.scrollHeight - container.clientHeight
      );

      container.scrollTo({
        top: Math.min(Math.max(targetScrollTop, 0), maxScrollTop),
        behavior,
      });
    },
    [getVisibleMessagesBounds, messagesContainerRef, messagesEndRef]
  );

  const scheduleScrollMessagesToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollMessagesToBottom('auto');
    });
  }, [scrollMessagesToBottom]);

  const cancelScrollToBottomAnimation = useCallback(() => {
    if (scrollToBottomAnimationFrameRef.current === null) return;
    cancelAnimationFrame(scrollToBottomAnimationFrameRef.current);
    scrollToBottomAnimationFrameRef.current = null;
  }, []);

  const animateScrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    const endMarker = messagesEndRef.current;
    const bounds = getVisibleMessagesBounds();
    if (!container || !endMarker || !bounds) return;

    const hiddenBottom = Math.max(
      0,
      bounds.containerRect.bottom - bounds.visibleBottom
    );
    const visibleHeight = container.clientHeight - hiddenBottom;
    if (visibleHeight <= 0) return;

    const endTopInContent =
      endMarker.getBoundingClientRect().top -
      bounds.containerRect.top +
      container.scrollTop;
    const rawTargetScrollTop =
      endTopInContent - Math.max(visibleHeight - MESSAGE_BOTTOM_GAP, 0);
    const maxScrollTop = Math.max(
      0,
      container.scrollHeight - container.clientHeight
    );
    const targetScrollTop = Math.min(
      Math.max(rawTargetScrollTop, 0),
      maxScrollTop
    );
    const startScrollTop = container.scrollTop;
    const distance = targetScrollTop - startScrollTop;

    if (Math.abs(distance) < 2) {
      container.scrollTop = targetScrollTop;
      return;
    }

    cancelScrollToBottomAnimation();

    const duration = Math.min(700, Math.max(260, Math.abs(distance) * 0.22));
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const linearProgress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - (1 - linearProgress) ** 4;

      container.scrollTop = startScrollTop + distance * easedProgress;

      if (linearProgress < 1) {
        scrollToBottomAnimationFrameRef.current = requestAnimationFrame(step);
        return;
      }

      container.scrollTop = targetScrollTop;
      scrollToBottomAnimationFrameRef.current = null;
    };

    scrollToBottomAnimationFrameRef.current = requestAnimationFrame(step);
  }, [
    cancelScrollToBottomAnimation,
    getVisibleMessagesBounds,
    messagesContainerRef,
    messagesEndRef,
  ]);

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

  const checkIfAtBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;
      return Math.abs(scrollHeight - scrollTop - clientHeight) <= 100;
    }

    return true;
  }, [messagesContainerRef]);

  const checkIfAtTop = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop } = messagesContainerRef.current;
      if (atTopVisibilityRef.current) {
        return scrollTop <= 14;
      }
      return scrollTop <= 2;
    }

    return true;
  }, [messagesContainerRef]);

  const handleScroll = useCallback(() => {
    requestAnimationFrame(() => {
      const atBottom = checkIfAtBottom();
      const atTop = checkIfAtTop();
      atTopVisibilityRef.current = atTop;
      setIsAtBottom(atBottom);
      setIsAtTop(atTop);
      void (async () => {
        if (!userId || !targetUserId) return;

        const bounds = getVisibleMessagesBounds();
        if (!bounds) return;

        const visibleUnreadIncomingMessageIds = messages
          .filter(
            messageItem =>
              messageItem.sender_id === targetUserId &&
              messageItem.receiver_id === userId &&
              !messageItem.is_read
          )
          .map(messageItem => {
            const bubbleElement = messageBubbleRefs.current.get(messageItem.id);
            if (!bubbleElement) return null;

            const bubbleRect = bubbleElement.getBoundingClientRect();
            const isVisible =
              bubbleRect.bottom > bounds.containerRect.top &&
              bubbleRect.top < bounds.visibleBottom;
            return isVisible ? messageItem.id : null;
          })
          .filter((messageId): messageId is string => Boolean(messageId));

        if (visibleUnreadIncomingMessageIds.length === 0) return;
        await markMessageIdsAsRead(visibleUnreadIncomingMessageIds);
      })();
      if (atBottom) {
        setHasNewMessages(false);
      }
    });
  }, [
    checkIfAtBottom,
    checkIfAtTop,
    getVisibleMessagesBounds,
    markMessageIdsAsRead,
    messageBubbleRefs,
    messages,
    targetUserId,
    userId,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    const rafId = requestAnimationFrame(() => {
      handleScroll();
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [
    composerContextualOffset,
    handleScroll,
    isOpen,
    messageInputHeight,
    messagesCount,
  ]);

  useEffect(() => {
    if (
      shouldPinToBottomOnOpenRef.current ||
      !messagesCount ||
      !currentChannelId
    ) {
      return;
    }

    if (isAtBottom) {
      scheduleScrollMessagesToBottom();
      setHasNewMessages(false);
    } else {
      setHasNewMessages(true);
    }
  }, [
    currentChannelId,
    isAtBottom,
    messagesCount,
    scheduleScrollMessagesToBottom,
  ]);

  useLayoutEffect(() => {
    if (!isOpen || !shouldPinToBottomOnOpenRef.current) return;

    scrollMessagesToBottom('auto');
    setIsAtBottom(true);
    const atTop = checkIfAtTop();
    atTopVisibilityRef.current = atTop;
    setIsAtTop(atTop);
    setHasNewMessages(false);

    if (!loading) {
      shouldPinToBottomOnOpenRef.current = false;
    }
  }, [
    checkIfAtTop,
    isOpen,
    loading,
    messageInputHeight,
    messagesCount,
    scrollMessagesToBottom,
  ]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll, messagesContainerRef]);

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
    if (!isOpen || !currentChannelId) return;

    shouldPinToBottomOnOpenRef.current = true;
    setIsAtBottom(true);
    setHasNewMessages(false);
  }, [currentChannelId, isOpen]);

  useEffect(
    () => () => {
      cancelScrollToBottomAnimation();
    },
    [cancelScrollToBottomAnimation]
  );

  useLayoutEffect(() => {
    const composerContainer = composerContainerRef.current;
    if (!composerContainer) return;

    const updateComposerContainerHeight = () => {
      setComposerContainerHeight(composerContainer.offsetHeight);
    };

    updateComposerContainerHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateComposerContainerHeight();
    });
    resizeObserver.observe(composerContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    composerContainerRef,
    composerContextualOffset,
    isMessageInputMultiline,
    messageInputHeight,
    pendingComposerAttachmentsCount,
  ]);

  const scrollToBottom = useCallback(() => {
    animateScrollToBottom();
    setHasNewMessages(false);
    setIsAtBottom(true);
  }, [animateScrollToBottom]);

  return {
    isAtBottom,
    isAtTop,
    hasNewMessages,
    composerContainerHeight,
    openMenuMessageId: menu.openMenuMessageId,
    menuPlacement: menu.menuPlacement,
    menuSideAnchor: menu.menuSideAnchor,
    shouldAnimateMenuOpen: menu.shouldAnimateMenuOpen,
    menuTransitionSourceId: menu.menuTransitionSourceId,
    menuOffsetX: menu.menuOffsetX,
    flashingMessageId: focus.flashingMessageId,
    isFlashHighlightVisible: focus.isFlashHighlightVisible,
    getVisibleMessagesBounds,
    closeMessageMenu: menu.closeMessageMenu,
    toggleMessageMenu: menu.toggleMessageMenu,
    scheduleScrollMessagesToBottom,
    focusEditingTargetMessage,
    handleChatPortalBackgroundClick,
    scrollToBottom,
  };
};
