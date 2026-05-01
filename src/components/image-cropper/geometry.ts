import type { ImageCropperFitMode } from './types';

export interface CropperSize {
  width: number;
  height: number;
}

export interface CropperRect extends CropperSize {
  x: number;
  y: number;
}

export type ImageCropperDragAction =
  | 'move'
  | 'n'
  | 'e'
  | 's'
  | 'w'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw';

const MIN_RECT_SIZE = 1;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const rectRight = (rect: CropperRect) => rect.x + rect.width;

const rectBottom = (rect: CropperRect) => rect.y + rect.height;

export const isUsableSize = (size: CropperSize | null | undefined) =>
  Boolean(size && size.width > 0 && size.height > 0);

export const isUsableRect = (rect: CropperRect | null | undefined) =>
  Boolean(rect && rect.width > 0 && rect.height > 0);

export const normalizeAspectRatio = (aspectRatio: number | 'free') =>
  typeof aspectRatio === 'number' && Number.isFinite(aspectRatio)
    ? Math.max(0.01, aspectRatio)
    : null;

export const getRenderedImageRect = (
  stageSize: CropperSize,
  imageSize: CropperSize,
  fitMode: ImageCropperFitMode
): CropperRect => {
  if (!isUsableSize(stageSize) || !isUsableSize(imageSize)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  if (fitMode === 'scale-to-fill') {
    return { x: 0, y: 0, width: stageSize.width, height: stageSize.height };
  }

  const aspectFitScale = Math.min(
    stageSize.width / imageSize.width,
    stageSize.height / imageSize.height
  );
  const aspectFillScale = Math.max(
    stageSize.width / imageSize.width,
    stageSize.height / imageSize.height
  );
  const scale = fitMode === 'aspect-fill' ? aspectFillScale : aspectFitScale;
  const width = imageSize.width * scale;
  const height = imageSize.height * scale;

  return {
    x: (stageSize.width - width) / 2,
    y: (stageSize.height - height) / 2,
    width,
    height,
  };
};

export const getCropBounds = (
  stageSize: CropperSize,
  imageRect: CropperRect
): CropperRect => {
  const stageRect = {
    x: 0,
    y: 0,
    width: stageSize.width,
    height: stageSize.height,
  };
  const x = Math.max(stageRect.x, imageRect.x);
  const y = Math.max(stageRect.y, imageRect.y);
  const right = Math.min(rectRight(stageRect), rectRight(imageRect));
  const bottom = Math.min(rectBottom(stageRect), rectBottom(imageRect));

  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  };
};

export const getInitialCropRect = (
  bounds: CropperRect,
  aspectRatio: number | null,
  coverage: number
): CropperRect => {
  const normalizedCoverage = clamp(coverage, 0.1, 1);
  let width = bounds.width * normalizedCoverage;
  let height = bounds.height * normalizedCoverage;

  if (aspectRatio) {
    height = width / aspectRatio;
    if (height > bounds.height * normalizedCoverage) {
      height = bounds.height * normalizedCoverage;
      width = height * aspectRatio;
    }
  }

  return {
    x: bounds.x + (bounds.width - width) / 2,
    y: bounds.y + (bounds.height - height) / 2,
    width,
    height,
  };
};

