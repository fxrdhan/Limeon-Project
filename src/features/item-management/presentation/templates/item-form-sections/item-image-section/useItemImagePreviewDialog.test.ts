import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useItemImagePreviewDialog } from './useItemImagePreviewDialog';

const imageSlots = [{ url: 'image-a.jpg' }, { url: 'image-b.jpg' }];
const getDisplayUrlForSlot = (slot: { url: string }) => slot.url;

describe('useItemImagePreviewDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not let a stale open frame make a closed preview visible again', () => {
    let nextFrameId = 1;
    const queuedFrames = new Map<number, FrameRequestCallback>();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      queuedFrames.set(frameId, callback);
      return frameId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(frameId => {
      queuedFrames.delete(frameId);
    });

    const { result } = renderHook(() =>
      useItemImagePreviewDialog({
        getDisplayUrlForSlot,
        imageSlots,
      })
    );

    act(() => {
      result.current.openPreview(0);
    });
    act(() => {
      result.current.closePreview();
    });
    act(() => {
      for (const callback of queuedFrames.values()) {
        callback(0);
      }
    });

    expect(result.current.previewSlotIndex).toBe(0);
    expect(result.current.isPreviewVisible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.previewSlotIndex).toBeNull();
  });

  it('cancels a pending open frame on unmount', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(37);
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});
    const { result, unmount } = renderHook(() =>
      useItemImagePreviewDialog({
        getDisplayUrlForSlot,
        imageSlots,
      })
    );

    act(() => {
      result.current.openPreview(1);
    });
    unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(37);
  });
});
