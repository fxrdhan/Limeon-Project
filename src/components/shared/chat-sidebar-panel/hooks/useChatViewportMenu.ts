import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { MENU_GAP, MENU_HEIGHT, MENU_WIDTH } from '../constants';
import type { MenuPlacement, MenuSideAnchor } from '../types';

type VisibleBounds = {
  containerRect: DOMRect;
  visibleBottom: number;
};

interface UseChatViewportMenuProps {
  getVisibleMessagesBounds: () => VisibleBounds | null;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
}

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

  const menuTransitionSourceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const closeMessageMenu = useCallback(() => {
    if (menuTransitionSourceTimeoutRef.current) {
      clearTimeout(menuTransitionSourceTimeoutRef.current);
      menuTransitionSourceTimeoutRef.current = null;
    }
    setOpenMenuMessageId(null);
    setMenuTransitionSourceId(null);
    setMenuOffsetX(0);
    setShouldAnimateMenuOpen(true);
  }, []);

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

      if (menuTransitionSourceTimeoutRef.current) {
        clearTimeout(menuTransitionSourceTimeoutRef.current);
        menuTransitionSourceTimeoutRef.current = null;
      }

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
    [closeMessageMenu, getMenuLayout, openMenuMessageId]
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

      const { containerRect, visibleBottom } = bounds;
      const menuRect = menuElement.getBoundingClientRect();

      let scrollOffset = 0;
      if (menuRect.top < containerRect.top) {
        scrollOffset = menuRect.top - containerRect.top - MENU_GAP;
      } else if (menuRect.bottom > visibleBottom) {
        scrollOffset = menuRect.bottom - visibleBottom + MENU_GAP;
      }

      if (scrollOffset !== 0) {
        container.scrollTo({
          top: container.scrollTop + scrollOffset,
          behavior: 'auto',
        });
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
    [getVisibleMessagesBounds, messagesContainerRef]
  );

  useLayoutEffect(() => {
    if (!openMenuMessageId) return;

    ensureMenuFullyVisible(openMenuMessageId);
  }, [
    ensureMenuFullyVisible,
    menuPlacement,
    menuSideAnchor,
    openMenuMessageId,
  ]);

  useLayoutEffect(() => {
    return () => {
      if (menuTransitionSourceTimeoutRef.current) {
        clearTimeout(menuTransitionSourceTimeoutRef.current);
        menuTransitionSourceTimeoutRef.current = null;
      }
    };
  }, []);

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
