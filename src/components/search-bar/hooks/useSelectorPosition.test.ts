import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSelectorPosition } from './useSelectorPosition';

const makeRect = (partial: Partial<DOMRect> = {}): DOMRect =>
  ({
    x: partial.left ?? 0,
    y: partial.top ?? 0,
    width: partial.width ?? 0,
    height: partial.height ?? 0,
    top: partial.top ?? 0,
    left: partial.left ?? 0,
    right: partial.right ?? (partial.left ?? 0) + (partial.width ?? 0),
    bottom: partial.bottom ?? (partial.top ?? 0) + (partial.height ?? 0),
    toJSON: () => ({}),
  }) as DOMRect;

describe('useSelectorPosition', () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    observeMock = vi.fn();
    disconnectMock = vi.fn();

    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observeMock;
        disconnect = disconnectMock;
        constructor() {}
      }
    );

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        return setTimeout(() => cb(0), 0) as unknown as number;
      })
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) =>
        clearTimeout(id as unknown as ReturnType<typeof setTimeout>)
      )
    );
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps default position when selector is closed', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };

    const { result } = renderHook(() =>
      useSelectorPosition({
        isOpen: false,
        containerRef,
      })
    );

    expect(result.current).toEqual({ top: 0, left: 0 });
  });

  it('uses container coordinates when open without anchor', () => {
    const container = document.createElement('div');
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
      makeRect({ left: 20, top: 10, width: 120, height: 50, bottom: 60 })
    );

    const containerRef = { current: container };

    const { result } = renderHook(() =>
      useSelectorPosition({
        isOpen: true,
        containerRef,
      })
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toEqual({ top: 60, left: 20 });
    expect(observeMock).toHaveBeenCalledWith(container);
  });

  it('positions against anchor with right/center/offset strategies', () => {
    const container = document.createElement('div');
    const anchor = document.createElement('span');

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
      makeRect({ left: 10, top: 20, width: 200, height: 40, bottom: 60 })
    );
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(
      makeRect({ left: 100, top: 22, width: 50, height: 20, right: 150 })
    );

    const containerRef = { current: container };
    const anchorRef = { current: anchor };

    const { result, rerender } = renderHook(
      ({
        anchorAlign,
        anchorOffsetRatio,
      }: {
        anchorAlign: 'left' | 'right' | 'center';
        anchorOffsetRatio?: number;
      }) =>
        useSelectorPosition({
          isOpen: true,
          containerRef,
          anchorRef,
          anchorAlign,
          anchorOffsetRatio,
        }),
      {
        initialProps: {
          anchorAlign: 'right' as const,
          anchorOffsetRatio: undefined,
        },
      }
    );

    act(() => {
      vi.runAllTimers();
    });
    expect(result.current).toEqual({ top: 60, left: 150 });

    rerender({
      anchorAlign: 'center',
      anchorOffsetRatio: undefined,
    } as unknown as { anchorAlign: 'right'; anchorOffsetRatio: undefined });
    act(() => {
      vi.runAllTimers();
    });
    expect(result.current).toEqual({ top: 60, left: 125 });

    rerender({
      anchorAlign: 'left',
      anchorOffsetRatio: 0.2,
    } as unknown as { anchorAlign: 'right'; anchorOffsetRatio: undefined });
    act(() => {
      vi.runAllTimers();
    });
    expect(result.current).toEqual({ top: 60, left: 110 });
    expect(observeMock).toHaveBeenCalledWith(anchor);

    rerender({
      anchorAlign: 'left',
      anchorOffsetRatio: undefined,
    } as unknown as { anchorAlign: 'right'; anchorOffsetRatio: undefined });
    act(() => {
      vi.runAllTimers();
    });
    expect(result.current).toEqual({ top: 60, left: 100 });
  });

  it('updates on resize/scroll and cleans listeners plus observers on unmount', () => {
    const container = document.createElement('div');
    vi.spyOn(container, 'getBoundingClientRect')
      .mockReturnValueOnce(
        makeRect({ left: 5, top: 5, width: 100, height: 20, bottom: 25 })
      )
      .mockReturnValue(
        makeRect({ left: 40, top: 5, width: 100, height: 20, bottom: 25 })
      );

    const addWindowSpy = vi.spyOn(window, 'addEventListener');
    const removeWindowSpy = vi.spyOn(window, 'removeEventListener');
    const addDocumentSpy = vi.spyOn(document, 'addEventListener');
    const removeDocumentSpy = vi.spyOn(document, 'removeEventListener');

    const containerRef = { current: container };
    const { result, unmount } = renderHook(() =>
      useSelectorPosition({
        isOpen: true,
        containerRef,
      })
    );

    act(() => {
      vi.runAllTimers();
    });
    expect(result.current.left).toBe(40);

    act(() => {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
      document.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.left).toBe(40);

    unmount();

    expect(addWindowSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(addWindowSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      true
    );
    expect(addDocumentSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      true
    );
    expect(removeWindowSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );
    expect(removeWindowSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      true
    );
    expect(removeDocumentSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      true
    );
    expect(disconnectMock).toHaveBeenCalled();
  });
});
