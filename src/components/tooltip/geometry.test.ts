import { describe, expect, it } from 'vite-plus/test';
import {
  getTooltipGeometry,
  getTooltipTransformOrigin,
  hasTooltipGeometryChanged,
} from './geometry';
import type { TooltipGeometry, TooltipShowRequest } from './types';

const triggerElement = ({
  height,
  left,
  top,
  width,
}: {
  height: number;
  left: number;
  top: number;
  width: number;
}) =>
  ({
    getBoundingClientRect: () =>
      ({
        bottom: top + height,
        height,
        left,
        right: left + width,
        top,
        width,
      }) as DOMRect,
  }) as HTMLElement;

const request = (
  overrides: Partial<Omit<TooltipShowRequest, 'content' | 'id'>> = {}
): Omit<TooltipShowRequest, 'content' | 'id'> => ({
  align: 'center',
  alignOffset: 0,
  side: 'top',
  sideOffset: 6,
  triggerElement: triggerElement({
    height: 20,
    left: 100,
    top: 50,
    width: 40,
  }),
  ...overrides,
});

const geometry = (
  overrides: Partial<TooltipGeometry> = {}
): TooltipGeometry => ({
  arrowOffset: 10,
  bubbleX: 20,
  bubbleY: 30,
  height: 24,
  hiddenBubbleX: 20,
  hiddenBubbleY: 34,
  width: 80,
  ...overrides,
});

describe('tooltip geometry', () => {
  it('positions top and bottom tooltips on the vertical axis', () => {
    expect(getTooltipGeometry(request(), { width: 80, height: 24 })).toEqual({
      arrowOffset: 34,
      bubbleX: 80,
      bubbleY: 20,
      height: 24,
      hiddenBubbleX: 80,
      hiddenBubbleY: 24,
      width: 80,
    });

    expect(
      getTooltipGeometry(request({ side: 'bottom' }), {
        width: 80,
        height: 24,
      })
    ).toEqual({
      arrowOffset: 34,
      bubbleX: 80,
      bubbleY: 76,
      height: 24,
      hiddenBubbleX: 80,
      hiddenBubbleY: 72,
      width: 80,
    });
  });

  it('positions left and right tooltips on the horizontal axis', () => {
    expect(
      getTooltipGeometry(request({ side: 'left' }), {
        width: 80,
        height: 24,
      })
    ).toEqual({
      arrowOffset: 8,
      bubbleX: 14,
      bubbleY: 48,
      height: 24,
      hiddenBubbleX: 18,
      hiddenBubbleY: 48,
      width: 80,
    });

    expect(
      getTooltipGeometry(request({ side: 'right' }), {
        width: 80,
        height: 24,
      })
    ).toEqual({
      arrowOffset: 8,
      bubbleX: 146,
      bubbleY: 48,
      height: 24,
      hiddenBubbleX: 142,
      hiddenBubbleY: 48,
      width: 80,
    });
  });

  it('applies start and end alignment offsets', () => {
    expect(
      getTooltipGeometry(request({ align: 'start', alignOffset: 4 }), {
        width: 80,
        height: 24,
      }).bubbleX
    ).toBe(104);

    expect(
      getTooltipGeometry(request({ align: 'end', alignOffset: 4 }), {
        width: 80,
        height: 24,
      }).bubbleX
    ).toBe(56);
  });

  it('builds transform origins from side and arrow offset', () => {
    expect(getTooltipTransformOrigin('top', 20)).toBe('26px bottom');
    expect(getTooltipTransformOrigin('bottom', 20)).toBe('26px top');
    expect(getTooltipTransformOrigin('left', 20)).toBe('right 26px');
    expect(getTooltipTransformOrigin('right', 20)).toBe('left 26px');
  });

  it('ignores sub-pixel geometry drift inside the epsilon threshold', () => {
    expect(
      hasTooltipGeometryChanged(
        geometry(),
        geometry({
          arrowOffset: 10.4,
          bubbleX: 20.4,
          bubbleY: 30.4,
          height: 24.4,
          width: 80.4,
        })
      )
    ).toBe(false);

    expect(
      hasTooltipGeometryChanged(
        geometry(),
        geometry({
          bubbleX: 20.6,
        })
      )
    ).toBe(true);
  });
});
