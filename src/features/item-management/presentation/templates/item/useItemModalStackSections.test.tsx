import { act, renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useItemModalStackSections } from './useItemModalStackSections';

const baseParams = {
  conversionCount: 0,
  formData: {},
  formLoading: false,
  initialItemData: null,
  isOpen: true,
};

const mouseEventWithTarget = (target: HTMLElement) =>
  ({ target }) as unknown as MouseEvent<HTMLDivElement>;

describe('useItemModalStackSections', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not let a stale restore frame override an explicit section toggle', () => {
    let queuedRestoreFrame: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      queuedRestoreFrame = callback;
      return 51;
    });
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});
    const stackSection = document.createElement('div');
    stackSection.dataset.stackSection = 'conversion';
    const stackTarget = document.createElement('button');
    stackSection.append(stackTarget);

    const { result } = renderHook(() => useItemModalStackSections(baseParams));

    expect(result.current.activeSection).toBe('additional');

    act(() => {
      result.current.rightColumnProps?.onMouseMove?.(
        mouseEventWithTarget(stackTarget)
      );
    });
    act(() => {
      vi.advanceTimersByTime(220);
    });
    act(() => {
      result.current.rightColumnProps?.onMouseLeave?.(
        mouseEventWithTarget(stackTarget)
      );
    });

    expect(queuedRestoreFrame).not.toBeNull();

    act(() => {
      result.current.toggleSection('pricing');
    });

    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(51);
    expect(result.current.activeSection).toBe('pricing');

    act(() => {
      queuedRestoreFrame?.(0);
    });

    expect(result.current.activeSection).toBe('pricing');
  });

  it('does not let a stale pricing focus frame run after another section opens', () => {
    const queuedFrames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(callback => {
        const frameId = nextFrameId;
        nextFrameId += 1;
        queuedFrames.set(frameId, callback);
        return frameId;
      });
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(frameId => {
        queuedFrames.delete(frameId);
      });

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const pricingSection = document.createElement('div');
    pricingSection.dataset.stackSection = 'pricing';
    const pricingContent = document.createElement('div');
    pricingContent.dataset.sectionContent = '';
    const basePriceInput = document.createElement('input');
    basePriceInput.name = 'base_price';
    pricingContent.append(basePriceInput);
    pricingSection.append(pricingContent);
    dialog.append(pricingSection);
    document.body.append(dialog);

    try {
      const { result } = renderHook(() =>
        useItemModalStackSections(baseParams)
      );

      act(() => {
        result.current.openPricingSectionAndFocus();
      });

      expect(result.current.activeSection).toBe('pricing');
      expect(requestAnimationFrameSpy).toHaveBeenCalledOnce();
      const focusFrameId = nextFrameId - 1;
      expect(queuedFrames.has(focusFrameId)).toBe(true);

      act(() => {
        result.current.toggleSection('settings');
      });

      expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(focusFrameId);
      expect(result.current.activeSection).toBe('settings');

      act(() => {
        const frames = Array.from(queuedFrames.entries());
        queuedFrames.clear();

        for (const [frameId, callback] of frames) {
          callback(frameId);
        }
      });

      expect(document.activeElement).not.toBe(basePriceInput);
    } finally {
      dialog.remove();
    }
  });
});
