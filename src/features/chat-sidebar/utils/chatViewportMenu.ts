import {
  CHAT_HEADER_OVERLAY_HEIGHT,
  MENU_GAP,
  MENU_HEIGHT,
  MENU_WIDTH,
} from '../constants';
import type { MenuPlacement, MenuSideAnchor } from '../types';

export type VisibleBounds = {
  containerRect: DOMRect;
  visibleBottom: number;
};

export const createAnimationFrameController = () => ({
  cancel(frameId: number) {
    const cancelAnimationFrameFn =
      typeof window !== 'undefined' &&
      typeof window.cancelAnimationFrame === 'function'
        ? window.cancelAnimationFrame.bind(window)
        : typeof globalThis.cancelAnimationFrame === 'function'
          ? globalThis.cancelAnimationFrame.bind(globalThis)
          : window.clearTimeout.bind(window);

    cancelAnimationFrameFn(frameId);
  },
  request(callback: FrameRequestCallback) {
    const requestAnimationFrameFn =
      typeof window !== 'undefined' &&
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : typeof globalThis.requestAnimationFrame === 'function'
          ? globalThis.requestAnimationFrame.bind(globalThis)
          : (fallbackCallback: FrameRequestCallback) =>
              window.setTimeout(() => fallbackCallback(Date.now()), 16);

    return requestAnimationFrameFn(callback);
  },
});

export const isAnchorVisibleWithinViewport = (
  bounds: VisibleBounds,
  anchorRect: DOMRect
) => {
  const minVisibleTop = bounds.containerRect.top + CHAT_HEADER_OVERLAY_HEIGHT;
  const maxVisibleBottom = bounds.visibleBottom;

  return anchorRect.bottom > minVisibleTop && anchorRect.top < maxVisibleBottom;
};

export const getViewportMenuLayout = ({
  anchorRect,
  bounds,
  preferredSide,
}: {
  anchorRect: DOMRect;
  bounds: VisibleBounds | null;
  preferredSide: 'left' | 'right';
}): {
  placement: MenuPlacement;
  sideAnchor: MenuSideAnchor;
} => {
  if (!bounds) {
    return { placement: 'up', sideAnchor: 'middle' };
  }

  const { containerRect, visibleBottom } = bounds;
  const spaceLeft = anchorRect.left - containerRect.left;
  const spaceRight = containerRect.right - anchorRect.right;
  const spaceAbove = anchorRect.top - containerRect.top;
  const spaceBelow = visibleBottom - anchorRect.bottom;
  const isAnchorNearHeaderOverlay =
    anchorRect.top < containerRect.top + CHAT_HEADER_OVERLAY_HEIGHT;

  if (isAnchorNearHeaderOverlay && spaceBelow > spaceAbove) {
    return { placement: 'up', sideAnchor: 'middle' };
  }

  const hasTopAnchoredSideRoom =
    spaceBelow >= MENU_HEIGHT - anchorRect.height + MENU_GAP;
  const hasBottomAnchoredSideRoom =
    spaceAbove >= MENU_HEIGHT - anchorRect.height + MENU_GAP;
  const hasCenteredSideRoom =
    spaceAbove >= MENU_HEIGHT / 2 && spaceBelow >= MENU_HEIGHT / 2;
  const hasSideVerticalRoom =
    hasTopAnchoredSideRoom || hasBottomAnchoredSideRoom || hasCenteredSideRoom;
  const sideAnchor: MenuSideAnchor = hasCenteredSideRoom
    ? 'middle'
    : hasBottomAnchoredSideRoom
      ? 'bottom'
      : hasTopAnchoredSideRoom
        ? 'top'
        : spaceAbove >= spaceBelow
          ? 'bottom'
          : 'top';
  const canFitLeft = spaceLeft >= MENU_WIDTH + MENU_GAP && hasSideVerticalRoom;
  const canFitRight =
    spaceRight >= MENU_WIDTH + MENU_GAP && hasSideVerticalRoom;

  if (preferredSide === 'left' && canFitLeft) {
    return { placement: 'left', sideAnchor };
  }
  if (preferredSide === 'right' && canFitRight) {
    return { placement: 'right', sideAnchor };
  }
  if (canFitLeft) {
    return { placement: 'left', sideAnchor };
  }
  if (canFitRight) {
    return { placement: 'right', sideAnchor };
  }

  if (spaceBelow >= MENU_HEIGHT + MENU_GAP) {
    return { placement: 'up', sideAnchor };
  }
  if (spaceAbove >= MENU_HEIGHT + MENU_GAP) {
    return { placement: 'down', sideAnchor };
  }

  return {
    placement: spaceBelow >= spaceAbove ? 'up' : 'down',
    sideAnchor,
  };
};

export const getMenuOpenScrollPlan = ({
  anchorRect,
  bounds,
  container,
}: {
  anchorRect: DOMRect;
  bounds: VisibleBounds | null;
  container: HTMLDivElement | null;
}): { targetScrollTop: number } | null => {
  if (!container || !bounds) {
    return null;
  }

  const minVisibleTop =
    bounds.containerRect.top + CHAT_HEADER_OVERLAY_HEIGHT + MENU_GAP;
  const maxVisibleBottom = bounds.visibleBottom - MENU_GAP;
  const visibleAnchorHeight = Math.max(
    Math.min(anchorRect.bottom, maxVisibleBottom) -
      Math.max(anchorRect.top, minVisibleTop),
    0
  );
  const isMostlyClippedByComposer =
    anchorRect.bottom > maxVisibleBottom &&
    visibleAnchorHeight < anchorRect.height / 2;

  let scrollOffset = 0;
  if (anchorRect.top < minVisibleTop) {
    scrollOffset = anchorRect.top - minVisibleTop;
  } else if (isMostlyClippedByComposer) {
    scrollOffset = anchorRect.bottom - maxVisibleBottom;
  }

  if (Math.abs(scrollOffset) < 0.5) {
    return null;
  }

  const targetScrollTop = Math.min(
    Math.max(container.scrollTop + scrollOffset, 0),
    Math.max(0, container.scrollHeight - container.clientHeight)
  );
  const appliedScrollDelta = targetScrollTop - container.scrollTop;

  if (Math.abs(appliedScrollDelta) < 0.5) {
    return null;
  }

  return {
    targetScrollTop,
  };
};
