import { AnimatePresence, motion } from 'motion/react';
import { TbChevronDown } from 'react-icons/tb';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ITEM_MASTER_PATH,
  MENU_ICON_CLASS_NAME,
  SUBMENU_ITEM_HEIGHT,
} from './constants';
import { MENU_ITEMS } from './menu';
import {
  submenuContainerVariants,
  submenuItemVariants,
  sidebarBackgroundTransition,
} from './motionConfig';
import {
  getActiveSubmenuIndex,
  hasActiveChildRoute,
  isRouteActive,
  isSubmenuItemActive,
} from './navigation';
import { BrandTitle, LockToggleIcon } from './SidebarBrand';
import SidebarMenuLabel from './SidebarMenuLabel';
import {
  getMenuButtonClassName,
  menuButtonStyle,
  submenuLinkColors,
} from './styles';
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
  const navigate = useNavigate();
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
            const menuKey = item.key;
            const isMenuActive =
              isRouteActive(pathname, item.path) ||
              hasActiveChildRoute(pathname, item.children);

            if (item.children) {
              const children = item.children;
              const activeChildIndex = getActiveSubmenuIndex(
                pathname,
                children
              );
              const isHoveredMenu =
                highlightedSidebarItem?.type === 'menu' &&
                highlightedSidebarItem.menuKey === item.key;
              const isHighlightedMenu =
                isHoveredMenu ||
                (!highlightedSidebarItem &&
                  isMenuActive &&
                  activeChildIndex === -1);
              const menuButtonClassName = getMenuButtonClassName({
                isActive: isMenuActive,
                isHighlighted: isHighlightedMenu,
              });

              return (
                <div
                  key={item.key}
                  className="relative z-10"
                  onMouseLeave={() => {
                    scheduleHoveredSidebarClear(menuKey);
                  }}
                >
                  <button
                    ref={element => {
                      setSidebarItemRef({ type: 'menu', menuKey }, element);
                    }}
                    type="button"
                    onClick={() => toggleMenu(menuKey)}
                    onMouseEnter={() => {
                      setHoveredSidebarTarget({ type: 'menu', menuKey });
                      handleMenuMouseEnter(menuKey);
                    }}
                    onFocus={() => {
                      setHoveredSidebarTarget({ type: 'menu', menuKey });
                    }}
                    aria-expanded={showExpandedContent && openMenus[menuKey]}
                    className={menuButtonClassName}
                    style={menuButtonStyle}
                  >
                    <SidebarMenuLabel
                      collapsed={isVisuallyCollapsed}
                      icon={item.icon}
                      name={item.name}
                    />

                    {showExpandedContent ? (
                      <motion.div
                        animate={{
                          rotate: openMenus[menuKey] ? 180 : 0,
                        }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="relative z-10"
                      >
                        <TbChevronDown className={MENU_ICON_CLASS_NAME} />
                      </motion.div>
                    ) : null}
                  </button>

                  <AnimatePresence initial={false}>
                    {showExpandedContent && openMenus[menuKey] ? (
                      <motion.div
                        key="submenu-content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                          open: { opacity: 1, height: 'auto' },
                          collapsed: { opacity: 0, height: 0 },
                        }}
                        transition={{
                          duration: 0.4,
                          ease: 'easeInOut',
                        }}
                        onMouseEnter={() => {
                          clearHighlightClearTimeout();
                          handleMenuMouseEnter(menuKey);
                        }}
                        onMouseLeave={() => {
                          scheduleHoveredSidebarClear(menuKey);
                        }}
                        className="overflow-hidden"
                      >
                        <motion.div
                          variants={submenuContainerVariants}
                          className="relative py-2 pl-5 pr-4"
                        >
                          <div className="absolute bottom-2 left-5 top-2 z-10 w-0.5 bg-slate-300" />

                          <AnimatePresence>
                            {activeChildIndex !== -1 ? (
                              <motion.div
                                layoutId={`active-submenu-indicator-${item.key}`}
                                className="absolute z-20 w-0.5 bg-primary"
                                initial={{
                                  y: activeChildIndex * SUBMENU_ITEM_HEIGHT,
                                  height: SUBMENU_ITEM_HEIGHT,
                                  opacity: 0,
                                  scale: 0.8,
                                }}
                                animate={{
                                  y: activeChildIndex * SUBMENU_ITEM_HEIGHT,
                                  height: SUBMENU_ITEM_HEIGHT,
                                  opacity: 1,
                                  scale: 1,
                                }}
                                exit={{
                                  opacity: 0,
                                  scale: 0.8,
                                  transition: { duration: 0.2 },
                                }}
                                transition={{
                                  type: 'spring',
                                  stiffness: 300,
                                  damping: 30,
                                  mass: 0.8,
                                }}
                              />
                            ) : null}
                          </AnimatePresence>

                          {children.map((child, childIndex) => {
                            const isActiveChild = isSubmenuItemActive(
                              pathname,
                              child.path
                            );
                            const isHoveredChild =
                              highlightedSidebarItem?.type === 'submenu' &&
                              highlightedSidebarItem.menuKey === item.key &&
                              highlightedSidebarItem.index === childIndex;
                            const isHighlightedChild =
                              isHoveredChild ||
                              (!highlightedSidebarItem && isActiveChild);

                            return (
                              <div
                                ref={element => {
                                  setSidebarItemRef(
                                    {
                                      type: 'submenu',
                                      menuKey: item.key,
                                      index: childIndex,
                                    },
                                    element
                                  );
                                }}
                                key={child.path}
                                className="relative z-10"
                                style={{ height: SUBMENU_ITEM_HEIGHT }}
                                onMouseEnter={() => {
                                  setHoveredSidebarTarget({
                                    type: 'submenu',
                                    menuKey: item.key,
                                    index: childIndex,
                                  });
                                }}
                                onFocus={() => {
                                  setHoveredSidebarTarget({
                                    type: 'submenu',
                                    menuKey: item.key,
                                    index: childIndex,
                                  });
                                }}
                              >
                                <AnimatePresence>
                                  {isActiveChild ? (
                                    <motion.div
                                      className="absolute left-[-3px] top-5 z-30 h-2 w-2 -translate-y-0.5 rounded-full bg-primary"
                                      initial={{
                                        scale: 0,
                                        opacity: 0,
                                      }}
                                      animate={{
                                        scale: 1,
                                        opacity: 1,
                                      }}
                                      exit={{
                                        scale: 0,
                                        opacity: 0,
                                      }}
                                      transition={{
                                        type: 'spring',
                                        stiffness: 400,
                                        damping: 25,
                                        delay: 0.1,
                                      }}
                                    />
                                  ) : null}
                                </AnimatePresence>

                                <motion.div
                                  variants={submenuItemVariants}
                                  className="relative z-10"
                                >
                                  <Link
                                    to={child.path}
                                    onClick={event => {
                                      if (
                                        child.path === ITEM_MASTER_PATH &&
                                        pathname.startsWith(
                                          ITEM_MASTER_PATH + '/'
                                        )
                                      ) {
                                        event.preventDefault();
                                      }
                                    }}
                                    className={`block overflow-hidden text-ellipsis whitespace-nowrap rounded-xl px-6 py-3 text-sm transition-all duration-200 focus-visible:outline-hidden outline-hidden focus:outline-hidden active:outline-hidden ${
                                      isActiveChild || isHighlightedChild
                                        ? 'font-medium'
                                        : ''
                                    }`}
                                    style={{
                                      color:
                                        isActiveChild || isHighlightedChild
                                          ? submenuLinkColors.active
                                          : submenuLinkColors.inactive,
                                    }}
                                  >
                                    {child.name}
                                  </Link>
                                </motion.div>
                              </div>
                            );
                          })}
                        </motion.div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            }

            const isHoveredMenu =
              highlightedSidebarItem?.type === 'menu' &&
              highlightedSidebarItem.menuKey === item.key;
            const isHighlightedMenu =
              isHoveredMenu || (!highlightedSidebarItem && isMenuActive);
            const menuButtonClassName = getMenuButtonClassName({
              isActive: isMenuActive,
              isHighlighted: isHighlightedMenu,
            });

            return (
              <div key={item.key} className="relative z-10">
                <button
                  ref={element => {
                    setSidebarItemRef({ type: 'menu', menuKey }, element);
                  }}
                  type="button"
                  onClick={() => {
                    if (pathname !== item.path) {
                      void navigate(item.path);
                    }
                  }}
                  onMouseEnter={() => {
                    setHoveredSidebarTarget({ type: 'menu', menuKey });
                  }}
                  onMouseLeave={() => {
                    scheduleHoveredSidebarClear(menuKey);
                  }}
                  onFocus={() => {
                    setHoveredSidebarTarget({ type: 'menu', menuKey });
                  }}
                  className={menuButtonClassName}
                  style={menuButtonStyle}
                >
                  <SidebarMenuLabel
                    collapsed={isVisuallyCollapsed}
                    icon={item.icon}
                    name={item.name}
                  />
                </button>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-200 p-4 text-xs text-slate-500">
          <div className="h-4">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <AnimatePresence initial={false}>
                {showExpandedContent ? (
                  <motion.div
                    key="pharmasys-text"
                    initial={{ opacity: 0, width: 0, marginRight: 0 }}
                    animate={{
                      opacity: 1,
                      width: 'auto',
                      marginRight: '0.25em',
                    }}
                    exit={{ opacity: 0, width: 0, marginRight: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
                  >
                    PharmaSys
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <span>v2.3.0</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
