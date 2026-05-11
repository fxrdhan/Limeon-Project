import type {
  ComboboxHoverDetailGeometry,
  ComboboxHoverDetailPosition,
  ComboboxHoverDetailSize,
} from '../internal-types';

const hoverDetailViewportPadding = 12;
const hoverDetailHiddenOffset = 4;
const hoverDetailLineWidthBuffer = 8;

export const hoverDetailMinWidth = 220;
export const hoverDetailSurfaceHorizontalPadding = 32;

export const hoverDetailAppearTransition = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 24,
  mass: 0.75,
};

export const hoverDetailExitTransition = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 30,
  mass: 0.65,
};

export const hoverDetailRepositionTransition = {
  type: 'tween' as const,
  duration: 0.22,
  ease: 'easeOut' as const,
};

export const defaultHoverDetailGeometry: ComboboxHoverDetailGeometry = {
  x: 0,
  y: 0,
  hiddenX: 0,
  hiddenY: 0,
  width: 0,
  height: 0,
};

export const getHoverDetailGeometry = (
  position: ComboboxHoverDetailPosition,
  size: ComboboxHoverDetailSize
): ComboboxHoverDetailGeometry => {
  const viewportWidth =
    typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight =
    typeof window === 'undefined' ? 768 : window.innerHeight;
  const boundaryTop =
    position.boundaryTop === undefined
      ? hoverDetailViewportPadding
      : position.boundaryTop;
  const boundaryBottom =
    position.boundaryBottom === undefined
      ? viewportHeight - hoverDetailViewportPadding
      : position.boundaryBottom;
  const minTop = Math.max(hoverDetailViewportPadding, boundaryTop);
  const maxBottom = Math.min(
    viewportHeight - hoverDetailViewportPadding,
    boundaryBottom
  );
  const height = Math.min(size.height, Math.max(0, maxBottom - minTop));
  const maxTop = Math.max(minTop, maxBottom - height);
  const width = Math.min(
    size.width,
    position.maxWidth,
    viewportWidth - hoverDetailViewportPadding * 2
  );
  const preferredX =
    position.direction === 'right' ? position.left : position.left - width;
  const x =
    typeof window === 'undefined'
      ? preferredX
      : Math.min(
          Math.max(preferredX, hoverDetailViewportPadding),
          viewportWidth - width - hoverDetailViewportPadding
        );
  const y = Math.min(Math.max(position.top, minTop), maxTop);
  const hiddenX =
    position.direction === 'right'
      ? x - hoverDetailHiddenOffset
      : x + hoverDetailHiddenOffset;

  return {
    x,
    y,
    hiddenX,
    hiddenY: y,
    width,
    height,
  };
};

const getNaturalTextWidth = (element: HTMLElement) => {
  const previousDisplay = element.style.display;
  const previousWhiteSpace = element.style.whiteSpace;

  element.style.display = 'inline-block';
  element.style.whiteSpace = 'nowrap';

  const width = element.getBoundingClientRect().width;
  element.style.display = previousDisplay;
  element.style.whiteSpace = previousWhiteSpace;

  return width;
};

const getMeasuredInlineWidth = (element: HTMLElement) => {
  const lineRects = element.querySelectorAll<HTMLElement>(
    '[data-hover-detail-line]'
  );
  const titleLine = element.querySelector<HTMLElement>(
    '[data-hover-detail-title-line]'
  );
  const codeBadge = element.querySelector<HTMLElement>(
    '[data-hover-detail-code-badge]'
  );
  let maxLineWidth = 0;

  lineRects.forEach(lineElement => {
    Array.from(lineElement.getClientRects()).forEach(rect => {
      maxLineWidth = Math.max(maxLineWidth, rect.width);
    });
  });

  if (titleLine) {
    const codeWidth = codeBadge ? codeBadge.getBoundingClientRect().width : 0;
    const headerGapWidth = codeWidth > 0 ? 8 : 0;
    maxLineWidth = Math.max(
      maxLineWidth,
      codeWidth + headerGapWidth + getNaturalTextWidth(titleLine)
    );
  }

  return maxLineWidth > 0
    ? maxLineWidth +
        hoverDetailSurfaceHorizontalPadding +
        hoverDetailLineWidthBuffer
    : null;
};

export const getHoverDetailElementSize = (
  element: HTMLElement
): ComboboxHoverDetailSize => {
  const rect = element.getBoundingClientRect();
  const measuredInlineWidth = getMeasuredInlineWidth(element);
  const width = measuredInlineWidth
    ? Math.min(rect.width, measuredInlineWidth)
    : rect.width;

  return {
    width: Math.max(hoverDetailMinWidth, width),
    height: rect.height,
  };
};
