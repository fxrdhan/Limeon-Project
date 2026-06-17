const SIDEBAR_LOCK_STORAGE_KEY = 'pharmasys.sidebar.locked';

const getLocalStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
};

export const readInitialSidebarLocked = () => {
  try {
    return getLocalStorage()?.getItem(SIDEBAR_LOCK_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const writeSidebarLockedState = (isLocked: boolean) => {
  try {
    getLocalStorage()?.setItem(SIDEBAR_LOCK_STORAGE_KEY, String(isLocked));
  } catch {
    // Keep sidebar interactions usable when storage is unavailable.
  }
};

export { SIDEBAR_LOCK_STORAGE_KEY };
