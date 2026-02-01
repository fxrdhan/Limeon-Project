import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveGridState,
  autoSaveGridState,
  restoreGridState,
  clearGridState,
  hasSavedState,
  loadSavedStateForInit,
  getSavedStateInfo,
  clearAllGridStates,
} from './gridStateManager';
import { mockSessionStorage } from '@/test/utils/testHelpers';

const toastError = vi.hoisted(() => vi.fn());

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastError,
  },
}));

describe('gridStateManager', () => {
  beforeEach(() => {
    mockSessionStorage();
    toastError.mockReset();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
  });

  it('returns false when grid is destroyed', () => {
    const gridApi = {
      isDestroyed: () => true,
      getState: vi.fn(),
      setState: vi.fn(),
      autoSizeAllColumns: vi.fn(),
    } as const;

    expect(saveGridState(gridApi, 'items')).toBe(false);
    expect(autoSaveGridState(gridApi, 'items')).toBe(false);
    expect(restoreGridState(gridApi, 'items')).toBe(false);
    expect(toastError).toHaveBeenCalled();
  });

  it('saves and restores grid state', () => {
    const gridApi = {
      isDestroyed: () => false,
      getState: vi.fn(() => ({ columnSizing: { columnSizingModel: [] } })),
      setState: vi.fn(),
      autoSizeAllColumns: vi.fn(),
    } as const;

    expect(saveGridState(gridApi, 'items')).toBe(true);
    expect(hasSavedState('items')).toBe(true);
    expect(restoreGridState(gridApi, 'items')).toBe(true);
    expect(gridApi.setState).toHaveBeenCalled();
    expect(gridApi.autoSizeAllColumns).toHaveBeenCalled();
  });

  it('handles invalid saved state strings', () => {
    sessionStorage.setItem('grid_state_items', 'undefined');
    const gridApi = {
      isDestroyed: () => false,
      getState: vi.fn(),
      setState: vi.fn(),
      autoSizeAllColumns: vi.fn(),
    } as const;

    expect(restoreGridState(gridApi, 'items')).toBe(false);
    expect(sessionStorage.getItem('grid_state_items')).toBeNull();
  });

  it('returns false when no saved state is found', () => {
    const gridApi = {
      isDestroyed: () => false,
      getState: vi.fn(),
      setState: vi.fn(),
      autoSizeAllColumns: vi.fn(),
    } as const;

    expect(restoreGridState(gridApi, 'items')).toBe(false);
  });

  it('handles corrupted saved state JSON', () => {
    sessionStorage.setItem('grid_state_items', '{');
    const gridApi = {
      isDestroyed: () => false,
      getState: vi.fn(),
      setState: vi.fn(),
      autoSizeAllColumns: vi.fn(),
    } as const;

    expect(restoreGridState(gridApi, 'items')).toBe(false);
    expect(sessionStorage.getItem('grid_state_items')).toBeNull();
    expect(toastError).toHaveBeenCalled();
  });

  it('clears saved state', () => {
    sessionStorage.setItem('grid_state_items', 'data');
    expect(clearGridState('items')).toBe(true);
    expect(hasSavedState('items')).toBe(false);
  });

  it('handles save and autosave exceptions', () => {
    const gridApi = {
      isDestroyed: () => false,
      getState: vi.fn(() => ({ columnSizing: { columnSizingModel: [] } })),
      setState: vi.fn(),
      autoSizeAllColumns: vi.fn(),
    } as const;

    (
      sessionStorage.setItem as unknown as ReturnType<typeof vi.fn>
    ).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(saveGridState(gridApi, 'items')).toBe(false);

    (
      sessionStorage.setItem as unknown as ReturnType<typeof vi.fn>
    ).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(autoSaveGridState(gridApi, 'items')).toBe(false);
  });

  it('loads saved state for init', () => {
    sessionStorage.setItem(
      'grid_state_items',
      JSON.stringify({ columnSizing: {} })
    );
    expect(loadSavedStateForInit('items')).toEqual({ columnSizing: {} });

    sessionStorage.setItem('grid_state_items', 'undefined');
    expect(loadSavedStateForInit('items')).toBeUndefined();

    sessionStorage.setItem('grid_state_items', '{');
    expect(loadSavedStateForInit('items')).toBeUndefined();
  });

  it('returns undefined when init state missing', () => {
    sessionStorage.removeItem('grid_state_items');
    expect(loadSavedStateForInit('items')).toBeUndefined();
  });

  it('handles load saved state exceptions', () => {
    const original = Object.getOwnPropertyDescriptor(
      globalThis,
      'sessionStorage'
    );
    Object.defineProperty(globalThis, 'sessionStorage', {
      get() {
        throw new Error('boom');
      },
      configurable: true,
    });

    expect(loadSavedStateForInit('items')).toBeUndefined();

    if (original) {
      Object.defineProperty(globalThis, 'sessionStorage', original);
    }
  });

  it('gets saved state info and handles invalid data', () => {
    sessionStorage.setItem(
      'grid_state_items',
      JSON.stringify({ columnSizing: {} })
    );
    expect(getSavedStateInfo('items')).toEqual({ columnSizing: {} });

    sessionStorage.setItem('grid_state_items', 'null');
    expect(getSavedStateInfo('items')).toBeNull();

    sessionStorage.setItem('grid_state_items', '{');
    expect(getSavedStateInfo('items')).toBeNull();
  });

  it('handles get saved state info exceptions', () => {
    const original = Object.getOwnPropertyDescriptor(
      globalThis,
      'sessionStorage'
    );
    Object.defineProperty(globalThis, 'sessionStorage', {
      get() {
        throw new Error('boom');
      },
      configurable: true,
    });

    expect(getSavedStateInfo('items')).toBeNull();

    if (original) {
      Object.defineProperty(globalThis, 'sessionStorage', original);
    }
  });

  it('clears all grid states', () => {
    sessionStorage.setItem('grid_state_items', 'data');
    expect(clearAllGridStates()).toBe(true);
  });

  it('handles restore exceptions', () => {
    sessionStorage.setItem(
      'grid_state_items',
      JSON.stringify({ columnSizing: {} })
    );
    const gridApi = {
      isDestroyed: () => false,
      getState: vi.fn(),
      setState: vi.fn(() => {
        throw new Error('boom');
      }),
      autoSizeAllColumns: vi.fn(),
    } as const;

    expect(restoreGridState(gridApi, 'items')).toBe(false);
  });

  it('handles hasSavedState exceptions', () => {
    const original = Object.getOwnPropertyDescriptor(
      globalThis,
      'sessionStorage'
    );
    Object.defineProperty(globalThis, 'sessionStorage', {
      get() {
        throw new Error('boom');
      },
      configurable: true,
    });

    expect(hasSavedState('items')).toBe(false);

    if (original) {
      Object.defineProperty(globalThis, 'sessionStorage', original);
    }
  });

  it('skips autosize when column widths restored', () => {
    sessionStorage.setItem(
      'grid_state_items',
      JSON.stringify({
        columnSizing: { columnSizingModel: [{ colId: 'name', width: 120 }] },
      })
    );
    const gridApi = {
      isDestroyed: () => false,
      getState: vi.fn(),
      setState: vi.fn(),
      autoSizeAllColumns: vi.fn(),
    } as const;

    expect(restoreGridState(gridApi, 'items')).toBe(true);
    expect(gridApi.autoSizeAllColumns).not.toHaveBeenCalled();
  });

  it('autosizes when column sizing is missing', () => {
    sessionStorage.setItem('grid_state_items', JSON.stringify({}));
    const gridApi = {
      isDestroyed: () => false,
      getState: vi.fn(),
      setState: vi.fn(),
      autoSizeAllColumns: vi.fn(),
    } as const;

    expect(restoreGridState(gridApi, 'items')).toBe(true);
    expect(gridApi.autoSizeAllColumns).toHaveBeenCalled();
  });

  it('skips autosize when grid is destroyed during raf', () => {
    sessionStorage.setItem(
      'grid_state_items',
      JSON.stringify({ columnSizing: { columnSizingModel: [] } })
    );
    const isDestroyed = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const gridApi = {
      isDestroyed,
      getState: vi.fn(),
      setState: vi.fn(),
      autoSizeAllColumns: vi.fn(),
    } as const;

    expect(restoreGridState(gridApi, 'items')).toBe(true);
    expect(gridApi.autoSizeAllColumns).not.toHaveBeenCalled();
  });
});
