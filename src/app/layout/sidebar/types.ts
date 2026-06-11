import type { IconType } from 'react-icons';

export type SubmenuItem = { name: string; path: string };

export type SidebarHoverTarget =
  | { type: 'menu'; menuKey: string }
  | { type: 'submenu'; menuKey: string; index: number };

export type SidebarHighlightFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
  isVisible: boolean;
  shouldAnimate: boolean;
};

export interface MenuItem {
  key: string;
  name: string;
  path: string;
  icon: IconType;
  children?: SubmenuItem[];
}

export type MenuGroup = MenuItem & { children: SubmenuItem[] };

export interface SidebarProps {
  collapsed: boolean;
  isLocked: boolean;
  toggleLock: () => void;
  expandSidebar: () => void;
  collapseSidebar: () => void;
}
