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
  getVisibleMessagesBounds,
  messagesContainerRef,
  messagesEndRef,
  scheduleVisibleUnreadReadReceipts,
}: UseChatViewportScrollProps) => {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const atTopVisibilityRef = useRef(true);
  const shouldPinToBottomOnOpenRef = useRef(false);
  const scrollToBottomAnimationFrameRef = useRef<number | null>(null);
  const previousMessagesCountRef = useRef<number | null>(null);
  const previousLatestMessageIdRef = useRef<string | null>(null);

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
      cancelAnimationFrame(rafId);
    };
  }, [
    composerContextualOffset,
    handleScroll,
    isOpen,
    messageInputHeight,
    messagesCount,
    scheduleVisibleUnreadReadReceipts,
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
    previousMessagesCountRef.current = messagesCount;
    previousLatestMessageIdRef.current =
      messages[messages.length - 1]?.id ?? null;
    setIsAtBottom(true);
    setHasNewMessages(false);
  }, [currentChannelId, isOpen, messages, messagesCount]);

  useEffect(
    () => () => {
      cancelScrollToBottomAnimation();
    },
    [cancelScrollToBottomAnimation]
  );

  const scrollToBottom = useCallback(() => {
    animateScrollToBottom();
    scheduleVisibleUnreadReadReceipts();
    setHasNewMessages(false);
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
