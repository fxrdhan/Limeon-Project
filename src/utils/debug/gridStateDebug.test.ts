import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllGridStates,
  compareGridStates,
  disableGridDebug,
  enableGridDebug,
  exportGridStates,
  inspectAllGridStates,
  isDebugEnabled,
  logAutoSave,
  logRestoration,
  logTabSwitch,
} from './gridStateDebug';

describe('gridStateDebug utilities', () => {
  beforeEach(() => {
    sessionStorage.clear();
    disableGridDebug();
    vi.restoreAllMocks();
  });

  it('toggles debug mode and emits debug logs', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logSpy.mockClear();

    expect(isDebugEnabled()).toBe(false);

    logAutoSave('items', false, [{ colId: 'name', width: 180 }]);
    expect(logSpy).not.toHaveBeenCalled();

    enableGridDebug();
    expect(isDebugEnabled()).toBe(true);

    logAutoSave('items', false, [{ colId: 'name', width: 180 }]);
    logAutoSave('items', true, [{ colId: 'name', width: 180 }]);
    logRestoration('items', 'start', { reason: 'manual' });
    logRestoration('items', 'end');
    logTabSwitch('items', 'categories', 2);

    expect(logSpy).toHaveBeenCalled();
    disableGridDebug();
    expect(isDebugEnabled()).toBe(false);
  });

  it('inspects all grid states including empty, valid and corrupted state', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const groupEndSpy = vi
      .spyOn(console, 'groupEnd')
      .mockImplementation(() => {});

    inspectAllGridStates();
    expect(logSpy).toHaveBeenCalledWith('No grid states found');

    sessionStorage.setItem(
      'grid_state_items',
      JSON.stringify({
        version: 1,
        columnSizing: {
          columnSizingModel: [{ colId: 'name', width: 200 }],
        },
        pagination: { page: 2 },
        sideBar: { visible: true },
      })
    );
    sessionStorage.setItem('grid_state_corrupt', '{invalid-json');

    inspectAllGridStates();

    expect(groupSpy).toHaveBeenCalled();
    expect(groupEndSpy).toHaveBeenCalled();
  });

  it('compares and clears grid states', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    compareGridStates(
      'items',
      JSON.stringify({
        columnSizing: {
          columnSizingModel: [{ colId: 'name', width: 100 }],
        },
        pagination: { page: 1 },
        sideBar: { hidden: true },
      }),
      JSON.stringify({
        columnSizing: {
          columnSizingModel: [{ colId: 'name', width: 180 }],
        },
        pagination: { page: 2 },
        sideBar: { hidden: false },
      })
    );

    expect(logSpy).toHaveBeenCalled();

    compareGridStates('items', '{bad', '{also-bad}');
    expect(errorSpy).toHaveBeenCalled();

    sessionStorage.setItem('grid_state_items', '{}');
    sessionStorage.setItem('grid_state_categories', '{}');
    clearAllGridStates();

    expect(sessionStorage.getItem('grid_state_items')).toBeNull();
    expect(sessionStorage.getItem('grid_state_categories')).toBeNull();
  });

  it('exports grid states as downloadable JSON and exposes window helpers', () => {
    const originalCreateElement = document.createElement.bind(document);
    const createObjectURLMock = vi.fn(() => 'blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    const clickMock = vi.fn();
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return {
            href: '',
            download: '',
            click: clickMock,
          } as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tagName);
      });
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURLMock,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURLMock,
      configurable: true,
    });

    sessionStorage.setItem('grid_state_items', JSON.stringify({ foo: 'bar' }));
    sessionStorage.setItem('grid_state_invalid', '{broken-json');

    exportGridStates();

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');

    expect(
      (window as Window & { gridDebug?: unknown }).gridDebug
    ).toBeDefined();
  });
});
