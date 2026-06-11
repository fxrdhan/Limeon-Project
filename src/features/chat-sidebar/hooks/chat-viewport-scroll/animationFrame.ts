export const cancelAnimationFrameSafely = (frameId: number | null) => {
  if (frameId === null) {
    return;
  }

  const cancelAnimationFrameFn =
    typeof window !== 'undefined' &&
    typeof window.cancelAnimationFrame === 'function'
      ? window.cancelAnimationFrame.bind(window)
      : typeof cancelAnimationFrame === 'function'
        ? cancelAnimationFrame
        : null;

  cancelAnimationFrameFn?.(frameId);
};