export const constrainCropRectToBounds = (
  rect: CropperRect,
  bounds: CropperRect,
  aspectRatio: number | null,
  minSize: number
): CropperRect => {
  if (!isUsableRect(bounds)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  if (!aspectRatio) {
    const width = clamp(
      rect.width,
      Math.min(minSize, bounds.width),
      bounds.width
    );
    const height = clamp(
      rect.height,
      Math.min(minSize, bounds.height),
      bounds.height
    );

    return {
      x: clamp(rect.x, bounds.x, bounds.x + bounds.width - width),
      y: clamp(rect.y, bounds.y, bounds.y + bounds.height - height),
      width,
      height,
    };
  }

  const maxWidth = Math.min(bounds.width, bounds.height * aspectRatio);
  const minWidth = Math.min(Math.max(minSize, minSize * aspectRatio), maxWidth);
  const width = clamp(rect.width, minWidth, maxWidth);
  const height = width / aspectRatio;

  return {
    x: clamp(rect.x, bounds.x, bounds.x + bounds.width - width),
    y: clamp(rect.y, bounds.y, bounds.y + bounds.height - height),
    width,
    height,
  };
};

const resizeFreeCropRect = (
  action: ImageCropperDragAction,
  startRect: CropperRect,
  deltaX: number,
  deltaY: number,
  bounds: CropperRect,
  minSize: number
): CropperRect => {
  let left = startRect.x;
  let top = startRect.y;
  let right = rectRight(startRect);
  let bottom = rectBottom(startRect);
  const minimumWidth = Math.min(minSize, bounds.width);
  const minimumHeight = Math.min(minSize, bounds.height);

  if (action.includes('w')) {
    left = clamp(startRect.x + deltaX, bounds.x, right - minimumWidth);
  }
  if (action.includes('e')) {
    right = clamp(
      rectRight(startRect) + deltaX,
      left + minimumWidth,
      rectRight(bounds)
    );
  }
  if (action.includes('n')) {
    top = clamp(startRect.y + deltaY, bounds.y, bottom - minimumHeight);
  }
  if (action.includes('s')) {
    bottom = clamp(
      rectBottom(startRect) + deltaY,
      top + minimumHeight,
      rectBottom(bounds)
    );
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};

const clampFixedWidth = (
  requestedWidth: number,
  minWidth: number,
  maxWidth: number
) => {
  const safeMaxWidth = Math.max(0, maxWidth);
  const safeMinWidth = Math.min(minWidth, safeMaxWidth);

  return clamp(requestedWidth, safeMinWidth, safeMaxWidth);
};

const resizeFixedCornerCropRect = (
  action: ImageCropperDragAction,
  startRect: CropperRect,
  deltaX: number,
  deltaY: number,
  bounds: CropperRect,
  aspectRatio: number,
  minSize: number
): CropperRect => {
  const isWest = action.includes('w');
  const isNorth = action.includes('n');
  const anchorX = isWest ? rectRight(startRect) : startRect.x;
  const anchorY = isNorth ? rectBottom(startRect) : startRect.y;
  const movingX = isWest ? startRect.x + deltaX : rectRight(startRect) + deltaX;
  const movingY = isNorth
    ? startRect.y + deltaY
    : rectBottom(startRect) + deltaY;
  const rawWidth = Math.abs(movingX - anchorX);
  const rawHeight = Math.abs(movingY - anchorY);
  const requestedWidth =
    rawWidth / aspectRatio > rawHeight ? rawWidth : rawHeight * aspectRatio;
  const maxWidthByX = isWest ? anchorX - bounds.x : rectRight(bounds) - anchorX;
  const maxHeightByY = isNorth
    ? anchorY - bounds.y
    : rectBottom(bounds) - anchorY;
  const maxWidth = Math.min(maxWidthByX, maxHeightByY * aspectRatio);
  const width = clampFixedWidth(requestedWidth, minSize, maxWidth);
  const height = width / aspectRatio;

  return {
    x: isWest ? anchorX - width : anchorX,
    y: isNorth ? anchorY - height : anchorY,
    width,
    height,
  };
};

const resizeFixedHorizontalCropRect = (
  action: ImageCropperDragAction,
  startRect: CropperRect,
  deltaX: number,
  bounds: CropperRect,
  aspectRatio: number,
  minSize: number
): CropperRect => {
  const isWest = action.includes('w');
  const anchorX = isWest ? rectRight(startRect) : startRect.x;
  const movingX = isWest ? startRect.x + deltaX : rectRight(startRect) + deltaX;
  const centerY = startRect.y + startRect.height / 2;
  const maxWidthByX = isWest ? anchorX - bounds.x : rectRight(bounds) - anchorX;
  const maxHalfHeight = Math.min(
    centerY - bounds.y,
    rectBottom(bounds) - centerY
  );
  const maxWidth = Math.min(maxWidthByX, maxHalfHeight * 2 * aspectRatio);
  const width = clampFixedWidth(Math.abs(movingX - anchorX), minSize, maxWidth);
  const height = width / aspectRatio;

  return {
    x: isWest ? anchorX - width : anchorX,
    y: centerY - height / 2,
    width,
    height,
  };
};

const resizeFixedVerticalCropRect = (
  action: ImageCropperDragAction,
  startRect: CropperRect,
  deltaY: number,
  bounds: CropperRect,
  aspectRatio: number,
  minSize: number
): CropperRect => {
  const isNorth = action.includes('n');
  const anchorY = isNorth ? rectBottom(startRect) : startRect.y;
  const movingY = isNorth
    ? startRect.y + deltaY
    : rectBottom(startRect) + deltaY;
  const centerX = startRect.x + startRect.width / 2;
  const maxHeightByY = isNorth
    ? anchorY - bounds.y
    : rectBottom(bounds) - anchorY;
  const maxHalfWidth = Math.min(
    centerX - bounds.x,
    rectRight(bounds) - centerX
  );
  const maxHeight = Math.min(maxHeightByY, (maxHalfWidth * 2) / aspectRatio);
  const height = clampFixedWidth(
    Math.abs(movingY - anchorY),
    minSize,
    maxHeight
  );
  const width = height * aspectRatio;

  return {
    x: centerX - width / 2,
    y: isNorth ? anchorY - height : anchorY,
    width,
    height,
  };
};

const resizeFixedCropRect = (
  action: ImageCropperDragAction,
  startRect: CropperRect,
  deltaX: number,
  deltaY: number,
  bounds: CropperRect,
  aspectRatio: number,
  minSize: number
): CropperRect => {
  if (
    (action.includes('n') || action.includes('s')) &&
    (action.includes('e') || action.includes('w'))
  ) {
    return resizeFixedCornerCropRect(
      action,
      startRect,
      deltaX,
      deltaY,
      bounds,
      aspectRatio,
      minSize
    );
  }

  if (action.includes('e') || action.includes('w')) {
    return resizeFixedHorizontalCropRect(
      action,
      startRect,
      deltaX,
      bounds,
      aspectRatio,
      minSize
    );
  }

  return resizeFixedVerticalCropRect(
    action,
    startRect,
    deltaY,
    bounds,
    aspectRatio,
    minSize
  );
};

export const getNextCropRect = (
  action: ImageCropperDragAction,
  startRect: CropperRect,
  deltaX: number,
  deltaY: number,
  bounds: CropperRect,
  aspectRatio: number | null,
  minSize: number
): CropperRect => {
  if (action === 'move') {
    return constrainCropRectToBounds(
      {
        ...startRect,
        x: startRect.x + deltaX,
        y: startRect.y + deltaY,
      },
      bounds,
      aspectRatio,
      minSize
    );
  }

  const nextRect = aspectRatio
    ? resizeFixedCropRect(
        action,
        startRect,
        deltaX,
        deltaY,
        bounds,
        aspectRatio,
        minSize
      )
    : resizeFreeCropRect(action, startRect, deltaX, deltaY, bounds, minSize);

  return constrainCropRectToBounds(nextRect, bounds, aspectRatio, minSize);
};

export const getSourceCropRect = (
  cropRect: CropperRect,
  imageRect: CropperRect,
  imageSize: CropperSize
): CropperRect => {
  const scaleX = imageSize.width / imageRect.width;
  const scaleY = imageSize.height / imageRect.height;
  const x = clamp((cropRect.x - imageRect.x) * scaleX, 0, imageSize.width);
  const y = clamp((cropRect.y - imageRect.y) * scaleY, 0, imageSize.height);
  const width = clamp(
    cropRect.width * scaleX,
    MIN_RECT_SIZE,
    imageSize.width - x
  );
  const height = clamp(
    cropRect.height * scaleY,
    MIN_RECT_SIZE,
    imageSize.height - y
  );

  return { x, y, width, height };
};
