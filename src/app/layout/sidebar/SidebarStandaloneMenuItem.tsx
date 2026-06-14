import { useNavigate } from 'react-router-dom';
import SidebarMenuLabel from './SidebarMenuLabel';
import { getMenuButtonClassName, menuButtonStyle } from './styles';
import type { MenuItem, SidebarHoverTarget } from './types';

interface SidebarStandaloneMenuItemProps {
  highlightedSidebarItem: SidebarHoverTarget | null;
  isMenuActive: boolean;
  isVisuallyCollapsed: boolean;
  item: MenuItem;
  pathname: string;
  scheduleHoveredSidebarClear: (menuKey?: string) => void;
  setHoveredSidebarTarget: (target: SidebarHoverTarget) => void;
  setSidebarItemRef: (
    target: SidebarHoverTarget,
    element: HTMLElement | null
  ) => void;
}

const SidebarStandaloneMenuItem = ({
  highlightedSidebarItem,
  isMenuActive,
  isVisuallyCollapsed,
  item,
  pathname,
  scheduleHoveredSidebarClear,
  setHoveredSidebarTarget,
  setSidebarItemRef,
}: SidebarStandaloneMenuItemProps) => {
  const navigate = useNavigate();
  const menuKey = item.key;
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
    <div className="relative z-10">
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
};

export default SidebarStandaloneMenuItem;
