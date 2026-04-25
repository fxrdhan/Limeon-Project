export type KeyboardScrollDirection = "up" | "down";

export type KeyboardScrollTarget = {
  scrollTop: number;
  direction: KeyboardScrollDirection;
};

export type KeyboardPinnedHighlightFrame = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export const KEYBOARD_SCROLL_VISIBILITY_INSET = 4;

type GetKeyboardScrollTargetOptions = {
  container: HTMLElement;
  targetElement: HTMLElement;
  targetIndex: number;
  itemCount: number;
  visibilityInset?: number;
};

export const getKeyboardScrollTarget = ({
  container,
  targetElement,
  targetIndex,
  itemCount,
  visibilityInset = KEYBOARD_SCROLL_VISIBILITY_INSET,
}: GetKeyboardScrollTargetOptions): KeyboardScrollTarget | null => {
  const itemTop = targetElement.offsetTop;
  const itemBottom = itemTop + targetElement.offsetHeight;
  const containerScrollTop = container.scrollTop;
  const containerHeight = container.clientHeight;

  if (itemTop < containerScrollTop + visibilityInset) {
    return {
      scrollTop: Math.max(0, itemTop - visibilityInset),
      direction: "up",
    };
  }

  if (itemBottom > containerScrollTop + containerHeight - visibilityInset) {
    const scrollTop =
      targetIndex === itemCount - 1
        ? container.scrollHeight - containerHeight
        : itemBottom - containerHeight + visibilityInset;

    return {
      scrollTop: Math.max(0, scrollTop),
      direction: "down",
    };
  }

  return null;
};

type GetPinnedHighlightFrameOptions = {
  container: HTMLElement;
  frameRootElement: HTMLElement;
  targetElement: HTMLElement;
  scrollDirection: KeyboardScrollDirection;
  sourceElement?: HTMLElement | null;
  forceTargetEdgeFrame?: boolean;
  visibilityInset?: number;
};

export const getKeyboardPinnedHighlightFrame = ({
  container,
  frameRootElement,
  targetElement,
  scrollDirection,
  sourceElement,
  forceTargetEdgeFrame = false,
  visibilityInset = KEYBOARD_SCROLL_VISIBILITY_INSET,
}: GetPinnedHighlightFrameOptions): KeyboardPinnedHighlightFrame => {
  const containerScrollTop = container.scrollTop;
  const containerHeight = container.clientHeight;
  const frameElement = forceTargetEdgeFrame
    ? targetElement
    : getPinnedFrameElement({
        containerHeight,
        containerScrollTop,
        scrollDirection,
        sourceElement,
        targetElement,
        visibilityInset,
      });
  const frameRect = frameElement.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const rootRect = frameRootElement.getBoundingClientRect();
  const edgeFrameTop =
    scrollDirection === "up"
      ? containerRect.top + visibilityInset - rootRect.top
      : containerRect.bottom - visibilityInset - targetElement.offsetHeight - rootRect.top;

  if (forceTargetEdgeFrame) {
    return {
      top: edgeFrameTop,
      left: frameRect.left - rootRect.left,
      width: frameRect.width,
      height: frameRect.height,
    };
  }

  const sourceIsPinnedToEdge =
    sourceElement !== null && sourceElement !== undefined && frameElement === sourceElement;
  const sourceFrameTop = frameRect.top - rootRect.top;
  const frameTop = sourceIsPinnedToEdge
    ? scrollDirection === "up"
      ? Math.max(sourceFrameTop, edgeFrameTop)
      : Math.min(sourceFrameTop, edgeFrameTop)
    : edgeFrameTop;

  return {
    top: frameTop,
    left: frameRect.left - rootRect.left,
    width: frameRect.width,
    height: frameRect.height,
  };
};

const getPinnedFrameElement = ({
  containerHeight,
  containerScrollTop,
  scrollDirection,
  sourceElement,
  targetElement,
  visibilityInset,
}: {
  containerHeight: number;
  containerScrollTop: number;
  scrollDirection: KeyboardScrollDirection;
  sourceElement?: HTMLElement | null;
  targetElement: HTMLElement;
  visibilityInset: number;
}): HTMLElement => {
  if (!sourceElement) return targetElement;

  const sourceTop = sourceElement.offsetTop;
  const sourceBottom = sourceTop + sourceElement.offsetHeight;
  const sourceIsVisible =
    sourceBottom > containerScrollTop + visibilityInset &&
    sourceTop < containerScrollTop + containerHeight - visibilityInset;
  const sourceIsPinnedToEdge =
    sourceIsVisible &&
    (scrollDirection === "up"
      ? sourceTop <= containerScrollTop + visibilityInset
      : sourceBottom >= containerScrollTop + containerHeight - visibilityInset);

  return sourceIsPinnedToEdge ? sourceElement : targetElement;
};

export const isWrappedKeyboardScroll = ({
  sourceIndex,
  targetIndex,
  itemCount,
}: {
  sourceIndex: number | null;
  targetIndex: number;
  itemCount: number;
}) => {
  const lastIndex = itemCount - 1;

  return (
    sourceIndex !== null &&
    lastIndex > 0 &&
    ((sourceIndex === lastIndex && targetIndex === 0) ||
      (sourceIndex === 0 && targetIndex === lastIndex))
  );
};

export const hasKeyboardScrollTargetSettled = ({
  container,
  scrollTop,
  targetElement,
}: {
  container: HTMLElement;
  scrollTop: number;
  targetElement: HTMLElement;
}) => {
  const targetTop = targetElement.offsetTop;
  const targetBottom = targetTop + targetElement.offsetHeight;
  const targetIsVisible =
    targetTop >= container.scrollTop &&
    targetBottom <= container.scrollTop + container.clientHeight;
  const hasReachedScrollTarget = Math.abs(container.scrollTop - scrollTop) <= 1;

  return targetIsVisible && hasReachedScrollTarget;
};
