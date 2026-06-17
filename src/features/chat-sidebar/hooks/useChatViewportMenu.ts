import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
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
import {
  getMessageMenuElement,
  resolveVisibleMenuAdjustment,
} from './chat-viewport-menu/menuVisibility';
import { useMenuOpenScrollAnimation } from './chat-viewport-menu/useMenuOpenScrollAnimation';

interface UseChatViewportMenuProps {
  getVisibleMessagesBounds: () => VisibleBounds | null;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  resetKey?: string | null;
}

const animationFrameController = createAnimationFrameController();

export const useChatViewportMenu = ({
  getVisibleMessagesBounds,
  messagesContainerRef,
  resetKey,
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
  const [menuDimmingMessageId, setMenuDimmingMessageId] = useState<
    string | null
  >(null);
  const [menuTransitionSourceId, setMenuTransitionSourceId] = useState<
    string | null
  >(null);
  const [menuOffsetX, setMenuOffsetX] = useState(0);
  const [menuViewportTick, setMenuViewportTick] = useState(0);

  const menuTransitionSourceTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const pendingMenuRepositionAnimationFrameRef = useRef<number | null>(null);
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

  const { animateMenuOpenScroll, cancelMenuOpenScrollAnimation } =
    useMenuOpenScrollAnimation({
      cancelNextFrame,
      requestNextFrame,
    });

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
    setMenuDimmingMessageId(null);
    setMenuTransitionSourceId(null);
    setMenuOffsetX(0);
    setMenuVerticalAnchor('left');
    setShouldAnimateMenuOpen(true);
  }, [cancelMenuOpenScrollAnimation, cancelNextFrame]);

  useLayoutEffect(() => {
    closeMessageMenu();
  }, [closeMessageMenu, resetKey]);

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
      setMenuDimmingMessageId(messageId);
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
      setMenuDimmingMessageId(messageId);
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

      const menuElement = getMessageMenuElement(menuRoot, messageId);
      if (!menuElement) return;

      const bounds = getVisibleMessagesBounds();
      if (!bounds) return;

      const adjustment = resolveVisibleMenuAdjustment({
        menuElement,
        bounds,
        anchor: openMenuAnchorRef.current,
        menuPlacement,
        menuSideAnchor,
        menuVerticalAnchor,
        menuOffsetX,
      });

      if (adjustment.kind === 'close') {
        closeMessageMenu();
        return;
      }

      if (adjustment.kind === 'placement') {
        setMenuPlacement(adjustment.menuPlacement);
        setMenuOffsetX(0);
        return;
      }

      if (adjustment.kind === 'vertical-anchor') {
        setMenuVerticalAnchor(adjustment.menuVerticalAnchor);
        setMenuOffsetX(0);
        return;
      }

      setMenuOffsetX(previousOffset =>
        Math.abs(previousOffset - adjustment.menuOffsetX) < 0.5
          ? previousOffset
          : adjustment.menuOffsetX
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
      cancelMenuOpenScrollAnimation();
    };
  }, [cancelMenuOpenScrollAnimation, cancelNextFrame]);

  return {
    openMenuMessageId,
    menuPlacement,
    menuSideAnchor,
    menuVerticalAnchor,
    shouldAnimateMenuOpen,
    menuDimmingMessageId,
    menuTransitionSourceId,
    menuOffsetX,
    closeMessageMenu,
    toggleMessageMenu,
  };
};
