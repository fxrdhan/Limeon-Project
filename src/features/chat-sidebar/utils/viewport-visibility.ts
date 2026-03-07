export type VisibleBounds = {
  containerRect: DOMRect;
  visibleBottom: number;
};

export type VerticalVisibilityBounds = {
  minVisibleTop: number;
  maxVisibleBottom: number;
};

export const getVerticalVisibilityBounds = (
  bounds: VisibleBounds,
  headerRect?: DOMRect | null,
  padding = 0
): VerticalVisibilityBounds => {
  const headerBottom = headerRect?.bottom;
  const hasValidHeaderBottom =
    typeof headerBottom === 'number' &&
    Number.isFinite(headerBottom) &&
    headerBottom > bounds.containerRect.top &&
    headerBottom < bounds.containerRect.bottom;

  return {
    minVisibleTop: hasValidHeaderBottom
      ? headerBottom + padding
      : bounds.containerRect.top + padding,
    maxVisibleBottom: bounds.visibleBottom - padding,
  };
};
