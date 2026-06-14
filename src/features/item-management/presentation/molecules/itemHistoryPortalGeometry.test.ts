import { describe, expect, it } from 'vite-plus/test';
import {
  getItemHistoryPortalPosition,
  getItemHistoryPortalShape,
} from './itemHistoryPortalGeometry';

describe('item history portal geometry', () => {
  it('positions the portal within viewport margins', () => {
    expect(
      getItemHistoryPortalPosition({
        triggerRect: {
          top: 120,
          right: 420,
        },
        viewportWidth: 800,
        viewportHeight: 700,
      })
    ).toEqual({
      top: 108,
      left: 70,
      width: 350,
      bodyMaxHeight: 533,
      bodyMinHeight: 460,
    });
  });

  it('shrinks width and body height for constrained viewports', () => {
    expect(
      getItemHistoryPortalPosition({
        triggerRect: {
          top: 12,
          right: 900,
        },
        viewportWidth: 300,
        viewportHeight: 230,
      })
    ).toEqual({
      top: 16,
      left: 16,
      width: 268,
      bodyMaxHeight: 180,
      bodyMinHeight: 180,
    });
  });

  it('builds the tabbed surface path and surface height from dimensions', () => {
    expect(
      getItemHistoryPortalShape({
        width: 350,
        bodyMinHeight: 460,
      })
    ).toEqual({
      surfaceHeight: 504,
      path: 'M 0 60 Q 0 44 16 44 H 154 Q 170 44 170 28 V 16 Q 170 0 186 0 H 334 Q 350 0 350 16 V 488 Q 350 504 334 504 H 16 Q 0 504 0 488 V 60 Z',
    });
  });
});
