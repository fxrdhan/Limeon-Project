import { describe, expect, it } from 'vite-plus/test';
import {
  getDisplayedComposerAttachmentMenuPosition,
  isComposerAttachmentMenuVisible,
  resolveComposerAttachmentMenuStyle,
} from './composerAttachmentActionMenuState';

describe('composer attachment action menu state helpers', () => {
  it('uses the live resolved position while repositioning is active', () => {
    const resolvedPosition = { top: 12, left: 24 };
    const settledPosition = { top: 40, left: 80 };

    expect(
      getDisplayedComposerAttachmentMenuPosition({
        hasBeenVisible: true,
        isRepositionPaused: false,
        resolvedPosition,
        settledPosition,
      })
    ).toBe(resolvedPosition);
  });

  it('uses the settled position only after a paused menu has been visible', () => {
    const settledPosition = { top: 40, left: 80 };

    expect(
      getDisplayedComposerAttachmentMenuPosition({
        hasBeenVisible: false,
        isRepositionPaused: true,
        resolvedPosition: { top: 12, left: 24 },
        settledPosition,
      })
    ).toBeNull();
    expect(
      getDisplayedComposerAttachmentMenuPosition({
        hasBeenVisible: true,
        isRepositionPaused: true,
        resolvedPosition: { top: 12, left: 24 },
        settledPosition,
      })
    ).toBe(settledPosition);
  });

  it('derives visual visibility from pause state and displayed position', () => {
    expect(
      isComposerAttachmentMenuVisible({
        displayedPosition: null,
        hasBeenVisible: true,
        isRepositionPaused: true,
      })
    ).toBe(true);
    expect(
      isComposerAttachmentMenuVisible({
        displayedPosition: { top: 1, left: 2 },
        hasBeenVisible: false,
        isRepositionPaused: false,
      })
    ).toBe(true);
    expect(
      isComposerAttachmentMenuVisible({
        displayedPosition: null,
        hasBeenVisible: true,
        isRepositionPaused: false,
      })
    ).toBe(false);
  });

  it('resolves hidden and visible menu styles', () => {
    expect(resolveComposerAttachmentMenuStyle(null, 0)).toEqual({
      top: -10000,
      left: -10000,
      visibility: 'hidden',
      pointerEvents: 'none',
    });
    expect(
      resolveComposerAttachmentMenuStyle({ top: 12, left: 24 }, 0)
    ).toEqual({
      top: 12,
      left: 24,
      willChange: 'opacity',
    });
    expect(
      resolveComposerAttachmentMenuStyle({ top: 12, left: 24 }, 8)
    ).toEqual({
      top: 12,
      left: 24,
      willChange: 'transform, opacity',
    });
  });
});
