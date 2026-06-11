import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cancelAnimationFrameSafely } from './chat-viewport-scroll/animationFrame';
import {
  getElementBoundingHeight,
  getElementClientHeight,
} from './chat-viewport-scroll/resizeSizeGetters';
import { scrollElementToTop } from './chat-viewport-scroll/scrollElement';
import type { UseChatViewportScrollProps } from './chat-viewport-scroll/types';
import { useChatViewportBottomScroll } from './chat-viewport-scroll/useChatViewportBottomScroll';
import { usePinnedViewportResizeSync } from './chat-viewport-scroll/usePinnedViewportResizeSync';

const PINNED_VIEWPORT_SYNC_SUSPENSION_MS = 1_000;
const INITIAL_OPEN_PIN_SETTLE_FRAMES = 40;

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
  messagesContentRef,
  messagesEndRef,
  scheduleVisibleUnreadReadReceipts,
}: UseChatViewportScrollProps) => {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [isInitialOpenPinPending, setIsInitialOpenPinPending] = useState(false);

  const atTopVisibilityRef = useRef(true);
  const isAtBottomRef = useRef(true);
  const shouldPinToBottomOnOpenRef = useRef(false);
  const shouldMaintainBottomDuringComposerResizeRef = useRef(false);
  const initialOpenPinSettleAnimationFrameRef = useRef<number | null>(null);
  const initialOpenPinSettleFramesRef = useRef(0);
  const composerResizeBottomSyncDeadlineRef = useRef<number | null>(null);
  const composerResizeBottomSyncTimeoutRef = useRef<number | null>(null);
  const pinnedViewportSyncSuspendedUntilRef = useRef(0);
  const previousMessagesCountRef = useRef<number | null>(null);
  const previousLatestMessageIdRef = useRef<string | null>(null);
  const previousComposerContainerHeightRef = useRef<number | null>(null);

  const {
    scrollMessagesToBottom,
    scheduleScrollMessagesToBottom,
    pinViewportToBottom,
    cancelScrollToBottomAnimation,
    checkIfAtBottom,
    scrollToBottom,
  } = useChatViewportBottomScroll({
    messagesContainerRef,
    messagesEndRef,
    getVisibleMessagesBounds,
    scheduleVisibleUnreadReadReceipts,
    isAtBottomRef,
    setIsAtBottom,
    setHasNewMessages,
  });

  const cancelInitialOpenPinSettleAnimation = useCallback(() => {
    if (initialOpenPinSettleAnimationFrameRef.current === null) return;
    cancelAnimationFrameSafely(initialOpenPinSettleAnimationFrameRef.current);
    initialOpenPinSettleAnimationFrameRef.current = null;
    initialOpenPinSettleFramesRef.current = 0;
  }, []);

  const settleInitialOpenPinToBottom = useCallback(() => {
    cancelInitialOpenPinSettleAnimation();
    initialOpenPinSettleFramesRef.current = INITIAL_OPEN_PIN_SETTLE_FRAMES;

    const step = () => {
      pinViewportToBottom();
      initialOpenPinSettleFramesRef.current -= 1;

      if (initialOpenPinSettleFramesRef.current > 0) {
        initialOpenPinSettleAnimationFrameRef.current =
          requestAnimationFrame(step);
        return;
      }

      shouldPinToBottomOnOpenRef.current = false;
      initialOpenPinSettleAnimationFrameRef.current = null;
      initialOpenPinSettleFramesRef.current = 0;
      setIsInitialOpenPinPending(false);
      scheduleVisibleUnreadReadReceipts();
    };

    initialOpenPinSettleAnimationFrameRef.current = requestAnimationFrame(step);
  }, [
    cancelInitialOpenPinSettleAnimation,
    pinViewportToBottom,
    scheduleVisibleUnreadReadReceipts,
  ]);

  const cancelComposerResizeBottomSync = useCallback(() => {
    if (composerResizeBottomSyncTimeoutRef.current !== null) {
      window.clearTimeout(composerResizeBottomSyncTimeoutRef.current);
      composerResizeBottomSyncTimeoutRef.current = null;
    }

    composerResizeBottomSyncDeadlineRef.current = null;
  }, []);

  const suspendPinnedViewportSync = useCallback(() => {
    pinnedViewportSyncSuspendedUntilRef.current =
      Date.now() + PINNED_VIEWPORT_SYNC_SUSPENSION_MS;
  }, []);

  const isPinnedViewportSyncSuspended = useCallback(() => {
    if (pinnedViewportSyncSuspendedUntilRef.current <= Date.now()) {
      pinnedViewportSyncSuspendedUntilRef.current = 0;
      return false;
    }

    return true;
  }, []);

  const maintainBottomDuringComposerResize = useCallback(() => {
    shouldMaintainBottomDuringComposerResizeRef.current = true;
    composerResizeBottomSyncDeadlineRef.current = Date.now() + 260;
    pinViewportToBottom();

    if (composerResizeBottomSyncTimeoutRef.current !== null) {
      return;
    }

    const step = () => {
      pinViewportToBottom();

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

      pinViewportToBottom();
      scheduleVisibleUnreadReadReceipts();
      shouldMaintainBottomDuringComposerResizeRef.current = false;
      composerResizeBottomSyncTimeoutRef.current = null;
      composerResizeBottomSyncDeadlineRef.current = null;
    };

    composerResizeBottomSyncTimeoutRef.current = window.setTimeout(step, 16);
  }, [pinViewportToBottom, scheduleVisibleUnreadReadReceipts]);

  const preserveViewportDuringComposerResize = useCallback(
    (
      previousComposerContainerHeight: number,
      nextComposerContainerHeight: number
    ) => {
      const container = messagesContainerRef.current;
      if (!container) {
        return;
      }

      const composerHeightDelta =
        nextComposerContainerHeight - previousComposerContainerHeight;
      if (Math.abs(composerHeightDelta) < 0.5) {
        return;
      }

      const nextScrollTop = Math.min(
        Math.max(container.scrollTop + composerHeightDelta, 0),
        Math.max(0, container.scrollHeight - container.clientHeight)
      );

      if (Math.abs(nextScrollTop - container.scrollTop) < 0.5) {
        return;
      }

      scrollElementToTop(container, nextScrollTop, 'auto');

      scheduleVisibleUnreadReadReceipts();
    },
    [messagesContainerRef, scheduleVisibleUnreadReadReceipts]
  );

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
      cancelAnimationFrameSafely(rafId);
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
      previousComposerContainerHeight === composerContainerHeight
    ) {
      return;
    }

    if (shouldMaintainBottom) {
      shouldMaintainBottomDuringComposerResizeRef.current = true;
      maintainBottomDuringComposerResize();
      return;
    }

    preserveViewportDuringComposerResize(
      previousComposerContainerHeight,
      composerContainerHeight
    );
  }, [
    composerContainerHeight,
    currentChannelId,
    isOpen,
    maintainBottomDuringComposerResize,
    preserveViewportDuringComposerResize,
  ]);

  usePinnedViewportResizeSync({
    isOpen,
    observedRef: messagesContentRef,
    getObservedSize: getElementBoundingHeight,
    shouldPinToBottomOnOpenRef,
    shouldMaintainBottomDuringComposerResizeRef,
    isAtBottomRef,
    isPinnedViewportSyncSuspended,
    pinViewportToBottom,
    scheduleVisibleUnreadReadReceipts,
  });

  usePinnedViewportResizeSync({
    isOpen,
    observedRef: messagesContainerRef,
    getObservedSize: getElementClientHeight,
    shouldPinToBottomOnOpenRef,
    shouldMaintainBottomDuringComposerResizeRef,
    isAtBottomRef,
    isPinnedViewportSyncSuspended,
    pinViewportToBottom,
    scheduleVisibleUnreadReadReceipts,
  });

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
    if (
      !isOpen ||
      messagesCount === 0 ||
      !shouldPinToBottomOnOpenRef.current ||
      composerContainerHeight <= 0
    ) {
      return;
    }

    scrollMessagesToBottom('auto');
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    const atTop = checkIfAtTop();
    atTopVisibilityRef.current = atTop;
    setIsAtTop(atTop);
    setHasNewMessages(false);

    if (!loading) {
      settleInitialOpenPinToBottom();
    }
  }, [
    checkIfAtTop,
    composerContainerHeight,
    isOpen,
    loading,
    messageInputHeight,
    messagesCount,
    scrollMessagesToBottom,
    settleInitialOpenPinToBottom,
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

    cancelInitialOpenPinSettleAnimation();
    shouldPinToBottomOnOpenRef.current = true;
    previousMessagesCountRef.current = null;
    previousLatestMessageIdRef.current = null;
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setHasNewMessages(false);
    setIsInitialOpenPinPending(true);

    return () => {
      cancelInitialOpenPinSettleAnimation();
      shouldPinToBottomOnOpenRef.current = false;
      shouldMaintainBottomDuringComposerResizeRef.current = false;
      cancelComposerResizeBottomSync();
      setIsInitialOpenPinPending(false);
    };
  }, [
    cancelComposerResizeBottomSync,
    cancelInitialOpenPinSettleAnimation,
    currentChannelId,
    isOpen,
  ]);

  useEffect(
    () => () => {
      cancelScrollToBottomAnimation();
      cancelComposerResizeBottomSync();
      cancelInitialOpenPinSettleAnimation();
    },
    [
      cancelComposerResizeBottomSync,
      cancelInitialOpenPinSettleAnimation,
      cancelScrollToBottomAnimation,
    ]
  );

  return {
    isAtBottom,
    isAtTop,
    hasNewMessages,
    isInitialOpenPinPending,
    scheduleScrollMessagesToBottom,
    suspendPinnedViewportSync,
    scrollToBottom,
  };
};
