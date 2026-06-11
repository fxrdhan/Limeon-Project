import { useCallback, useRef } from 'react';

interface UseMenuOpenScrollAnimationProps {
  cancelNextFrame: (frameId: number) => void;
  requestNextFrame: (callback: FrameRequestCallback) => number;
}

export const useMenuOpenScrollAnimation = ({
  cancelNextFrame,
  requestNextFrame,
}: UseMenuOpenScrollAnimationProps) => {
  const menuOpenScrollAnimationFrameRef = useRef<number | null>(null);

  const cancelMenuOpenScrollAnimation = useCallback(() => {
    if (menuOpenScrollAnimationFrameRef.current === null) {
      return;
    }

    cancelNextFrame(menuOpenScrollAnimationFrameRef.current);
    menuOpenScrollAnimationFrameRef.current = null;
  }, [cancelNextFrame]);

  const animateMenuOpenScroll = useCallback(
    (
      container: HTMLDivElement,
      targetScrollTop: number,
      onComplete?: () => void
    ) => {
      const startScrollTop = container.scrollTop;
      const distance = targetScrollTop - startScrollTop;

      if (Math.abs(distance) < 0.5) {
        container.scrollTop = targetScrollTop;
        onComplete?.();
        return;
      }

      cancelMenuOpenScrollAnimation();

      const totalFrames = Math.min(
        18,
        Math.max(8, Math.round(Math.abs(distance) / 18))
      );
      let currentFrame = 0;

      const step = () => {
        currentFrame += 1;
        const progress = currentFrame / totalFrames;
        const easedProgress = 1 - (1 - progress) ** 4;

        container.scrollTop = startScrollTop + distance * easedProgress;

        if (currentFrame < totalFrames) {
          menuOpenScrollAnimationFrameRef.current = requestNextFrame(step);
          return;
        }

        container.scrollTop = targetScrollTop;
        menuOpenScrollAnimationFrameRef.current = null;
        onComplete?.();
      };

      menuOpenScrollAnimationFrameRef.current = requestNextFrame(step);
    },
    [cancelMenuOpenScrollAnimation, requestNextFrame]
  );

  return {
    animateMenuOpenScroll,
    cancelMenuOpenScrollAnimation,
  };
};
