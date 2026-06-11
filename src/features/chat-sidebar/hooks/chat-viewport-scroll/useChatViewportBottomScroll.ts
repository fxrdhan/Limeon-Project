import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import type { MutableRefObject } from 'react';
import { getBottomScrollMetrics } from './bottomScrollMetrics';
import { cancelAnimationFrameSafely } from './animationFrame';
import { scrollElementToTop } from './scrollElement';
import type { UseChatViewportScrollProps } from './types';

interface UseChatViewportBottomScrollProps {
  messagesContainerRef: UseChatViewportScrollProps['messagesContainerRef'];
  messagesEndRef: UseChatViewportScrollProps['messagesEndRef'];
  getVisibleMessagesBounds: UseChatViewportScrollProps['getVisibleMessagesBounds'];
  scheduleVisibleUnreadReadReceipts: UseChatViewportScrollProps['scheduleVisibleUnreadReadReceipts'];
  isAtBottomRef: MutableRefObject<boolean>;
  setIsAtBottom: Dispatch<SetStateAction<boolean>>;
  setHasNewMessages: Dispatch<SetStateAction<boolean>>;
}

export const useChatViewportBottomScroll = ({
  messagesContainerRef,
  messagesEndRef,
  getVisibleMessagesBounds,
  scheduleVisibleUnreadReadReceipts,
  isAtBottomRef,
  setIsAtBottom,
  setHasNewMessages,
}: UseChatViewportBottomScrollProps) => {
  const scrollToBottomAnimationFrameRef = useRef<number | null>(null);

  const resolveBottomScrollMetrics = useCallback(
    () =>
      getBottomScrollMetrics({
        messagesContainerRef,
        messagesEndRef,
        getVisibleMessagesBounds,
      }),
    [getVisibleMessagesBounds, messagesContainerRef, messagesEndRef]
  );

  const scrollMessagesToBottom = useCallback(
    (behavior: ScrollBehavior) => {
      const metrics = resolveBottomScrollMetrics();
      if (!metrics) return;

      scrollElementToTop(metrics.container, metrics.targetScrollTop, behavior);
    },
    [resolveBottomScrollMetrics]
  );

  const scheduleScrollMessagesToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollMessagesToBottom('auto');
    });
  }, [scrollMessagesToBottom]);

  const pinViewportToBottom = useCallback(() => {
    scrollMessagesToBottom('auto');
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setHasNewMessages(false);
  }, [isAtBottomRef, scrollMessagesToBottom, setHasNewMessages, setIsAtBottom]);

  const cancelScrollToBottomAnimation = useCallback(() => {
    if (scrollToBottomAnimationFrameRef.current === null) return;
    cancelAnimationFrameSafely(scrollToBottomAnimationFrameRef.current);
    scrollToBottomAnimationFrameRef.current = null;
  }, []);

  const animateScrollToBottom = useCallback(() => {
    const metrics = resolveBottomScrollMetrics();
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
  }, [cancelScrollToBottomAnimation, resolveBottomScrollMetrics]);

  const checkIfAtBottom = useCallback(() => {
    const metrics = resolveBottomScrollMetrics();
    if (metrics) {
      return metrics.targetScrollTop - metrics.container.scrollTop <= 100;
    }

    return true;
  }, [resolveBottomScrollMetrics]);

  const scrollToBottom = useCallback(() => {
    animateScrollToBottom();
    scheduleVisibleUnreadReadReceipts();
    setHasNewMessages(false);
    isAtBottomRef.current = true;
    setIsAtBottom(true);
  }, [
    animateScrollToBottom,
    isAtBottomRef,
    scheduleVisibleUnreadReadReceipts,
    setHasNewMessages,
    setIsAtBottom,
  ]);

  return {
    scrollMessagesToBottom,
    scheduleScrollMessagesToBottom,
    pinViewportToBottom,
    cancelScrollToBottomAnimation,
    checkIfAtBottom,
    scrollToBottom,
  };
};
