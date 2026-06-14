import { AnimatePresence, motion } from 'motion/react';
import { TbChevronDown } from 'react-icons/tb';
import { Link } from 'react-router-dom';
import {
  ITEM_MASTER_PATH,
  MENU_ICON_CLASS_NAME,
  SUBMENU_ITEM_HEIGHT,
} from './constants';
import { submenuContainerVariants, submenuItemVariants } from './motionConfig';
import { getActiveSubmenuIndex, isSubmenuItemActive } from './navigation';
import SidebarMenuLabel from './SidebarMenuLabel';
import {
  getMenuButtonClassName,
  menuButtonStyle,
  submenuLinkColors,
} from './styles';
import type { MenuGroup, SidebarHoverTarget } from './types';

interface SidebarMenuGroupProps {
  clearHighlightClearTimeout: () => void;
  group: MenuGroup;
  handleMenuMouseEnter: (menuKey: string) => void;
  highlightedSidebarItem: SidebarHoverTarget | null;
  isMenuActive: boolean;
  isVisuallyCollapsed: boolean;
  isOpen: boolean;
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

const SidebarMenuGroup = ({
  clearHighlightClearTimeout,
  group,
  handleMenuMouseEnter,
  highlightedSidebarItem,
  isMenuActive,
  isVisuallyCollapsed,
  isOpen,
  pathname,
  scheduleHoveredSidebarClear,
  setHoveredSidebarTarget,
  setSidebarItemRef,
  showExpandedContent,
  toggleMenu,
}: SidebarMenuGroupProps) => {
  const menuKey = group.key;
  const activeChildIndex = getActiveSubmenuIndex(pathname, group.children);
  const isHoveredMenu =
    highlightedSidebarItem?.type === 'menu' &&
    highlightedSidebarItem.menuKey === group.key;
  const isHighlightedMenu =
    isHoveredMenu ||
    (!highlightedSidebarItem && isMenuActive && activeChildIndex === -1);
  const menuButtonClassName = getMenuButtonClassName({
    isActive: isMenuActive,
    isHighlighted: isHighlightedMenu,
  });

  return (
    <div
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
        aria-expanded={showExpandedContent && isOpen}
        className={menuButtonClassName}
        style={menuButtonStyle}
      >
        <SidebarMenuLabel
          collapsed={isVisuallyCollapsed}
          icon={group.icon}
          name={group.name}
        />

        {showExpandedContent ? (
          <motion.div
            animate={{
              rotate: isOpen ? 180 : 0,
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative z-10"
          >
            <TbChevronDown className={MENU_ICON_CLASS_NAME} />
          </motion.div>
        ) : null}
      </button>

      <AnimatePresence initial={false}>
        {showExpandedContent && isOpen ? (
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
                    layoutId={`active-submenu-indicator-${group.key}`}
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

              {group.children.map((child, childIndex) => {
                const isActiveChild = isSubmenuItemActive(pathname, child.path);
                const isHoveredChild =
                  highlightedSidebarItem?.type === 'submenu' &&
                  highlightedSidebarItem.menuKey === group.key &&
                  highlightedSidebarItem.index === childIndex;
                const isHighlightedChild =
                  isHoveredChild || (!highlightedSidebarItem && isActiveChild);

                return (
                  <div
                    ref={element => {
                      setSidebarItemRef(
                        {
                          type: 'submenu',
                          menuKey: group.key,
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
                        menuKey: group.key,
                        index: childIndex,
                      });
                    }}
                    onFocus={() => {
                      setHoveredSidebarTarget({
                        type: 'submenu',
                        menuKey: group.key,
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
                            pathname.startsWith(ITEM_MASTER_PATH + '/')
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
};

export default SidebarMenuGroup;
