import { describe, expect, it } from 'vite-plus/test';
import {
  buildClosedMenusState,
  buildOpenMenusState,
  isRouteActive,
} from './navigation';

describe('sidebar navigation state', () => {
  it('builds a closed menu state for every sidebar group', () => {
    expect(Object.values(buildClosedMenusState()).every(Boolean)).toBe(false);
  });

  it('opens the active route group unless it was manually closed', () => {
    expect(
      buildOpenMenusState({
        manuallyClosedMenus: new Set(),
        pathname: '/master-data/items/123',
      }).masterData
    ).toBe(true);

    expect(
      buildOpenMenusState({
        manuallyClosedMenus: new Set(['masterData']),
        pathname: '/master-data/items/123',
      }).masterData
    ).toBe(false);
  });

  it('forces a menu open independently from the current route', () => {
    expect(
      buildOpenMenusState({
        forceOpenMenuKey: 'reports',
        manuallyClosedMenus: new Set(),
        pathname: '/sales',
      }).reports
    ).toBe(true);
  });

  it('matches only the exact root path for dashboard', () => {
    expect(isRouteActive('/', '/')).toBe(true);
    expect(isRouteActive('/settings', '/')).toBe(false);
  });
});
