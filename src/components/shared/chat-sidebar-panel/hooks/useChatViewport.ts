import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import {
  EDIT_TARGET_FLASH_PHASE_DURATION,
  EDIT_TARGET_FOCUS_PADDING,
  MENU_GAP,
  MENU_HEIGHT,
  MENU_WIDTH,
  MESSAGE_BOTTOM_GAP,
} from '../constants';
import type { MenuPlacement, MenuSideAnchor } from '../types';

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
  const [openMenuMessageId, setOpenMenuMessageId] = useState<string | null>(
    null
  );
  const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>('up');
  const [menuSideAnchor, setMenuSideAnchor] =
    useState<MenuSideAnchor>('middle');
  const [shouldAnimateMenuOpen, setShouldAnimateMenuOpen] = useState(true);
  const [menuTransitionSourceId, setMenuTransitionSourceId] = useState<
    string | null
  >(null);
  const [menuOffsetX, setMenuOffsetX] = useState(0);
  const [flashingMessageId, setFlashingMessageId] = useState<string | null>(
    null
  );
  const [isFlashHighlightVisible, setIsFlashHighlightVisible] = useState(false);

  const atTopVisibilityRef = useRef(true);
  const shouldPinToBottomOnOpenRef = useRef(false);
  const scrollToBottomAnimationFrameRef = useRef<number | null>(null);
  const flashMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSearchFlashRafRef = useRef<number | null>(null);
  const menuTransitionSourceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const getMenuLayout = useCallback(
    (
      anchorRect: DOMRect,
      preferredSide: 'left' | 'right'
    ): {
      placement: MenuPlacement;
      sideAnchor: MenuSideAnchor;
    } => {
      const bounds = getVisibleMessagesBounds();
      if (!bounds) {
        return { placement: 'up', sideAnchor: 'middle' };
      }

      const { containerRect, visibleBottom } = bounds;
      const spaceLeft = anchorRect.left - containerRect.left;
      const spaceRight = containerRect.right - anchorRect.right;
      const spaceAbove = anchorRect.top - containerRect.top;
      const spaceBelow = visibleBottom - anchorRect.bottom;
      const hasTopAnchoredSideRoom =
        spaceBelow >= MENU_HEIGHT - anchorRect.height + MENU_GAP;
      const hasBottomAnchoredSideRoom =
        spaceAbove >= MENU_HEIGHT - anchorRect.height + MENU_GAP;
      const hasCenteredSideRoom =
        spaceAbove >= MENU_HEIGHT / 2 && spaceBelow >= MENU_HEIGHT / 2;
      const hasSideVerticalRoom =
        hasTopAnchoredSideRoom ||
        hasBottomAnchoredSideRoom ||
        hasCenteredSideRoom;
      const sideAnchor: MenuSideAnchor = hasCenteredSideRoom
        ? 'middle'
        : hasBottomAnchoredSideRoom
          ? 'bottom'
          : hasTopAnchoredSideRoom
            ? 'top'
            : spaceAbove >= spaceBelow
              ? 'bottom'
              : 'top';
      const canFitLeft =
        spaceLeft >= MENU_WIDTH + MENU_GAP && hasSideVerticalRoom;
      const canFitRight =
        spaceRight >= MENU_WIDTH + MENU_GAP && hasSideVerticalRoom;

      if (preferredSide === 'left' && canFitLeft) {
        return { placement: 'left', sideAnchor };
      }
      if (preferredSide === 'right' && canFitRight) {
        return { placement: 'right', sideAnchor };
      }
      if (canFitLeft) {
        return { placement: 'left', sideAnchor };
      }
      if (canFitRight) {
        return { placement: 'right', sideAnchor };
      }

      if (spaceBelow >= MENU_HEIGHT + MENU_GAP) {
        return { placement: 'up', sideAnchor };
      }
      if (spaceAbove >= MENU_HEIGHT + MENU_GAP) {
        return { placement: 'down', sideAnchor };
      }

      return {
        placement: spaceBelow >= spaceAbove ? 'up' : 'down',
        sideAnchor,
      };
    },
    [getVisibleMessagesBounds]
  );

  const closeMessageMenu = useCallback(() => {
    if (menuTransitionSourceTimeoutRef.current) {
      clearTimeout(menuTransitionSourceTimeoutRef.current);
      menuTransitionSourceTimeoutRef.current = null;
    }
    setOpenMenuMessageId(null);
    setMenuTransitionSourceId(null);
    setMenuOffsetX(0);
    setShouldAnimateMenuOpen(true);
  }, []);

  const toggleMessageMenu = useCallback(
    (
      anchor: HTMLElement,
      messageId: string,
      preferredSide: 'left' | 'right'
    ) => {
      if (openMenuMessageId === messageId) {
        closeMessageMenu();
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const nextMenuLayout = getMenuLayout(anchorRect, preferredSide);
      const isSwitchingMenuMessage =
        openMenuMessageId !== null && openMenuMessageId !== messageId;

      if (menuTransitionSourceTimeoutRef.current) {
        clearTimeout(menuTransitionSourceTimeoutRef.current);
        menuTransitionSourceTimeoutRef.current = null;
      }

      setMenuOffsetX(0);
      setMenuPlacement(nextMenuLayout.placement);
      setMenuSideAnchor(nextMenuLayout.sideAnchor);

      if (isSwitchingMenuMessage) {
        setMenuTransitionSourceId(openMenuMessageId);
        menuTransitionSourceTimeoutRef.current = setTimeout(() => {
          setMenuTransitionSourceId(null);
          menuTransitionSourceTimeoutRef.current = null;
        }, 220);
      } else {
        setMenuTransitionSourceId(null);
      }

      setShouldAnimateMenuOpen(!isSwitchingMenuMessage);
      setOpenMenuMessageId(messageId);
    },
    [closeMessageMenu, getMenuLayout, openMenuMessageId]
  );

  const ensureMenuFullyVisible = useCallback(
    (messageId: string) => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const menuElement = container.querySelector<HTMLElement>(
        `[data-chat-menu-id="${messageId}"]`
      );

      if (!menuElement) return;

      const bounds = getVisibleMessagesBounds();
      if (!bounds) return;

      const { containerRect, visibleBottom } = bounds;
      const menuRect = menuElement.getBoundingClientRect();

      let scrollOffset = 0;
      if (menuRect.top < containerRect.top) {
        scrollOffset = menuRect.top - containerRect.top - MENU_GAP;
      } else if (menuRect.bottom > visibleBottom) {
        scrollOffset = menuRect.bottom - visibleBottom + MENU_GAP;
      }

      if (scrollOffset !== 0) {
        container.scrollTo({
          top: container.scrollTop + scrollOffset,
          behavior: 'auto',
        });
      }

      const minMenuLeft = containerRect.left + MENU_GAP;
      const maxMenuRight = containerRect.right - MENU_GAP;
      const shiftMin = minMenuLeft - menuRect.left;
      const shiftMax = maxMenuRight - menuRect.right;
      const nextOffsetX =
        shiftMin > shiftMax
          ? shiftMin
          : Math.min(Math.max(0, shiftMin), shiftMax);

      setMenuOffsetX(previousOffset =>
        Math.abs(previousOffset - nextOffsetX) < 0.5
          ? previousOffset
          : nextOffsetX
      );
    },
    [getVisibleMessagesBounds, messagesContainerRef]
  );

  useLayoutEffect(() => {
    if (!openMenuMessageId) return;

    ensureMenuFullyVisible(openMenuMessageId);
  }, [
    ensureMenuFullyVisible,
    menuPlacement,
    menuSideAnchor,
    openMenuMessageId,
  ]);

  const triggerMessageFlash = useCallback((messageId: string) => {
    if (flashMessageTimeoutRef.current) {
      clearTimeout(flashMessageTimeoutRef.current);
      flashMessageTimeoutRef.current = null;
    }

    setFlashingMessageId(messageId);
    setIsFlashHighlightVisible(true);

    flashMessageTimeoutRef.current = setTimeout(() => {
      setIsFlashHighlightVisible(false);
      setFlashingMessageId(currentId =>
        currentId === messageId ? null : currentId
      );
      flashMessageTimeoutRef.current = null;
    }, EDIT_TARGET_FLASH_PHASE_DURATION * 2);
  }, []);

  const clearPendingSearchFlash = useCallback(() => {
    if (pendingSearchFlashRafRef.current === null) return;
    cancelAnimationFrame(pendingSearchFlashRafRef.current);
    pendingSearchFlashRafRef.current = null;
  }, []);

  const triggerMessageFlashWhenScrollSettled = useCallback(
    (messageId: string) => {
      clearPendingSearchFlash();
      const waitStart = Date.now();
      const maxWaitMs = 900;
      const scrollSettleDelayMs = 24;
      let previousScrollTop: number | null = null;
      let lastScrollMovementAt = Date.now();

      const verifyVisibilityAndFlash = () => {
        const bubble = messageBubbleRefs.current.get(messageId);
        const container = messagesContainerRef.current;
        const bounds = getVisibleMessagesBounds();
        if (!bubble || !container || !bounds) {
          if (Date.now() - waitStart < maxWaitMs) {
            pendingSearchFlashRafRef.current = requestAnimationFrame(
              verifyVisibilityAndFlash
            );
          } else {
            pendingSearchFlashRafRef.current = null;
          }
          return;
        }

        const headerBottom =
          chatHeaderContainerRef.current?.getBoundingClientRect().bottom;
        const hasValidHeaderBottom =
          typeof headerBottom === 'number' &&
          Number.isFinite(headerBottom) &&
          headerBottom > bounds.containerRect.top &&
          headerBottom < bounds.containerRect.bottom;
        const minVisibleTop = hasValidHeaderBottom
          ? headerBottom + EDIT_TARGET_FOCUS_PADDING
          : bounds.containerRect.top + EDIT_TARGET_FOCUS_PADDING;
        const maxVisibleBottom =
          bounds.visibleBottom - EDIT_TARGET_FOCUS_PADDING;
        const bubbleRect = bubble.getBoundingClientRect();
        const isVisibleToUser =
          bubbleRect.bottom > minVisibleTop &&
          bubbleRect.top < maxVisibleBottom;

        const currentScrollTop = container.scrollTop;
        const scrollDelta =
          previousScrollTop === null
            ? 0
            : Math.abs(currentScrollTop - previousScrollTop);
        if (previousScrollTop === null || scrollDelta > 0.1) {
          lastScrollMovementAt = Date.now();
        }
        previousScrollTop = currentScrollTop;
        const isScrollSettled =
          Date.now() - lastScrollMovementAt >= scrollSettleDelayMs;

        if (isVisibleToUser && isScrollSettled) {
          pendingSearchFlashRafRef.current = null;
          triggerMessageFlash(messageId);
          return;
        }

        if (Date.now() - waitStart >= maxWaitMs) {
          pendingSearchFlashRafRef.current = null;
          triggerMessageFlash(messageId);
          return;
        }

        pendingSearchFlashRafRef.current = requestAnimationFrame(
          verifyVisibilityAndFlash
        );
      };

      pendingSearchFlashRafRef.current = requestAnimationFrame(
        verifyVisibilityAndFlash
      );
    },
    [
      chatHeaderContainerRef,
      clearPendingSearchFlash,
      getVisibleMessagesBounds,
      messageBubbleRefs,
      messagesContainerRef,
      triggerMessageFlash,
    ]
  );

  const focusSearchTargetMessage = useCallback(
    (messageId: string) => {
      const bubble = messageBubbleRefs.current.get(messageId);
      const container = messagesContainerRef.current;
      const bounds = getVisibleMessagesBounds();
      if (!bubble || !container || !bounds) return;

      closeMessageMenu();
      const headerBottom =
        chatHeaderContainerRef.current?.getBoundingClientRect().bottom;
      const hasValidHeaderBottom =
        typeof headerBottom === 'number' &&
        Number.isFinite(headerBottom) &&
        headerBottom > bounds.containerRect.top &&
        headerBottom < bounds.containerRect.bottom;
      const minVisibleTop = hasValidHeaderBottom
        ? headerBottom + EDIT_TARGET_FOCUS_PADDING
        : bounds.containerRect.top + EDIT_TARGET_FOCUS_PADDING;
      const maxVisibleBottom = bounds.visibleBottom - EDIT_TARGET_FOCUS_PADDING;
      const bubbleRect = bubble.getBoundingClientRect();
      const isFullyVisible =
        bubbleRect.top >= minVisibleTop &&
        bubbleRect.bottom <= maxVisibleBottom;

      if (!isFullyVisible) {
        let scrollOffset = 0;
        if (bubbleRect.top < minVisibleTop) {
          scrollOffset = bubbleRect.top - minVisibleTop;
        } else if (bubbleRect.bottom > maxVisibleBottom) {
          scrollOffset = bubbleRect.bottom - maxVisibleBottom;
        }

        if (scrollOffset !== 0) {
          container.scrollTo({
            top: container.scrollTop + scrollOffset,
            behavior: 'auto',
          });
        }
      }
      triggerMessageFlashWhenScrollSettled(messageId);
    },
    [
      chatHeaderContainerRef,
      closeMessageMenu,
      getVisibleMessagesBounds,
      messageBubbleRefs,
      messagesContainerRef,
      triggerMessageFlashWhenScrollSettled,
    ]
  );

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

  const focusEditingTargetMessage = useCallback(() => {
    if (!editingMessageId) return;
    closeMessageMenu();

    const bubble = messageBubbleRefs.current.get(editingMessageId);
    const container = messagesContainerRef.current;
    const bounds = getVisibleMessagesBounds();
    if (!bubble || !container || !bounds) {
      triggerMessageFlashWhenScrollSettled(editingMessageId);
      return;
    }

    const headerBottom =
      chatHeaderContainerRef.current?.getBoundingClientRect().bottom;
    const hasValidHeaderBottom =
      typeof headerBottom === 'number' &&
      Number.isFinite(headerBottom) &&
      headerBottom > bounds.containerRect.top &&
      headerBottom < bounds.containerRect.bottom;
    const minVisibleTop = hasValidHeaderBottom
      ? headerBottom + EDIT_TARGET_FOCUS_PADDING
      : bounds.containerRect.top + EDIT_TARGET_FOCUS_PADDING;
    const maxVisibleBottom = bounds.visibleBottom - EDIT_TARGET_FOCUS_PADDING;
    const bubbleRect = bubble.getBoundingClientRect();
    const isFullyVisible =
      bubbleRect.top >= minVisibleTop && bubbleRect.bottom <= maxVisibleBottom;

    if (!isFullyVisible) {
      let scrollOffset = 0;
      if (bubbleRect.top < minVisibleTop) {
        scrollOffset = bubbleRect.top - minVisibleTop;
      } else if (bubbleRect.bottom > maxVisibleBottom) {
        scrollOffset = bubbleRect.bottom - maxVisibleBottom;
      }

      if (scrollOffset !== 0) {
        container.scrollTo({
          top: container.scrollTop + scrollOffset,
          behavior: 'smooth',
        });
      }
    }

    triggerMessageFlashWhenScrollSettled(editingMessageId);
  }, [
    chatHeaderContainerRef,
    closeMessageMenu,
    editingMessageId,
    getVisibleMessagesBounds,
    messageBubbleRefs,
    messagesContainerRef,
    triggerMessageFlashWhenScrollSettled,
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

  useEffect(() => {
    if (!isOpen) return;

    const rafId = requestAnimationFrame(focusMessageComposer);
    const timeoutId = setTimeout(focusMessageComposer, 120);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [focusMessageComposer, isOpen]);

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

  useEffect(() => {
    return () => {
      if (menuTransitionSourceTimeoutRef.current) {
        clearTimeout(menuTransitionSourceTimeoutRef.current);
        menuTransitionSourceTimeoutRef.current = null;
      }

      if (flashMessageTimeoutRef.current) {
        clearTimeout(flashMessageTimeoutRef.current);
        flashMessageTimeoutRef.current = null;
      }

      if (pendingSearchFlashRafRef.current !== null) {
        cancelAnimationFrame(pendingSearchFlashRafRef.current);
        pendingSearchFlashRafRef.current = null;
      }
    };
  }, []);

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
    openMenuMessageId,
    menuPlacement,
    menuSideAnchor,
    shouldAnimateMenuOpen,
    menuTransitionSourceId,
    menuOffsetX,
    flashingMessageId,
    isFlashHighlightVisible,
    getVisibleMessagesBounds,
    closeMessageMenu,
    toggleMessageMenu,
    scheduleScrollMessagesToBottom,
    focusEditingTargetMessage,
    handleChatPortalBackgroundClick,
    scrollToBottom,
  };
};
