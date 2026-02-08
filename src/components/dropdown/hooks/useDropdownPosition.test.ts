import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDropdownPosition } from './useDropdownPosition';

type RectOptions = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const createButton = ({ top, left, width, height }: RectOptions) => {
  const button = document.createElement('button');
  Object.defineProperty(button, 'getBoundingClientRect', {
    value: () => ({
      top,
      left,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }),
  });
  return button;
};

const createMenu = (scrollHeight: number) => {
  const menu = document.createElement('div');
  Object.defineProperty(menu, 'scrollHeight', {
    value: scrollHeight,
    configurable: true,
  });
  return menu;
};

describe('useDropdownPosition', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      return window.setTimeout(() => cb(0), 0);
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(handle => {
      window.clearTimeout(handle);
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 900,
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', {
      value: 1200,
      configurable: true,
    });
  });

  it('calculates default down placement with auto width', async () => {
    const button = createButton({
      top: 120,
      left: 400,
      width: 200,
      height: 40,
    });
    const menu = createMenu(180);

    const { result } = renderHook(() =>
      useDropdownPosition(
        true,
        { current: button },
        { current: menu },
        'auto',
        'auto',
        'right',
        [{ id: '1', name: 'Paracetamol' }]
      )
    );

    await waitFor(() => {
      expect(result.current.isPositionReady).toBe(true);
    });

    expect(result.current.dropDirection).toBe('down');
    expect(result.current.portalStyle.position).toBe('fixed');
    expect(result.current.portalStyle.width).toBe('200px');
  });

  it('supports forced top position and custom numeric width', async () => {
    const button = createButton({
      top: 700,
      left: 500,
      width: 220,
      height: 40,
    });
    const menu = createMenu(260);

    const { result } = renderHook(() =>
      useDropdownPosition(
        true,
        { current: button },
        { current: menu },
        320,
        'top',
        'left',
        [{ id: '1', name: 'Aspirin' }]
      )
    );

    await waitFor(() => {
      expect(result.current.isPositionReady).toBe(true);
    });

    expect(result.current.dropDirection).toBe('up');
    expect(result.current.portalStyle.width).toBe('320px');
    expect(result.current.portalStyle.left).toBe('500px');
  });

  it('falls back from left positioning when there is not enough space', async () => {
    const button = createButton({ top: 200, left: 30, width: 180, height: 40 });
    const menu = createMenu(200);

    const { result } = renderHook(() =>
      useDropdownPosition(
        true,
        { current: button },
        { current: menu },
        260,
        'left',
        'left',
        [{ id: '1', name: 'X' }]
      )
    );

    await waitFor(() => {
      expect(result.current.isPositionReady).toBe(true);
    });

    expect(result.current.isLeftPositioning).toBe(false);
    expect(result.current.portalStyle.left).toBe('30px');
  });

  it('resets position state and can recalculate manually', async () => {
    const button = createButton({
      top: 100,
      left: 300,
      width: 150,
      height: 36,
    });
    const menu = createMenu(120);

    const { result } = renderHook(() =>
      useDropdownPosition(
        true,
        { current: button },
        { current: menu },
        'auto',
        'auto',
        'right',
        [{ id: '1', name: 'Y' }]
      )
    );

    await waitFor(() => {
      expect(result.current.isPositionReady).toBe(true);
    });

    act(() => {
      result.current.resetPosition();
    });
    expect(result.current.isPositionReady).toBe(false);

    act(() => {
      result.current.calculateDropdownPosition();
    });
    await waitFor(() => {
      expect(result.current.isPositionReady).toBe(true);
    });
  });
});
