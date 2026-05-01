import { describe, expect, it } from 'vite-plus/test';
import {
  getNextCropRect,
  getRenderedImageRect,
  getSourceCropRect,
  normalizeAspectRatio,
} from './geometry';

describe('image cropper geometry', () => {
  it('supports portrait, square, and free crop aspect ratios', () => {
    expect(normalizeAspectRatio(0.75)).toBe(0.75);
    expect(normalizeAspectRatio(1)).toBe(1);
    expect(normalizeAspectRatio('free')).toBeNull();
  });

  it('calculates aspect-fit, aspect-fill, and scale-to-fit image rectangles', () => {
    expect(
      getRenderedImageRect(
        { width: 400, height: 400 },
        { width: 800, height: 200 },
        'aspect-fit'
      )
    ).toEqual({ x: 0, y: 150, width: 400, height: 100 });

    expect(
      getRenderedImageRect(
        { width: 400, height: 400 },
        { width: 800, height: 200 },
        'aspect-fill'
      )
    ).toEqual({ x: -600, y: 0, width: 1600, height: 400 });

    expect(
      getRenderedImageRect(
        { width: 400, height: 400 },
        { width: 120, height: 80 },
        'scale-to-fit'
      )
    ).toEqual({ x: 140, y: 160, width: 120, height: 80 });
  });

  it('keeps fixed-aspect resizing inside the crop bounds', () => {
    const nextRect = getNextCropRect(
      'se',
      { x: 25, y: 25, width: 100, height: 100 },
      300,
      300,
      { x: 0, y: 0, width: 200, height: 160 },
      1,
      36
    );

    expect(nextRect).toEqual({ x: 25, y: 25, width: 135, height: 135 });
  });

  it('allows free resizing when no aspect ratio is configured', () => {
    const nextRect = getNextCropRect(
      'se',
      { x: 25, y: 25, width: 80, height: 80 },
      60,
      20,
      { x: 0, y: 0, width: 200, height: 160 },
      null,
      36
    );

    expect(nextRect).toEqual({ x: 25, y: 25, width: 140, height: 100 });
  });

  it('maps viewport crop coordinates back to source image pixels', () => {
    expect(
      getSourceCropRect(
        { x: 150, y: 75, width: 100, height: 100 },
        { x: 100, y: 50, width: 400, height: 200 },
        { width: 800, height: 400 }
      )
    ).toEqual({ x: 100, y: 50, width: 200, height: 200 });
  });
});
