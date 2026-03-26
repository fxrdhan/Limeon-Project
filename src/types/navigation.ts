import { JSX } from 'react';

// Navigation and layout types
export interface NavbarProps {
  sidebarCollapsed: boolean;
}

export interface ChatTargetUser {
  id: string;
  name: string;
  email: string;
  profilephoto?: string | null;
  profilephoto_thumb?: string | null;
}

export interface SidebarProps {
  collapsed: boolean;
  isLocked: boolean;
  toggleLock: () => void;
  expandSidebar: () => void;
  collapseSidebar: () => void;
}

export interface MenuItem {
  name: string;
  path: string;
  icon: JSX.Element;
  children?: {
    name: string;
    path: string;
  }[];
}
