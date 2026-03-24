import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { RefObject } from 'react';
import { MESSAGE_BOTTOM_GAP } from '../constants';
import type { VisibleBounds } from '../utils/viewport-visibility';

interface UseChatViewportScrollProps {
  isOpen: boolean;
  currentChannelId: string | null;
  messages: Array<{
    id: string;
  }>;
  messagesCount: number;
  loading: boolean;
  messageInputHeight: number;
  composerContextualOffset: number;
  composerContainerHeight: number;
  getVisibleMessagesBounds: () => VisibleBounds | null;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  scheduleVisibleUnreadReadReceipts: () => void;
}

export const useChatViewportScroll = ({
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
  messagesEndRef,
  scheduleVisibleUnreadReadReceipts,
}: UseChatViewportScrollProps) => {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const atTopVisibilityRef = useRef(true);
  const isAtBottomRef = useRef(true);
  const shouldPinToBottomOnOpenRef = useRef(false);
  const shouldMaintainBottomDuringComposerResizeRef = useRef(false);
  const scrollToBottomAnimationFrameRef = useRef<number | null>(null);
  const composerResizeBottomSyncDeadlineRef = useRef<number | null>(null);
  const composerResizeBottomSyncTimeoutRef = useRef<number | null>(null);
  const previousMessagesCountRef = useRef<number | null>(null);
  const previousLatestMessageIdRef = useRef<string | null>(null);
  const previousComposerContainerHeightRef = useRef<number | null>(null);

  const getBottomScrollMetrics = useCallback(() => {
    const container = messagesContainerRef.current;
    const endMarker = messagesEndRef.current;
    const bounds = getVisibleMessagesBounds();
    if (!container || !endMarker || !bounds) return null;

    const hiddenBottom = Math.max(
      0,
      bounds.containerRect.bottom - bounds.visibleBottom
    );
    const visibleHeight = container.clientHeight - hiddenBottom;
    if (visibleHeight <= 0) return null;

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

    return {
      container,
      endTopInContent,
      targetScrollTop: Math.min(Math.max(rawTargetScrollTop, 0), maxScrollTop),
      visibleHeight,
    };
  }, [getVisibleMessagesBounds, messagesContainerRef, messagesEndRef]);

  const scrollMessagesToBottom = useCallback(
    (behavior: ScrollBehavior) => {
      const metrics = getBottomScrollMetrics();
      if (!metrics) return;

      metrics.container.scrollTo({
        top: metrics.targetScrollTop,
        behavior,
      });
    },
    [getBottomScrollMetrics]
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

  const cancelComposerResizeBottomSync = useCallback(() => {
    if (composerResizeBottomSyncTimeoutRef.current !== null) {
      window.clearTimeout(composerResizeBottomSyncTimeoutRef.current);
      composerResizeBottomSyncTimeoutRef.current = null;
    }

    composerResizeBottomSyncDeadlineRef.current = null;
  }, []);

  const maintainBottomDuringComposerResize = useCallback(() => {
    shouldMaintainBottomDuringComposerResizeRef.current = true;
    composerResizeBottomSyncDeadlineRef.current = Date.now() + 260;
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setHasNewMessages(false);
    scrollMessagesToBottom('auto');

    if (composerResizeBottomSyncTimeoutRef.current !== null) {
      return;
    }

    const step = () => {
      scrollMessagesToBottom('auto');

      if (
        composerResizeBottomSyncDeadlineRef.current !== null &&
        Date.now() < composerResizeBottomSyncDeadlineRef.current
      ) {
        composerResizeBottomSyncTimeoutRef.current = window.setTimeout(
          step,
          16
        );
        return;
      }

      scrollMessagesToBottom('auto');
      scheduleVisibleUnreadReadReceipts();
      shouldMaintainBottomDuringComposerResizeRef.current = false;
      composerResizeBottomSyncTimeoutRef.current = null;
      composerResizeBottomSyncDeadlineRef.current = null;
    };

    composerResizeBottomSyncTimeoutRef.current = window.setTimeout(step, 16);
  }, [scheduleVisibleUnreadReadReceipts, scrollMessagesToBottom]);

  const animateScrollToBottom = useCallback(() => {
    const metrics = getBottomScrollMetrics();
    if (!metrics) return;

    const { container, targetScrollTop } = metrics;
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
  }, [cancelScrollToBottomAnimation, getBottomScrollMetrics]);

  const checkIfAtBottom = useCallback(() => {
    const metrics = getBottomScrollMetrics();
    if (metrics) {
      return metrics.targetScrollTop - metrics.container.scrollTop <= 100;
    }

    return true;
  }, [getBottomScrollMetrics]);

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
      isAtBottomRef.current = atBottom;
      setIsAtBottom(atBottom);
      setIsAtTop(atTop);
      scheduleVisibleUnreadReadReceipts();
      if (atBottom) {
        setHasNewMessages(false);
      }
    });
  }, [checkIfAtBottom, checkIfAtTop, scheduleVisibleUnreadReadReceipts]);

  useEffect(() => {
    if (!isOpen) return;

    const rafId = requestAnimationFrame(() => {
      handleScroll();
      scheduleVisibleUnreadReadReceipts();
    });

    return () => {
      const cancelAnimationFrameFn =
        typeof window !== 'undefined' &&
        typeof window.cancelAnimationFrame === 'function'
          ? window.cancelAnimationFrame.bind(window)
          : typeof cancelAnimationFrame === 'function'
            ? cancelAnimationFrame
            : null;

      cancelAnimationFrameFn?.(rafId);
    };
  }, [
    composerContainerHeight,
    composerContextualOffset,
    handleScroll,
    isOpen,
    messageInputHeight,
    messagesCount,
    scheduleVisibleUnreadReadReceipts,
  ]);

  useLayoutEffect(() => {
    const previousComposerContainerHeight =
      previousComposerContainerHeightRef.current;
    previousComposerContainerHeightRef.current = composerContainerHeight;

    const shouldMaintainBottom =
      shouldMaintainBottomDuringComposerResizeRef.current ||
      isAtBottomRef.current;

    if (
      !isOpen ||
      !currentChannelId ||
      shouldPinToBottomOnOpenRef.current ||
      previousComposerContainerHeight === null ||
      previousComposerContainerHeight === composerContainerHeight ||
      !shouldMaintainBottom
    ) {
      return;
    }

    shouldMaintainBottomDuringComposerResizeRef.current = true;
    maintainBottomDuringComposerResize();
  }, [
    composerContainerHeight,
    currentChannelId,
    isOpen,
    maintainBottomDuringComposerResize,
  ]);

  useEffect(() => {
    const latestMessageId = messages[messages.length - 1]?.id ?? null;
    const previousMessagesCount = previousMessagesCountRef.current;
    const previousLatestMessageId = previousLatestMessageIdRef.current;

    previousMessagesCountRef.current = messagesCount;
    previousLatestMessageIdRef.current = latestMessageId;

    if (shouldPinToBottomOnOpenRef.current || !currentChannelId) {
      return;
    }

    if (
      previousMessagesCount === null ||
      messagesCount <= previousMessagesCount ||
      latestMessageId === null ||
      latestMessageId === previousLatestMessageId
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
    messages,
    messagesCount,
    scheduleScrollMessagesToBottom,
  ]);

  useLayoutEffect(() => {
    if (!isOpen || !shouldPinToBottomOnOpenRef.current) return;

    scrollMessagesToBottom('auto');
    isAtBottomRef.current = true;
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

  useEffect(() => {
    if (!isOpen || !currentChannelId) return;

    shouldPinToBottomOnOpenRef.current = true;
    previousMessagesCountRef.current = null;
    previousLatestMessageIdRef.current = null;
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setHasNewMessages(false);

    return () => {
      shouldPinToBottomOnOpenRef.current = false;
      shouldMaintainBottomDuringComposerResizeRef.current = false;
      cancelComposerResizeBottomSync();
    };
  }, [cancelComposerResizeBottomSync, currentChannelId, isOpen]);

  useEffect(
    () => () => {
      cancelScrollToBottomAnimation();
      cancelComposerResizeBottomSync();
    },
    [cancelComposerResizeBottomSync, cancelScrollToBottomAnimation]
  );

  const scrollToBottom = useCallback(() => {
    animateScrollToBottom();
    scheduleVisibleUnreadReadReceipts();
    setHasNewMessages(false);
    isAtBottomRef.current = true;
    setIsAtBottom(true);
  }, [animateScrollToBottom, scheduleVisibleUnreadReadReceipts]);

  return {
    isAtBottom,
    isAtTop,
    hasNewMessages,
    scheduleScrollMessagesToBottom,
    scrollToBottom,
  };
};
