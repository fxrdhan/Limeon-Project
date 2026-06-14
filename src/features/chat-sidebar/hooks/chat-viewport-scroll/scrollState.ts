export const isViewportAtTop = ({
  scrollTop,
  wasAtTopVisible,
}: {
  scrollTop: number;
  wasAtTopVisible: boolean;
}) => scrollTop <= (wasAtTopVisible ? 14 : 2);

export const getComposerResizePreservedScrollTop = ({
  scrollTop,
  scrollHeight,
  clientHeight,
  previousComposerContainerHeight,
  nextComposerContainerHeight,
}: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  previousComposerContainerHeight: number;
  nextComposerContainerHeight: number;
}) => {
  const composerHeightDelta =
    nextComposerContainerHeight - previousComposerContainerHeight;
  if (Math.abs(composerHeightDelta) < 0.5) {
    return null;
  }

  const nextScrollTop = Math.min(
    Math.max(scrollTop + composerHeightDelta, 0),
    Math.max(0, scrollHeight - clientHeight)
  );

  return Math.abs(nextScrollTop - scrollTop) < 0.5 ? null : nextScrollTop;
};
