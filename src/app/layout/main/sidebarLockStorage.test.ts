import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  readInitialSidebarLocked,
  SIDEBAR_LOCK_STORAGE_KEY,
  writeSidebarLockedState,
} from './sidebarLockStorage';

const storagePrototype = Object.getPrototypeOf(window.localStorage) as Storage;
const getItemDescriptor = Object.getOwnPropertyDescriptor(
  storagePrototype,
  'getItem'
);
const setItemDescriptor = Object.getOwnPropertyDescriptor(
  storagePrototype,
  'setItem'
);

describe('sidebar lock storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    if (getItemDescriptor) {
      Object.defineProperty(storagePrototype, 'getItem', getItemDescriptor);
    }
    if (setItemDescriptor) {
      Object.defineProperty(storagePrototype, 'setItem', setItemDescriptor);
    }
    window.localStorage.clear();
  });

  it('reads and writes the sidebar lock state', () => {
    writeSidebarLockedState(true);

    expect(window.localStorage.getItem(SIDEBAR_LOCK_STORAGE_KEY)).toBe('true');
    expect(readInitialSidebarLocked()).toBe(true);

    writeSidebarLockedState(false);

    expect(window.localStorage.getItem(SIDEBAR_LOCK_STORAGE_KEY)).toBe('false');
    expect(readInitialSidebarLocked()).toBe(false);
  });

  it('falls back without throwing when localStorage is unavailable', () => {
    Object.defineProperty(storagePrototype, 'getItem', {
      configurable: true,
      value: () => {
        throw new Error('storage unavailable');
      },
    });
    Object.defineProperty(storagePrototype, 'setItem', {
      configurable: true,
      value: () => {
        throw new Error('storage unavailable');
      },
    });

    expect(readInitialSidebarLocked()).toBe(false);
    expect(() => writeSidebarLockedState(true)).not.toThrow();
  });
});
