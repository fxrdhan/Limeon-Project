import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import {
  CHAT_HEADER_OVERLAY_HEIGHT,
  EDIT_TARGET_FLASH_PHASE_DURATION,
  EDIT_TARGET_FOCUS_PADDING,
} from '../constants';
import {
  getVerticalVisibilityBounds as buildVerticalVisibilityBounds,
  type VisibleBounds,
} from '../utils/viewport-visibility';

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
  const pendingFocusRafRef = useRef<number | null>(null);

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

  const clearPendingFocus = useCallback(() => {
    if (pendingFocusRafRef.current === null) return;
    cancelAnimationFrame(pendingFocusRafRef.current);
    pendingFocusRafRef.current = null;
  }, []);

  const getCurrentVerticalVisibilityBounds = useCallback(() => {
    const bounds = getVisibleMessagesBounds();
    if (!bounds) return null;

    const overlayMinVisibleTop =
      bounds.containerRect.top +
      CHAT_HEADER_OVERLAY_HEIGHT +
      EDIT_TARGET_FOCUS_PADDING;
    const verticalVisibilityBounds = buildVerticalVisibilityBounds(
      bounds,
      chatHeaderContainerRef.current?.getBoundingClientRect(),
      EDIT_TARGET_FOCUS_PADDING
    );

    return {
      bounds,
      ...verticalVisibilityBounds,
      minVisibleTop: Math.max(
        verticalVisibilityBounds.minVisibleTop,
        overlayMinVisibleTop
      ),
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
        const visibilityBounds = getCurrentVerticalVisibilityBounds();
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
      getCurrentVerticalVisibilityBounds,
      messageBubbleRefs,
      messagesContainerRef,
      triggerMessageFlash,
    ]
  );

  const focusMessageNow = useCallback(
    (
      messageId: string,
      behavior: ScrollBehavior,
      bubble: HTMLDivElement,
      container: HTMLDivElement,
      visibilityBounds: NonNullable<
        ReturnType<typeof getCurrentVerticalVisibilityBounds>
      >
    ) => {
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
    [closeMessageMenu, triggerMessageFlashWhenScrollSettled]
  );

  const focusMessage = useCallback(
    (messageId: string, behavior: ScrollBehavior) => {
      const bubble = messageBubbleRefs.current.get(messageId);
      const container = messagesContainerRef.current;
      const visibilityBounds = getCurrentVerticalVisibilityBounds();
      if (!bubble || !container || !visibilityBounds) {
        clearPendingFocus();
        const waitStart = Date.now();
        const maxWaitMs = 900;

        const retryFocusWhenReady = () => {
          const nextBubble = messageBubbleRefs.current.get(messageId);
          const nextContainer = messagesContainerRef.current;
          const nextVisibilityBounds = getCurrentVerticalVisibilityBounds();

          if (nextBubble && nextContainer && nextVisibilityBounds) {
            pendingFocusRafRef.current = null;
            focusMessageNow(
              messageId,
              behavior,
              nextBubble,
              nextContainer,
              nextVisibilityBounds
            );
            return;
          }

          if (Date.now() - waitStart >= maxWaitMs) {
            pendingFocusRafRef.current = null;
            triggerMessageFlashWhenScrollSettled(messageId);
            return;
          }

          pendingFocusRafRef.current =
            requestAnimationFrame(retryFocusWhenReady);
        };

        pendingFocusRafRef.current = requestAnimationFrame(retryFocusWhenReady);
        return;
      }

      clearPendingFocus();
      focusMessageNow(messageId, behavior, bubble, container, visibilityBounds);
    },
    [
      clearPendingFocus,
      focusMessageNow,
      getCurrentVerticalVisibilityBounds,
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

  const focusReplyTargetMessage = useCallback(
    (messageId: string) => {
      focusMessage(messageId, 'smooth');
    },
    [focusMessage]
  );

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

      if (pendingFocusRafRef.current !== null) {
        cancelAnimationFrame(pendingFocusRafRef.current);
        pendingFocusRafRef.current = null;
      }
    };
  }, []);

  return {
    flashingMessageId,
    isFlashHighlightVisible,
    focusSearchTargetMessage,
    focusEditingTargetMessage,
    focusReplyTargetMessage,
  };
};
