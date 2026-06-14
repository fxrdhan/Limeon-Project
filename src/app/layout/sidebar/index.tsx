import { AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { BrandTitle, LockToggleIcon } from './SidebarBrand';
import SidebarFooter from './SidebarFooter';
import SidebarNavigation from './SidebarNavigation';
import type { SidebarProps } from './types';
import { useSidebarInteraction } from './useSidebarInteraction';

const Sidebar = ({
  collapsed,
  isLocked,
  toggleLock,
  expandSidebar,
  collapseSidebar,
}: SidebarProps) => {
  const { pathname } = useLocation();
  const {
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
  } = useSidebarInteraction({
    collapsed,
    collapseSidebar,
    expandSidebar,
    isLocked,
    pathname,
  });

  return (
    <aside
      onMouseEnter={handleMouseEnterSidebar}
      onMouseLeave={handleMouseLeaveSidebar}
      className={`sidebar relative z-10 h-screen overflow-x-hidden border-r border-slate-200 bg-white text-slate-800 transition-all duration-500 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center">
            <div className="flex h-10 w-10 min-w-8 shrink-0 items-center justify-center rounded-xl bg-primary">
              <span className="text-xl font-bold text-white">P</span>
            </div>
            <AnimatePresence initial={false}>
              {isVisuallyCollapsed ? null : <BrandTitle />}
            </AnimatePresence>
          </div>

          {showExpandedContent ? (
            <button
              type="button"
              onClick={toggleLock}
              className="relative cursor-pointer text-slate-400 transition-colors duration-150 hover:text-slate-600 focus:outline-hidden"
              title={isLocked ? 'Buka Kunci Sidebar' : 'Kunci Sidebar'}
              aria-label={isLocked ? 'Buka Kunci Sidebar' : 'Kunci Sidebar'}
            >
              <LockToggleIcon isLocked={isLocked} />
            </button>
          ) : null}
        </div>

        <SidebarNavigation
          clearHighlightClearTimeout={clearHighlightClearTimeout}
          handleMenuMouseEnter={handleMenuMouseEnter}
          highlightFrame={highlightFrame}
          highlightedSidebarItem={highlightedSidebarItem}
          isVisuallyCollapsed={isVisuallyCollapsed}
          navRef={navRef}
          openMenus={openMenus}
          pathname={pathname}
          scheduleHoveredSidebarClear={scheduleHoveredSidebarClear}
          setHoveredSidebarTarget={setHoveredSidebarTarget}
          setSidebarItemRef={setSidebarItemRef}
          showExpandedContent={showExpandedContent}
          toggleMenu={toggleMenu}
        />

        <SidebarFooter showExpandedContent={showExpandedContent} />
      </div>
    </aside>
  );
};

export default Sidebar;
