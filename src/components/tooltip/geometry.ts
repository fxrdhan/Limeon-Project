import { TOOLTIP_ARROW_SIZE, TOOLTIP_GEOMETRY_EPSILON } from './constants';
import type {
  TooltipAlign,
  TooltipGeometry,
  TooltipShowRequest,
  TooltipSide,
  TooltipSize,
} from './types';

export const hasTooltipGeometryChanged = (
  current: TooltipGeometry,
  next: TooltipGeometry
) =>
  Math.abs(current.bubbleX - next.bubbleX) > TOOLTIP_GEOMETRY_EPSILON ||
  Math.abs(current.bubbleY - next.bubbleY) > TOOLTIP_GEOMETRY_EPSILON ||
  Math.abs(current.width - next.width) > TOOLTIP_GEOMETRY_EPSILON ||
  Math.abs(current.height - next.height) > TOOLTIP_GEOMETRY_EPSILON ||
  Math.abs(current.arrowOffset - next.arrowOffset) > TOOLTIP_GEOMETRY_EPSILON;

const getClampedArrowOffset = (rawOffset: number, axisSize: number) => {
  const minOffset = 8;
  const maxOffset = Math.max(
    minOffset,
    axisSize - TOOLTIP_ARROW_SIZE - minOffset
  );

  return Math.min(Math.max(rawOffset, minOffset), maxOffset);
};

export const getTooltipTransformOrigin = (
  side: TooltipSide,
  arrowOffset: number
) => {
  const arrowCenter = arrowOffset + TOOLTIP_ARROW_SIZE / 2;

  if (side === 'top') {
    return `${arrowCenter}px bottom`;
  }

  if (side === 'bottom') {
    return `${arrowCenter}px top`;
  }

  if (side === 'left') {
    return `right ${arrowCenter}px`;
  }

  return `left ${arrowCenter}px`;
};

const getAlignedAxisPosition = (
  start: number,
  end: number,
  size: number,
  align: TooltipAlign,
  alignOffset: number
) => {
  if (align === 'start') {
    return start + alignOffset;
  }

  if (align === 'end') {
    return end - size - alignOffset;
  }

  return start + (end - start) / 2 - size / 2;
};

export const getTooltipGeometry = (
  {
    triggerElement,
    side,
    sideOffset,
    align,
    alignOffset,
  }: Omit<TooltipShowRequest, 'id' | 'content'>,
  size: TooltipSize
): TooltipGeometry => {
  const rect = triggerElement.getBoundingClientRect();
  const mainAxisOffset = 4;
  const triggerCenterX = rect.left + rect.width / 2;
  const triggerCenterY = rect.top + rect.height / 2;

  if (side === 'top' || side === 'bottom') {
    const bubbleX = getAlignedAxisPosition(
      rect.left,
      rect.right,
      size.width,
      align,
      alignOffset
    );
    const bubbleY =
      side === 'top'
        ? rect.top - size.height - sideOffset
        : rect.bottom + sideOffset;
    const hiddenOffsetY = side === 'top' ? mainAxisOffset : -mainAxisOffset;
    const arrowOffset = getClampedArrowOffset(
      triggerCenterX - bubbleX - TOOLTIP_ARROW_SIZE / 2,
      size.width
    );

    return {
      bubbleX,
      bubbleY,
      hiddenBubbleX: bubbleX,
      hiddenBubbleY: bubbleY + hiddenOffsetY,
      arrowOffset,
      width: size.width,
      height: size.height,
    };
  }

  const bubbleY = getAlignedAxisPosition(
    rect.top,
    rect.bottom,
    size.height,
    align,
    alignOffset
  );
  const bubbleX =
    side === 'left'
      ? rect.left - size.width - sideOffset
      : rect.right + sideOffset;
  const hiddenOffsetX = side === 'left' ? mainAxisOffset : -mainAxisOffset;
  const arrowOffset = getClampedArrowOffset(
    triggerCenterY - bubbleY - TOOLTIP_ARROW_SIZE / 2,
    size.height
  );

  return {
    bubbleX,
    bubbleY,
    hiddenBubbleX: bubbleX + hiddenOffsetX,
    hiddenBubbleY: bubbleY,
    arrowOffset,
    width: size.width,
    height: size.height,
  };
};
