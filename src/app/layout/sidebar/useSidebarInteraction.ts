import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  EXPANDED_CONTENT_DELAY_MS,
  HOVER_HIGHLIGHT_CLEAR_DELAY_MS,
  HOVER_HIGHLIGHT_LAYOUT_SYNC_MS,
} from './constants';
import { MENU_GROUPS } from './menu';
import {
  buildOpenMenusState,
  getSidebarTargetId,
  hasActiveChildRoute,
  isRouteActive,
} from './navigation';
import type { SidebarHighlightFrame, SidebarHoverTarget } from './types';

interface UseSidebarInteractionParams {
  collapsed: boolean;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  isLocked: boolean;
  pathname: string;
}

export const useSidebarInteraction = ({
  collapsed,
  collapseSidebar,
  expandSidebar,
  isLocked,
  pathname,
}: UseSidebarInteractionParams) => {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        MENU_GROUPS.map(item => [item.key, false] as const)
      ) as Record<string, boolean>
  );
  const [manuallyClosedMenus, setManuallyClosedMenus] = useState<Set<string>>(
    () => new Set()
  );
  const [hoveredSidebarItem, setHoveredSidebarItem] =
    useState<SidebarHoverTarget | null>(null);
  const [highlightFrame, setHighlightFrame] = useState<SidebarHighlightFrame>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    isVisible: false,
    shouldAnimate: false,
  });
  const [isExpandedContentReady, setIsExpandedContentReady] =
    useState(!collapsed);
  const navRef = useRef<HTMLElement | null>(null);
  const sidebarItemRefs = useRef(new Map<string, HTMLElement>());
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const highlightClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const showExpandedContent = !collapsed && isExpandedContentReady;
  const isVisuallyCollapsed = collapsed || !isExpandedContentReady;
  const highlightedSidebarItem = hoveredSidebarItem;
  const highlightedSidebarItemId = highlightedSidebarItem
    ? getSidebarTargetId(highlightedSidebarItem)
    : null;

  const setSidebarItemRef = useCallback(
    (target: SidebarHoverTarget, element: HTMLElement | null) => {
      const targetId = getSidebarTargetId(target);

      if (element) {
        sidebarItemRefs.current.set(targetId, element);
        return;
      }

      sidebarItemRefs.current.delete(targetId);
    },
    []
  );

  const clearHighlightClearTimeout = useCallback(() => {
    if (highlightClearTimeoutRef.current) {
      clearTimeout(highlightClearTimeoutRef.current);
      highlightClearTimeoutRef.current = null;
    }
  }, []);

  const setHoveredSidebarTarget = useCallback(
    (target: SidebarHoverTarget) => {
      clearHighlightClearTimeout();
      setHoveredSidebarItem(target);
    },
    [clearHighlightClearTimeout]
  );

  const scheduleHoveredSidebarClear = useCallback(
    (menuKey?: string) => {
      clearHighlightClearTimeout();

      highlightClearTimeoutRef.current = setTimeout(() => {
        setHoveredSidebarItem(currentItem => {
          if (menuKey && currentItem?.menuKey !== menuKey) {
            return currentItem;
          }

          return null;
        });
        highlightClearTimeoutRef.current = null;
      }, HOVER_HIGHLIGHT_CLEAR_DELAY_MS);
    },
    [clearHighlightClearTimeout]
  );

  const toggleMenu = useCallback(
    (menuKey: string) => {
      if (collapsed) {
        return;
      }

      const isCurrentlyOpen = Boolean(openMenus[menuKey]);
      setOpenMenus(prev => ({ ...prev, [menuKey]: !isCurrentlyOpen }));
      setManuallyClosedMenus(prevSet => {
        const next = new Set(prevSet);
        if (isCurrentlyOpen) {
          next.add(menuKey);
        } else {
          next.delete(menuKey);
        }
        return next;
      });
    },
    [collapsed, openMenus]
  );

  const handleMenuMouseEnter = useCallback(
    (menuKey: string) => {
      if (collapsed) {
        return;
      }

      if (menuHoverTimeoutRef.current) {
        clearTimeout(menuHoverTimeoutRef.current);
        menuHoverTimeoutRef.current = null;
      }

      const nextManuallyClosed = new Set(manuallyClosedMenus);
      nextManuallyClosed.delete(menuKey);
      setManuallyClosedMenus(nextManuallyClosed);

      setOpenMenus(
        buildOpenMenusState({
          forceOpenMenuKey: menuKey,
          manuallyClosedMenus: nextManuallyClosed,
          pathname,
        })
      );
    },
    [collapsed, manuallyClosedMenus, pathname]
  );

  const handleMouseEnterSidebar = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (menuHoverTimeoutRef.current) {
      clearTimeout(menuHoverTimeoutRef.current);
      menuHoverTimeoutRef.current = null;
    }

    clearHighlightClearTimeout();

    if (!isLocked && collapsed) {
      hoverTimeoutRef.current = setTimeout(() => {
        expandSidebar();
      }, 100);
    }
  }, [clearHighlightClearTimeout, collapsed, expandSidebar, isLocked]);

  const handleMouseLeaveSidebar = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (!isLocked && !collapsed) {
      collapseSidebar();
    }

    clearHighlightClearTimeout();
    setHoveredSidebarItem(null);

    if (!collapsed) {
      menuHoverTimeoutRef.current = setTimeout(() => {
        setOpenMenus(
          buildOpenMenusState({
            manuallyClosedMenus,
            pathname,
          })
        );
      }, 200);
    }
  }, [
    clearHighlightClearTimeout,
    collapseSidebar,
    collapsed,
    isLocked,
    manuallyClosedMenus,
    pathname,
  ]);

  useEffect(() => {
    if (collapsed) {
      const timeoutId = setTimeout(() => {
        setIsExpandedContentReady(false);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
      };
    }

    const timeoutId = setTimeout(() => {
      setIsExpandedContentReady(true);
    }, EXPANDED_CONTENT_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [collapsed]);

  useEffect(
    () => () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (menuHoverTimeoutRef.current) {
        clearTimeout(menuHoverTimeoutRef.current);
      }
      if (highlightClearTimeoutRef.current) {
        clearTimeout(highlightClearTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setManuallyClosedMenus(new Set());

      if (!collapsed) {
        setOpenMenus(prev => {
          const next = { ...prev };
          let hasChanges = false;

          MENU_GROUPS.forEach(item => {
            const shouldBeOpen =
              isRouteActive(pathname, item.path) ||
              hasActiveChildRoute(pathname, item.children);

            if (next[item.key] !== shouldBeOpen) {
              next[item.key] = shouldBeOpen;
              hasChanges = true;
            }
          });

          return hasChanges ? next : prev;
        });
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [collapsed, pathname]);

  useLayoutEffect(() => {
    const navElement = navRef.current;

    if (!navElement || !highlightedSidebarItemId) {
      setHighlightFrame(currentFrame =>
        currentFrame.isVisible
          ? { ...currentFrame, isVisible: false }
          : currentFrame
      );
      return;
    }

    const targetElement = sidebarItemRefs.current.get(highlightedSidebarItemId);

    if (!targetElement) {
      setHighlightFrame(currentFrame =>
        currentFrame.isVisible
          ? { ...currentFrame, isVisible: false }
          : currentFrame
      );
      return;
    }

    const updateHighlightFrame = () => {
      const navRect = navElement.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();

      setHighlightFrame(currentFrame => ({
        left: targetRect.left - navRect.left + navElement.scrollLeft,
        top: targetRect.top - navRect.top + navElement.scrollTop,
        width: targetRect.width,
        height: targetRect.height,
        isVisible: true,
        shouldAnimate: currentFrame.isVisible,
      }));
    };

    let animationFrameId: number | null = null;
    const syncStartTime = performance.now();
    const syncHighlightFrame = () => {
      updateHighlightFrame();

      if (performance.now() - syncStartTime < HOVER_HIGHLIGHT_LAYOUT_SYNC_MS) {
        animationFrameId = requestAnimationFrame(syncHighlightFrame);
      }
    };

    syncHighlightFrame();
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateHighlightFrame);

    resizeObserver?.observe(navElement);
    resizeObserver?.observe(targetElement);
    window.addEventListener('resize', updateHighlightFrame);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateHighlightFrame);
    };
  }, [highlightedSidebarItemId, openMenus, showExpandedContent]);

  return {
    clearHighlightClearTimeout,
    handleMenuMouseEnter,
    handleMouseEnterSidebar,
    handleMouseLeaveSidebar,
    highlightFrame,
    highlightedSidebarItem,
    isVisuallyCollapsed,
    navRef,
    openMenus,
    scheduleHoveredSidebarClear,
    setHoveredSidebarTarget,
    setSidebarItemRef,
    showExpandedContent,
    toggleMenu,
  };
};
