import { motion } from 'motion/react';
import type { RefObject } from 'react';
import { MENU_ITEMS } from './menu';
import { sidebarBackgroundTransition } from './motionConfig';
import { hasActiveChildRoute, isRouteActive } from './navigation';
import SidebarMenuGroup from './SidebarMenuGroup';
import SidebarStandaloneMenuItem from './SidebarStandaloneMenuItem';
import type {
  MenuGroup,
  MenuItem,
  SidebarHighlightFrame,
  SidebarHoverTarget,
} from './types';

interface SidebarNavigationProps {
  clearHighlightClearTimeout: () => void;
  handleMenuMouseEnter: (menuKey: string) => void;
  highlightFrame: SidebarHighlightFrame;
  highlightedSidebarItem: SidebarHoverTarget | null;
  isVisuallyCollapsed: boolean;
  navRef: RefObject<HTMLElement | null>;
  openMenus: Record<string, boolean>;
  pathname: string;
  scheduleHoveredSidebarClear: (menuKey?: string) => void;
  setHoveredSidebarTarget: (target: SidebarHoverTarget) => void;
  setSidebarItemRef: (
    target: SidebarHoverTarget,
    element: HTMLElement | null
  ) => void;
  showExpandedContent: boolean;
  toggleMenu: (menuKey: string) => void;
}

const isMenuGroup = (item: MenuItem): item is MenuGroup =>
  Boolean(item.children);

const SidebarNavigation = ({
  clearHighlightClearTimeout,
  handleMenuMouseEnter,
  highlightFrame,
  highlightedSidebarItem,
  isVisuallyCollapsed,
  navRef,
  openMenus,
  pathname,
  scheduleHoveredSidebarClear,
  setHoveredSidebarTarget,
  setSidebarItemRef,
  showExpandedContent,
  toggleMenu,
}: SidebarNavigationProps) => {
  return (
    <nav
      ref={navRef}
      className="relative grow overflow-y-auto px-4 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      <motion.div
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 z-0 bg-primary/10 ${
          highlightedSidebarItem?.type === 'submenu'
            ? 'rounded-r-xl'
            : 'rounded-xl'
        }`}
        initial={false}
        animate={{
          opacity: highlightFrame.isVisible ? 1 : 0,
          x: highlightFrame.left,
          y: highlightFrame.top,
          width: highlightFrame.width,
          height: highlightFrame.height,
        }}
        transition={
          highlightFrame.shouldAnimate
            ? sidebarBackgroundTransition
            : { duration: 0 }
        }
      />
      {MENU_ITEMS.map(item => {
        const isMenuActive =
          isRouteActive(pathname, item.path) ||
          hasActiveChildRoute(pathname, item.children);

        if (isMenuGroup(item)) {
          return (
            <SidebarMenuGroup
              key={item.key}
              clearHighlightClearTimeout={clearHighlightClearTimeout}
              group={item}
              handleMenuMouseEnter={handleMenuMouseEnter}
              highlightedSidebarItem={highlightedSidebarItem}
              isMenuActive={isMenuActive}
              isOpen={Boolean(openMenus[item.key])}
              isVisuallyCollapsed={isVisuallyCollapsed}
              pathname={pathname}
              scheduleHoveredSidebarClear={scheduleHoveredSidebarClear}
              setHoveredSidebarTarget={setHoveredSidebarTarget}
              setSidebarItemRef={setSidebarItemRef}
              showExpandedContent={showExpandedContent}
              toggleMenu={toggleMenu}
            />
          );
        }

        return (
          <SidebarStandaloneMenuItem
            key={item.key}
            highlightedSidebarItem={highlightedSidebarItem}
            isMenuActive={isMenuActive}
            isVisuallyCollapsed={isVisuallyCollapsed}
            item={item}
            pathname={pathname}
            scheduleHoveredSidebarClear={scheduleHoveredSidebarClear}
            setHoveredSidebarTarget={setHoveredSidebarTarget}
            setSidebarItemRef={setSidebarItemRef}
          />
        );
      })}
    </nav>
  );
};

export default SidebarNavigation;
