export interface ComposerStackMetrics {
  top: number;
  bottom: number;
  height: number;
}

export const getComposerVisibleStackMetrics = (
  composerContainer: HTMLDivElement | null
): ComposerStackMetrics | null => {
  if (!composerContainer) {
    return null;
  }

  const visibleChildRects = Array.from(composerContainer.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement)
    .map(child => child.getBoundingClientRect())
    .filter(
      rect =>
        Number.isFinite(rect.top) &&
        Number.isFinite(rect.bottom) &&
        rect.bottom > rect.top
    );

  if (visibleChildRects.length === 0) {
    const containerRect = composerContainer.getBoundingClientRect();
    const fallbackHeight =
      containerRect.bottom - containerRect.top ||
      composerContainer.offsetHeight;

    if (!Number.isFinite(containerRect.top) || fallbackHeight <= 0) {
      return null;
    }

    return {
      top: containerRect.top,
      bottom: containerRect.top + fallbackHeight,
      height: fallbackHeight,
    };
  }

  const top = Math.min(...visibleChildRects.map(rect => rect.top));
  const bottom = Math.max(...visibleChildRects.map(rect => rect.bottom));

  return {
    top,
    bottom,
    height: Math.max(bottom - top, 0),
  };
};
