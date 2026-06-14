import { describe, expect, it } from 'vite-plus/test';
import {
  getComposerResizePreservedScrollTop,
  isViewportAtTop,
} from './scrollState';

describe('chat viewport scroll state helpers', () => {
  it('uses a wider top threshold while the top affordance is already visible', () => {
    expect(isViewportAtTop({ scrollTop: 14, wasAtTopVisible: true })).toBe(
      true
    );
    expect(isViewportAtTop({ scrollTop: 3, wasAtTopVisible: false })).toBe(
      false
    );
    expect(isViewportAtTop({ scrollTop: 2, wasAtTopVisible: false })).toBe(
      true
    );
  });

  it('preserves viewport position across meaningful composer height changes', () => {
    expect(
      getComposerResizePreservedScrollTop({
        scrollTop: 120,
        scrollHeight: 500,
        clientHeight: 240,
        previousComposerContainerHeight: 80,
        nextComposerContainerHeight: 110,
      })
    ).toBe(150);
  });

  it('clamps preserved composer resize scroll positions to valid bounds', () => {
    expect(
      getComposerResizePreservedScrollTop({
        scrollTop: 20,
        scrollHeight: 180,
        clientHeight: 120,
        previousComposerContainerHeight: 40,
        nextComposerContainerHeight: 140,
      })
    ).toBe(60);

    expect(
      getComposerResizePreservedScrollTop({
        scrollTop: 2,
        scrollHeight: 180,
        clientHeight: 120,
        previousComposerContainerHeight: 140,
        nextComposerContainerHeight: 40,
      })
    ).toBe(0);
  });

  it('skips imperceptible composer resize scroll adjustments', () => {
    expect(
      getComposerResizePreservedScrollTop({
        scrollTop: 120,
        scrollHeight: 500,
        clientHeight: 240,
        previousComposerContainerHeight: 80,
        nextComposerContainerHeight: 80.3,
      })
    ).toBeNull();

    expect(
      getComposerResizePreservedScrollTop({
        scrollTop: 0,
        scrollHeight: 500,
        clientHeight: 240,
        previousComposerContainerHeight: 80,
        nextComposerContainerHeight: 79.6,
      })
    ).toBeNull();
  });
});
