import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import {
  EDIT_TARGET_FLASH_PHASE_DURATION,
  EDIT_TARGET_FOCUS_PADDING,
} from '../constants';

type VisibleBounds = {
  containerRect: DOMRect;
  visibleBottom: number;
};

interface UseChatViewportFocusProps {
  getVisibleMessagesBounds: () => VisibleBounds | null;
  closeMessageMenu: () => void;
  chatHeaderContainerRef: RefObject<HTMLDivElement | null>;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  editingMessageId: string | null;
}

export const useChatViewportFocus = ({
  getVisibleMessagesBounds,
  closeMessageMenu,
  chatHeaderContainerRef,
  messageBubbleRefs,
  messagesContainerRef,
  editingMessageId,
}: UseChatViewportFocusProps) => {
  const [flashingMessageId, setFlashingMessageId] = useState<string | null>(
    null
  );
  const [isFlashHighlightVisible, setIsFlashHighlightVisible] = useState(false);

  const flashMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSearchFlashRafRef = useRef<number | null>(null);

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

  const getVerticalVisibilityBounds = useCallback(() => {
    const bounds = getVisibleMessagesBounds();
    if (!bounds) return null;

    const headerBottom =
      chatHeaderContainerRef.current?.getBoundingClientRect().bottom;
    const hasValidHeaderBottom =
      typeof headerBottom === 'number' &&
      Number.isFinite(headerBottom) &&
      headerBottom > bounds.containerRect.top &&
      headerBottom < bounds.containerRect.bottom;

    return {
      bounds,
      minVisibleTop: hasValidHeaderBottom
        ? headerBottom + EDIT_TARGET_FOCUS_PADDING
        : bounds.containerRect.top + EDIT_TARGET_FOCUS_PADDING,
      maxVisibleBottom: bounds.visibleBottom - EDIT_TARGET_FOCUS_PADDING,
    };
  }, [chatHeaderContainerRef, getVisibleMessagesBounds]);

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
        const visibilityBounds = getVerticalVisibilityBounds();
        if (!bubble || !container || !visibilityBounds) {
          if (Date.now() - waitStart < maxWaitMs) {
            pendingSearchFlashRafRef.current = requestAnimationFrame(
              verifyVisibilityAndFlash
            );
          } else {
            pendingSearchFlashRafRef.current = null;
          }
          return;
        }

        const { minVisibleTop, maxVisibleBottom } = visibilityBounds;
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
      clearPendingSearchFlash,
      getVerticalVisibilityBounds,
      messageBubbleRefs,
      messagesContainerRef,
      triggerMessageFlash,
    ]
  );

  const focusMessage = useCallback(
    (messageId: string, behavior: ScrollBehavior) => {
      const bubble = messageBubbleRefs.current.get(messageId);
      const container = messagesContainerRef.current;
      const visibilityBounds = getVerticalVisibilityBounds();
      if (!bubble || !container || !visibilityBounds) {
        triggerMessageFlashWhenScrollSettled(messageId);
        return;
      }

      closeMessageMenu();
      const { minVisibleTop, maxVisibleBottom } = visibilityBounds;
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
            behavior,
          });
        }
      }

      triggerMessageFlashWhenScrollSettled(messageId);
    },
    [
      closeMessageMenu,
      getVerticalVisibilityBounds,
      messageBubbleRefs,
      messagesContainerRef,
      triggerMessageFlashWhenScrollSettled,
    ]
  );

  const focusSearchTargetMessage = useCallback(
    (messageId: string) => {
      focusMessage(messageId, 'auto');
    },
    [focusMessage]
  );

  const focusEditingTargetMessage = useCallback(() => {
    if (!editingMessageId) return;
    focusMessage(editingMessageId, 'smooth');
  }, [editingMessageId, focusMessage]);

  useEffect(() => {
    return () => {
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

  return {
    flashingMessageId,
    isFlashHighlightVisible,
    focusSearchTargetMessage,
    focusEditingTargetMessage,
  };
};
