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

export const buildOpenMenusState = ({
  forceOpenMenuKey,
  manuallyClosedMenus,
  pathname,
}: {
  forceOpenMenuKey?: string;
  manuallyClosedMenus: Set<string>;
  pathname: string;
}) => {
  return Object.fromEntries(
    MENU_GROUPS.map(item => {
      const isMenuActive =
        isRouteActive(pathname, item.path) ||
        hasActiveChildRoute(pathname, item.children);

      return [
        item.key,
        item.key === forceOpenMenuKey ||
          (Boolean(isMenuActive) && !manuallyClosedMenus.has(item.key)),
      ] as const;
    })
  ) as Record<string, boolean>;
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
