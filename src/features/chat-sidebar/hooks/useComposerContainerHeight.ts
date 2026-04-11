import { useLayoutEffect, useState, type RefObject } from 'react';
import { getComposerVisibleStackMetrics } from '../utils/composer-stack-metrics';

interface UseComposerContainerHeightProps {
  composerContainerRef: RefObject<HTMLDivElement | null>;
  composerContextualOffset: number;
  isMessageInputMultiline: boolean;
  messageInputHeight: number;
  pendingComposerAttachmentsCount: number;
}

export const useComposerContainerHeight = ({
  composerContainerRef,
  composerContextualOffset,
  isMessageInputMultiline,
  messageInputHeight,
  pendingComposerAttachmentsCount,
}: UseComposerContainerHeightProps) => {
  const [composerContainerHeight, setComposerContainerHeight] = useState(0);

  useLayoutEffect(() => {
    const composerContainer = composerContainerRef.current;
    if (!composerContainer) return;

    const updateComposerContainerHeight = () => {
      const visibleStackMetrics =
        getComposerVisibleStackMetrics(composerContainer);
      setComposerContainerHeight(
        visibleStackMetrics ? Math.round(visibleStackMetrics.height) : 0
      );
    };

    updateComposerContainerHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateComposerContainerHeight();
    });
    resizeObserver.observe(composerContainer);
    Array.from(composerContainer.children).forEach(child => {
      if (child instanceof HTMLElement) {
        resizeObserver.observe(child);
      }
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    composerContainerRef,
    composerContextualOffset,
    isMessageInputMultiline,
    messageInputHeight,
    pendingComposerAttachmentsCount,
  ]);

  return {
    composerContainerHeight,
  };
};
