import { describe, expect, it } from 'vite-plus/test';
import {
  getImageUploaderAnchoredPopupGeometry,
  getImageUploaderClickPopupCoordinates,
  getImageUploaderPopupSize,
} from './popupGeometry';

describe('image uploader popup geometry', () => {
  it('uses measured popup dimensions before fallback estimates', () => {
    expect(
      getImageUploaderPopupSize({
        hasDelete: true,
        measuredRect: { width: 144, height: 96 },
        optionCount: 3,
      })
    ).toEqual({ width: 144, height: 96 });

    expect(
      getImageUploaderPopupSize({
        hasDelete: false,
        measuredRect: null,
        optionCount: 1,
      })
    ).toEqual({ width: 100, height: 44 });

    expect(
      getImageUploaderPopupSize({
        hasDelete: true,
        measuredRect: null,
        optionCount: 3,
      })
    ).toEqual({ width: 120, height: 116 });
  });

  it('keeps click-triggered popups inside the viewport margin', () => {
    expect(
      getImageUploaderClickPopupCoordinates({
        clickX: -20,
        clickY: 999,
        popupHeight: 80,
        popupWidth: 100,
        viewportHeight: 300,
        viewportWidth: 400,
      })
    ).toEqual({ x: 8, y: 212 });
  });

  it('places hover popups to the right when there is enough space', () => {
    expect(
      getImageUploaderAnchoredPopupGeometry({
        containerRect: {
          height: 40,
          left: 100,
          right: 140,
          top: 20,
        },
        popupWidth: 120,
        viewportWidth: 400,
      })
    ).toEqual({
      position: 'right',
      coordinates: { x: 148, y: 40 },
    });
  });

  it('places hover popups to the left when right-side space is constrained', () => {
    expect(
      getImageUploaderAnchoredPopupGeometry({
        containerRect: {
          height: 40,
          left: 260,
          right: 300,
          top: 20,
        },
        popupWidth: 120,
        viewportWidth: 320,
      })
    ).toEqual({
      position: 'left',
      coordinates: { x: 132, y: 40 },
    });
  });

  it('falls back to the side with more space and clamps to the viewport margin', () => {
    expect(
      getImageUploaderAnchoredPopupGeometry({
        containerRect: {
          height: 40,
          left: 90,
          right: 130,
          top: 20,
        },
        popupWidth: 180,
        viewportWidth: 260,
      })
    ).toEqual({
      position: 'right',
      coordinates: { x: 72, y: 40 },
    });
  });
});
