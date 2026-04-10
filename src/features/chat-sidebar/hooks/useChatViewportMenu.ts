import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { CHAT_HEADER_OVERLAY_HEIGHT, MENU_GAP } from '../constants';
import type { MenuPlacement, MenuSideAnchor } from '../types';
import {
  createAnimationFrameController,
  getMenuOpenScrollPlan,
  getViewportMenuLayout,
  isAnchorVisibleWithinViewport,
  type VisibleBounds,
} from '../utils/chatViewportMenu';

interface UseChatViewportMenuProps {
  getVisibleMessagesBounds: () => VisibleBounds | null;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
}

const animationFrameController = createAnimationFrameController();

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

  const menuTransitionSourceTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const pendingMenuRepositionAnimationFrameRef = useRef<number | null>(null);
  const menuOpenScrollAnimationFrameRef = useRef<number | null>(null);
  const openMenuMessageIdRef = useRef<string | null>(null);
  const openMenuAnchorRef = useRef<HTMLElement | null>(null);
  const openMenuPreferredSideRef = useRef<'left' | 'right'>('left');
  const lockedMenuLayoutRef = useRef<{ messageId: string } | null>(null);

  const cancelNextFrame = useCallback((frameId: number) => {
    animationFrameController.cancel(frameId);
  }, []);

  const requestNextFrame = useCallback((callback: FrameRequestCallback) => {
    return animationFrameController.request(callback);
  }, []);

  const getMenuLayout = useCallback(
    (anchorRect: DOMRect, preferredSide: 'left' | 'right') =>
      getViewportMenuLayout({
        anchorRect,
        bounds: getVisibleMessagesBounds(),
        preferredSide,
      }),
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
    (
      container: HTMLDivElement,
      targetScrollTop: number,
      onComplete?: () => void
    ) => {
      const startScrollTop = container.scrollTop;
      const distance = targetScrollTop - startScrollTop;

      if (Math.abs(distance) < 0.5) {
        container.scrollTop = targetScrollTop;
        onComplete?.();
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
        onComplete?.();
      };

      menuOpenScrollAnimationFrameRef.current = requestNextFrame(step);
    },
    [cancelMenuOpenScrollAnimation, requestNextFrame]
  );

  const getMenuOpenScrollPlanForAnchor = useCallback(
    (anchorRect: DOMRect) =>
      getMenuOpenScrollPlan({
        anchorRect,
        bounds: getVisibleMessagesBounds(),
        container: messagesContainerRef.current,
      }),
    [getVisibleMessagesBounds, messagesContainerRef]
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
    openMenuMessageIdRef.current = null;
    openMenuAnchorRef.current = null;
    lockedMenuLayoutRef.current = null;
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

      const nextMenuLayout = getViewportMenuLayout({
        anchorRect,
        bounds,
        preferredSide,
      });

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
    [closeMessageMenu, getVisibleMessagesBounds]
  );

  const requestOpenMenuReposition = useCallback(() => {
    if (pendingMenuRepositionAnimationFrameRef.current !== null) {
      return;
    }

    pendingMenuRepositionAnimationFrameRef.current = requestNextFrame(() => {
      pendingMenuRepositionAnimationFrameRef.current = null;

      const nextOpenMenuMessageId = openMenuMessageIdRef.current;
      if (!nextOpenMenuMessageId) {
        return;
      }

      if (lockedMenuLayoutRef.current?.messageId === nextOpenMenuMessageId) {
        return;
      }

      const anchor = openMenuAnchorRef.current;
      if (!anchor || !anchor.isConnected) {
        closeMessageMenu();
        return;
      }

      syncOpenMenuLayout(anchor, openMenuPreferredSideRef.current);
    });
  }, [closeMessageMenu, requestNextFrame, syncOpenMenuLayout]);

  const applyMenuTransitionSource = useCallback(
    (previousMessageId: string | null) => {
      if (
        previousMessageId === null ||
        previousMessageId === openMenuMessageIdRef.current
      ) {
        setMenuTransitionSourceId(null);
        return;
      }

      setMenuTransitionSourceId(previousMessageId);
      menuTransitionSourceTimeoutRef.current = setTimeout(() => {
        setMenuTransitionSourceId(null);
        menuTransitionSourceTimeoutRef.current = null;
      }, 220);
    },
    []
  );

  const openMenuAtAnchor = useCallback(
    (
      anchor: HTMLElement,
      messageId: string,
      preferredSide: 'left' | 'right',
      shouldAnimateOpen: boolean
    ) => {
      const nextMenuLayout = getMenuLayout(
        anchor.getBoundingClientRect(),
        preferredSide
      );

      setMenuOffsetX(0);
      setMenuPlacement(nextMenuLayout.placement);
      setMenuSideAnchor(nextMenuLayout.sideAnchor);
      setShouldAnimateMenuOpen(shouldAnimateOpen);
      setOpenMenuMessageId(messageId);
    },
    [getMenuLayout]
  );

  const toggleMessageMenu = useCallback(
    (
      anchor: HTMLElement,
      messageId: string,
      preferredSide: 'left' | 'right'
    ) => {
      const currentOpenMenuMessageId = openMenuMessageIdRef.current;

      if (currentOpenMenuMessageId === messageId) {
        closeMessageMenu();
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const menuOpenScrollPlan = getMenuOpenScrollPlanForAnchor(anchorRect);
      const isSwitchingMenuMessage =
        currentOpenMenuMessageId !== null &&
        currentOpenMenuMessageId !== messageId;

      if (menuTransitionSourceTimeoutRef.current) {
        clearTimeout(menuTransitionSourceTimeoutRef.current);
        menuTransitionSourceTimeoutRef.current = null;
      }
      if (pendingMenuRepositionAnimationFrameRef.current !== null) {
        cancelNextFrame(pendingMenuRepositionAnimationFrameRef.current);
        pendingMenuRepositionAnimationFrameRef.current = null;
      }

      openMenuMessageIdRef.current = messageId;
      openMenuAnchorRef.current = anchor;
      openMenuPreferredSideRef.current = preferredSide;
      applyMenuTransitionSource(currentOpenMenuMessageId);

      if (menuOpenScrollPlan) {
        const container = messagesContainerRef.current;
        if (container) {
          lockedMenuLayoutRef.current = {
            messageId,
          };
          setOpenMenuMessageId(null);
          setMenuOffsetX(0);
          animateMenuOpenScroll(
            container,
            menuOpenScrollPlan.targetScrollTop,
            () => {
              if (openMenuMessageIdRef.current !== messageId) {
                return;
              }

              lockedMenuLayoutRef.current = null;

              const currentAnchor = openMenuAnchorRef.current;
              if (!currentAnchor || !currentAnchor.isConnected) {
                closeMessageMenu();
                return;
              }

              syncOpenMenuLayout(
                currentAnchor,
                openMenuPreferredSideRef.current
              );
              openMenuAtAnchor(
                currentAnchor,
                messageId,
                openMenuPreferredSideRef.current,
                !isSwitchingMenuMessage
              );
            }
          );
        }
      } else {
        lockedMenuLayoutRef.current = null;
        openMenuAtAnchor(
          anchor,
          messageId,
          preferredSide,
          !isSwitchingMenuMessage
        );
      }
    },
    [
      applyMenuTransitionSource,
      animateMenuOpenScroll,
      cancelNextFrame,
      closeMessageMenu,
      getMenuOpenScrollPlanForAnchor,
      messagesContainerRef,
      openMenuAtAnchor,
      syncOpenMenuLayout,
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

      let anchorRect: DOMRect | null = null;
      const anchor = openMenuAnchorRef.current;
      if (anchor) {
        anchorRect = anchor.getBoundingClientRect();
        if (!isAnchorVisibleWithinViewport(bounds, anchorRect)) {
          closeMessageMenu();
          return;
        }
      }

      const { containerRect } = bounds;
      const menuRect = menuElement.getBoundingClientRect();
      const minVisibleTop =
        containerRect.top + CHAT_HEADER_OVERLAY_HEIGHT + MENU_GAP;
      const maxVisibleBottom = bounds.visibleBottom - MENU_GAP;
      const isClippedByHeader = menuRect.top < minVisibleTop;
      const isClippedByComposer = menuRect.bottom > maxVisibleBottom;

      if ((isClippedByHeader || isClippedByComposer) && anchorRect) {
        const nextPlacement: MenuPlacement =
          isClippedByHeader && isClippedByComposer
            ? anchorRect.top - minVisibleTop >=
              maxVisibleBottom - anchorRect.bottom
              ? 'down'
              : 'up'
            : isClippedByComposer
              ? 'down'
              : 'up';

        if (menuPlacement !== nextPlacement) {
          setMenuPlacement(nextPlacement);
          setMenuOffsetX(0);
          return;
        }
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
    [
      closeMessageMenu,
      getVisibleMessagesBounds,
      menuPlacement,
      messagesContainerRef,
    ]
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
