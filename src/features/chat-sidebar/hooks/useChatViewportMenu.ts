import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  CHAT_HEADER_OVERLAY_HEIGHT,
  MENU_GAP,
  MENU_HEIGHT,
  MENU_WIDTH,
} from '../constants';
import type { MenuPlacement, MenuSideAnchor } from '../types';

type VisibleBounds = {
  containerRect: DOMRect;
  visibleBottom: number;
};

interface UseChatViewportMenuProps {
  getVisibleMessagesBounds: () => VisibleBounds | null;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
}

const isAnchorVisibleWithinViewport = (
  bounds: VisibleBounds,
  anchorRect: DOMRect
) => {
  const minVisibleTop = bounds.containerRect.top + CHAT_HEADER_OVERLAY_HEIGHT;
  const maxVisibleBottom = bounds.visibleBottom;

  return anchorRect.bottom > minVisibleTop && anchorRect.top < maxVisibleBottom;
};

export const useChatViewportMenu = ({
  getVisibleMessagesBounds,
  messagesContainerRef,
}: UseChatViewportMenuProps) => {
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
  const [menuViewportTick, setMenuViewportTick] = useState(0);

  const menuTransitionSourceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMenuRepositionAnimationFrameRef = useRef<number | null>(null);
  const menuOpenScrollAnimationFrameRef = useRef<number | null>(null);
  const openMenuAnchorRef = useRef<HTMLElement | null>(null);
  const openMenuPreferredSideRef = useRef<'left' | 'right'>('left');

  const cancelNextFrame = useCallback((frameId: number) => {
    const cancelAnimationFrameFn =
      typeof window !== 'undefined' &&
      typeof window.cancelAnimationFrame === 'function'
        ? window.cancelAnimationFrame.bind(window)
        : typeof globalThis.cancelAnimationFrame === 'function'
          ? globalThis.cancelAnimationFrame.bind(globalThis)
          : window.clearTimeout.bind(window);

    cancelAnimationFrameFn(frameId);
  }, []);

  const requestNextFrame = useCallback((callback: FrameRequestCallback) => {
    const requestAnimationFrameFn =
      typeof window !== 'undefined' &&
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : typeof globalThis.requestAnimationFrame === 'function'
          ? globalThis.requestAnimationFrame.bind(globalThis)
          : (fallbackCallback: FrameRequestCallback) =>
              window.setTimeout(() => fallbackCallback(Date.now()), 16);

    return requestAnimationFrameFn(callback);
  }, []);

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
      const isAnchorNearHeaderOverlay =
        anchorRect.top < containerRect.top + CHAT_HEADER_OVERLAY_HEIGHT;

      if (isAnchorNearHeaderOverlay && spaceBelow > spaceAbove) {
        return { placement: 'up', sideAnchor: 'middle' };
      }

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

  const cancelMenuOpenScrollAnimation = useCallback(() => {
    if (menuOpenScrollAnimationFrameRef.current === null) {
      return;
    }

    cancelNextFrame(menuOpenScrollAnimationFrameRef.current);
    menuOpenScrollAnimationFrameRef.current = null;
  }, [cancelNextFrame]);

  const animateMenuOpenScroll = useCallback(
    (container: HTMLDivElement, targetScrollTop: number) => {
      const startScrollTop = container.scrollTop;
      const distance = targetScrollTop - startScrollTop;

      if (Math.abs(distance) < 0.5) {
        container.scrollTop = targetScrollTop;
        return;
      }

      cancelMenuOpenScrollAnimation();

      const totalFrames = Math.min(
        18,
        Math.max(8, Math.round(Math.abs(distance) / 18))
      );
      let currentFrame = 0;

      const step = () => {
        currentFrame += 1;
        const progress = currentFrame / totalFrames;
        const easedProgress = 1 - (1 - progress) ** 4;

        container.scrollTop = startScrollTop + distance * easedProgress;

        if (currentFrame < totalFrames) {
          menuOpenScrollAnimationFrameRef.current = requestNextFrame(step);
          return;
        }

        container.scrollTop = targetScrollTop;
        menuOpenScrollAnimationFrameRef.current = null;
      };

      menuOpenScrollAnimationFrameRef.current = requestNextFrame(step);
    },
    [cancelMenuOpenScrollAnimation, requestNextFrame]
  );

  const closeMessageMenu = useCallback(() => {
    cancelMenuOpenScrollAnimation();
    if (menuTransitionSourceTimeoutRef.current) {
      clearTimeout(menuTransitionSourceTimeoutRef.current);
      menuTransitionSourceTimeoutRef.current = null;
    }
    if (pendingMenuRepositionAnimationFrameRef.current !== null) {
      cancelNextFrame(pendingMenuRepositionAnimationFrameRef.current);
      pendingMenuRepositionAnimationFrameRef.current = null;
    }
    openMenuAnchorRef.current = null;
    setOpenMenuMessageId(null);
    setMenuTransitionSourceId(null);
    setMenuOffsetX(0);
    setShouldAnimateMenuOpen(true);
  }, [cancelMenuOpenScrollAnimation, cancelNextFrame]);

  const syncOpenMenuLayout = useCallback(
    (anchor: HTMLElement, preferredSide: 'left' | 'right') => {
      const anchorRect = anchor.getBoundingClientRect();
      const bounds = getVisibleMessagesBounds();

      if (bounds && !isAnchorVisibleWithinViewport(bounds, anchorRect)) {
        closeMessageMenu();
        return;
      }

      const nextMenuLayout = getMenuLayout(anchorRect, preferredSide);

      setMenuPlacement(previousPlacement =>
        previousPlacement === nextMenuLayout.placement
          ? previousPlacement
          : nextMenuLayout.placement
      );
      setMenuSideAnchor(previousSideAnchor =>
        previousSideAnchor === nextMenuLayout.sideAnchor
          ? previousSideAnchor
          : nextMenuLayout.sideAnchor
      );
      setMenuOffsetX(0);
      setMenuViewportTick(previousTick => previousTick + 1);
    },
    [closeMessageMenu, getMenuLayout, getVisibleMessagesBounds]
  );

  const ensureAnchorVisibleForMenuOpen = useCallback(
    (anchorRect: DOMRect) => {
      const container = messagesContainerRef.current;
      const bounds = getVisibleMessagesBounds();
      if (!container || !bounds) {
        return;
      }

      const minVisibleTop =
        bounds.containerRect.top + CHAT_HEADER_OVERLAY_HEIGHT + MENU_GAP;
      const maxVisibleBottom = bounds.visibleBottom - MENU_GAP;

      let scrollOffset = 0;
      if (anchorRect.top < minVisibleTop) {
        scrollOffset = anchorRect.top - minVisibleTop;
      } else if (anchorRect.bottom > maxVisibleBottom) {
        scrollOffset = anchorRect.bottom - maxVisibleBottom;
      }

      if (Math.abs(scrollOffset) < 0.5) {
        return;
      }

      const nextScrollTop = Math.min(
        Math.max(container.scrollTop + scrollOffset, 0),
        Math.max(0, container.scrollHeight - container.clientHeight)
      );

      if (Math.abs(nextScrollTop - container.scrollTop) < 0.5) {
        return;
      }

      animateMenuOpenScroll(container, nextScrollTop);
    },
    [animateMenuOpenScroll, getVisibleMessagesBounds, messagesContainerRef]
  );

  const requestOpenMenuReposition = useCallback(() => {
    if (pendingMenuRepositionAnimationFrameRef.current !== null) {
      return;
    }

    pendingMenuRepositionAnimationFrameRef.current = requestNextFrame(() => {
      pendingMenuRepositionAnimationFrameRef.current = null;

      if (!openMenuMessageId) {
        return;
      }

      const anchor = openMenuAnchorRef.current;
      if (!anchor || !anchor.isConnected) {
        closeMessageMenu();
        return;
      }

      syncOpenMenuLayout(anchor, openMenuPreferredSideRef.current);
    });
  }, [
    closeMessageMenu,
    openMenuMessageId,
    requestNextFrame,
    syncOpenMenuLayout,
  ]);

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

      ensureAnchorVisibleForMenuOpen(anchorRect);

      if (menuTransitionSourceTimeoutRef.current) {
        clearTimeout(menuTransitionSourceTimeoutRef.current);
        menuTransitionSourceTimeoutRef.current = null;
      }
      if (pendingMenuRepositionAnimationFrameRef.current !== null) {
        cancelNextFrame(pendingMenuRepositionAnimationFrameRef.current);
        pendingMenuRepositionAnimationFrameRef.current = null;
      }

      openMenuAnchorRef.current = anchor;
      openMenuPreferredSideRef.current = preferredSide;
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
    [
      cancelNextFrame,
      closeMessageMenu,
      ensureAnchorVisibleForMenuOpen,
      getMenuLayout,
      openMenuMessageId,
    ]
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

      const anchor = openMenuAnchorRef.current;
      if (anchor) {
        const anchorRect = anchor.getBoundingClientRect();
        if (!isAnchorVisibleWithinViewport(bounds, anchorRect)) {
          closeMessageMenu();
          return;
        }
      }

      const { containerRect } = bounds;
      const menuRect = menuElement.getBoundingClientRect();

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
    [closeMessageMenu, getVisibleMessagesBounds, messagesContainerRef]
  );

  useLayoutEffect(() => {
    if (!openMenuMessageId) return;

    ensureMenuFullyVisible(openMenuMessageId);
  }, [
    ensureMenuFullyVisible,
    menuPlacement,
    menuSideAnchor,
    openMenuMessageId,
    menuViewportTick,
  ]);

  useLayoutEffect(() => {
    if (!openMenuMessageId) {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const handleViewportChange = () => {
      requestOpenMenuReposition();
    };

    container.addEventListener('scroll', handleViewportChange, {
      passive: true,
    });
    window.addEventListener('resize', handleViewportChange);

    return () => {
      container.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [messagesContainerRef, openMenuMessageId, requestOpenMenuReposition]);

  useLayoutEffect(() => {
    return () => {
      if (menuTransitionSourceTimeoutRef.current) {
        clearTimeout(menuTransitionSourceTimeoutRef.current);
        menuTransitionSourceTimeoutRef.current = null;
      }
      if (pendingMenuRepositionAnimationFrameRef.current !== null) {
        cancelNextFrame(pendingMenuRepositionAnimationFrameRef.current);
        pendingMenuRepositionAnimationFrameRef.current = null;
      }
      if (menuOpenScrollAnimationFrameRef.current !== null) {
        cancelNextFrame(menuOpenScrollAnimationFrameRef.current);
        menuOpenScrollAnimationFrameRef.current = null;
      }
    };
  }, [cancelNextFrame]);

  return {
    openMenuMessageId,
    menuPlacement,
    menuSideAnchor,
    shouldAnimateMenuOpen,
    menuTransitionSourceId,
    menuOffsetX,
    closeMessageMenu,
    toggleMessageMenu,
  };
};
