import { ITEM_MASTER_PATH } from './constants';
import { MENU_GROUPS } from './menu';
import type { SidebarHoverTarget, SubmenuItem } from './types';

export const getSidebarTargetId = (target: SidebarHoverTarget) =>
  target.type === 'menu'
    ? `menu:${target.menuKey}`
    : `submenu:${target.menuKey}:${target.index}`;

export const isRouteActive = (pathname: string, path: string) => {
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(path + '/');
};

export const hasActiveChildRoute = (
  pathname: string,
  children?: SubmenuItem[]
) => {
  if (!children) return false;

  const exactMatch = children.some(child => pathname === child.path);
  if (exactMatch) return true;

  return children.some(child => {
    if (child.path === ITEM_MASTER_PATH) {
      return pathname.startsWith(ITEM_MASTER_PATH);
    }

    return pathname.startsWith(child.path + '/');
  });
};

export const buildClosedMenusState = () => {
  const openMenus: Record<string, boolean> = {};

  MENU_GROUPS.forEach(item => {
    openMenus[item.key] = false;
  });

  return openMenus;
};

export const buildOpenMenusState = ({
  forceOpenMenuKey,
  manuallyClosedMenus,
  pathname,
}: {
  forceOpenMenuKey?: string;
  manuallyClosedMenus: Set<string>;
  pathname: string;
}) => {
  const openMenus: Record<string, boolean> = {};

  MENU_GROUPS.forEach(item => {
    const isMenuActive =
      isRouteActive(pathname, item.path) ||
      hasActiveChildRoute(pathname, item.children);

    openMenus[item.key] =
      item.key === forceOpenMenuKey ||
      (Boolean(isMenuActive) && !manuallyClosedMenus.has(item.key));
  });

  return openMenus;
};

export const isSubmenuItemActive = (pathname: string, childPath: string) => {
  if (childPath === ITEM_MASTER_PATH) {
    return pathname.startsWith(ITEM_MASTER_PATH);
  }

  return pathname === childPath;
};

export const getActiveSubmenuIndex = (
  pathname: string,
  children: SubmenuItem[]
) => children.findIndex(child => isSubmenuItemActive(pathname, child.path));
