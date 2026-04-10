import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { CHAT_HEADER_OVERLAY_HEIGHT, MENU_GAP } from '../constants';
import type {
  MenuPlacement,
  MenuSideAnchor,
  MenuVerticalAnchor,
} from '../types';
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

const getProjectedMenuRect = ({
  anchorRect,
  menuPlacement,
  menuSideAnchor,
  menuVerticalAnchor,
  menuOffsetX,
  menuWidth,
  menuHeight,
}: {
  anchorRect: DOMRect;
  menuPlacement: MenuPlacement;
  menuSideAnchor: MenuSideAnchor;
  menuVerticalAnchor: MenuVerticalAnchor;
  menuOffsetX: number;
  menuWidth: number;
  menuHeight: number;
}) => {
  let top = anchorRect.top;
  let left = anchorRect.left;

  if (menuPlacement === 'left' || menuPlacement === 'right') {
    top =
      menuSideAnchor === 'bottom'
        ? anchorRect.bottom - menuHeight
        : menuSideAnchor === 'top'
          ? anchorRect.top
          : anchorRect.top + (anchorRect.height - menuHeight) / 2;
    left =
      menuPlacement === 'left'
        ? anchorRect.left - MENU_GAP - menuWidth
        : anchorRect.right + MENU_GAP;
  } else {
    left =
      menuVerticalAnchor === 'right'
        ? anchorRect.right - menuWidth
        : anchorRect.left;
    top =
      menuPlacement === 'down'
        ? anchorRect.top - MENU_GAP - menuHeight
        : anchorRect.bottom + MENU_GAP;
  }

  left += menuOffsetX;

  return {
    top,
    bottom: top + menuHeight,
    left,
    right: left + menuWidth,
    width: menuWidth,
    height: menuHeight,
  };
};

const getVerticalMenuOverflow = ({
  rect,
  minVisibleTop,
  maxVisibleBottom,
}: {
  rect: Pick<DOMRect, 'top' | 'bottom'>;
  minVisibleTop: number;
  maxVisibleBottom: number;
}) =>
  Math.max(minVisibleTop - rect.top, 0) +
  Math.max(rect.bottom - maxVisibleBottom, 0);

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
  const [menuVerticalAnchor, setMenuVerticalAnchor] =
    useState<MenuVerticalAnchor>('left');
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
    setMenuVerticalAnchor('left');
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
      const nextMenuLayout = getViewportMenuLayout({
        anchorRect: anchor.getBoundingClientRect(),
        bounds: getVisibleMessagesBounds(),
        preferredSide,
      });

      setMenuOffsetX(0);
      setMenuVerticalAnchor('left');
      setMenuPlacement(nextMenuLayout.placement);
      setMenuSideAnchor(nextMenuLayout.sideAnchor);
      setShouldAnimateMenuOpen(shouldAnimateOpen);
      setOpenMenuMessageId(messageId);
    },
    [getVisibleMessagesBounds]
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
      const menuRoot =
        typeof document !== 'undefined'
          ? document
          : messagesContainerRef.current;
      if (!menuRoot) return;

      const menuElement = menuRoot.querySelector<HTMLElement>(
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
      const measuredMenuRect = menuElement.getBoundingClientRect();
      const menuWidth = menuElement.offsetWidth || measuredMenuRect.width;
      const menuHeight = menuElement.offsetHeight || measuredMenuRect.height;
      const menuRect =
        anchorRect !== null
          ? getProjectedMenuRect({
              anchorRect,
              menuPlacement,
              menuSideAnchor,
              menuVerticalAnchor,
              menuOffsetX,
              menuWidth,
              menuHeight,
            })
          : {
              top: measuredMenuRect.top,
              bottom: measuredMenuRect.bottom,
              left: measuredMenuRect.left,
              right: measuredMenuRect.right,
              width: measuredMenuRect.width,
              height: measuredMenuRect.height,
            };
      const minVisibleTop =
        containerRect.top + CHAT_HEADER_OVERLAY_HEIGHT + MENU_GAP;
      const maxVisibleBottom = bounds.visibleBottom - MENU_GAP;
      const currentVerticalOverflow = getVerticalMenuOverflow({
        rect: menuRect,
        minVisibleTop,
        maxVisibleBottom,
      });

      if (currentVerticalOverflow > 0 && anchorRect) {
        const upMenuRect = getProjectedMenuRect({
          anchorRect,
          menuPlacement: 'up',
          menuSideAnchor,
          menuVerticalAnchor,
          menuOffsetX,
          menuWidth,
          menuHeight,
        });
        const downMenuRect = getProjectedMenuRect({
          anchorRect,
          menuPlacement: 'down',
          menuSideAnchor,
          menuVerticalAnchor,
          menuOffsetX,
          menuWidth,
          menuHeight,
        });
        const upOverflow = getVerticalMenuOverflow({
          rect: upMenuRect,
          minVisibleTop,
          maxVisibleBottom,
        });
        const downOverflow = getVerticalMenuOverflow({
          rect: downMenuRect,
          minVisibleTop,
          maxVisibleBottom,
        });
        const nextPlacement: MenuPlacement =
          upOverflow <= downOverflow ? 'up' : 'down';

        if (
          menuPlacement !== nextPlacement &&
          Math.min(upOverflow, downOverflow) < currentVerticalOverflow
        ) {
          setMenuPlacement(nextPlacement);
          setMenuOffsetX(0);
          return;
        }
      }

      const minMenuLeft = containerRect.left + MENU_GAP;
      const maxMenuRight = containerRect.right - MENU_GAP;

      if (
        (menuPlacement === 'up' || menuPlacement === 'down') &&
        anchorRect !== null
      ) {
        const leftAnchoredOverflow =
          Math.max(minMenuLeft - anchorRect.left, 0) +
          Math.max(anchorRect.left + menuRect.width - maxMenuRight, 0);
        const rightAnchoredLeft = anchorRect.right - menuRect.width;
        const rightAnchoredOverflow =
          Math.max(minMenuLeft - rightAnchoredLeft, 0) +
          Math.max(anchorRect.right - maxMenuRight, 0);
        const nextVerticalAnchor: MenuVerticalAnchor =
          leftAnchoredOverflow <= rightAnchoredOverflow ? 'left' : 'right';

        if (menuVerticalAnchor !== nextVerticalAnchor) {
          setMenuVerticalAnchor(nextVerticalAnchor);
          setMenuOffsetX(0);
          return;
        }
      }

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
      menuOffsetX,
      getVisibleMessagesBounds,
      menuPlacement,
      menuSideAnchor,
      menuVerticalAnchor,
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
    menuVerticalAnchor,
    shouldAnimateMenuOpen,
    menuTransitionSourceId,
    menuOffsetX,
    closeMessageMenu,
    toggleMessageMenu,
  };
};
