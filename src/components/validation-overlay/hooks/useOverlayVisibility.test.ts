import { describe, expect, it } from 'vitest';
import { useOverlayVisibility } from './useOverlayVisibility';

describe('useOverlayVisibility', () => {
  it('uses hover-based visibility after auto-hide', () => {
    expect(
      useOverlayVisibility({
        showError: false,
        hasAutoHidden: true,
        error: 'Invalid',
        isHovered: true,
        isOpen: false,
      }).showOverlay
    ).toBe(true);

    expect(
      useOverlayVisibility({
        showError: false,
        hasAutoHidden: true,
        error: 'Invalid',
        isHovered: false,
        isOpen: false,
      }).showOverlay
    ).toBe(false);
  });

  it('uses direct showError visibility before auto-hide and hides when open', () => {
    expect(
      useOverlayVisibility({
        showError: true,
        hasAutoHidden: false,
        error: 'Invalid',
        isHovered: false,
        isOpen: false,
      }).showOverlay
    ).toBe(true);

    expect(
      useOverlayVisibility({
        showError: true,
        hasAutoHidden: false,
        error: 'Invalid',
        isHovered: true,
        isOpen: true,
      }).showOverlay
    ).toBe(false);
  });
});
