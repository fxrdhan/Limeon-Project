import { useCallback, useEffect, useRef, useState } from 'react';

const previewExitDurationMs = 150;

export const useItemImagePreviewDialog = ({
  imageSlots,
  getDisplayUrlForSlot,
}: {
  imageSlots: Array<{ url: string }>;
  getDisplayUrlForSlot: (slot: { url: string }, index: number) => string;
}) => {
  const [previewSlotIndex, setPreviewSlotIndex] = useState<number | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const previewCloseTimerRef = useRef<number | null>(null);
  const previewOpenFrameRef = useRef<number | null>(null);

  const previewImageUrl =
    previewSlotIndex !== null
      ? getDisplayUrlForSlot(imageSlots[previewSlotIndex], previewSlotIndex)
      : null;

  const clearPreviewOpenFrame = useCallback(() => {
    if (previewOpenFrameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(previewOpenFrameRef.current);
    previewOpenFrameRef.current = null;
  }, []);

  const closePreview = useCallback(() => {
    clearPreviewOpenFrame();
    if (previewCloseTimerRef.current) {
      window.clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
    setIsPreviewVisible(false);
    previewCloseTimerRef.current = window.setTimeout(() => {
      setPreviewSlotIndex(null);
      previewCloseTimerRef.current = null;
    }, previewExitDurationMs);
  }, [clearPreviewOpenFrame]);

  const openPreview = useCallback(
    (slotIndex: number) => {
      clearPreviewOpenFrame();
      if (previewCloseTimerRef.current) {
        window.clearTimeout(previewCloseTimerRef.current);
        previewCloseTimerRef.current = null;
      }
      setPreviewSlotIndex(slotIndex);
      previewOpenFrameRef.current = window.requestAnimationFrame(() => {
        previewOpenFrameRef.current = null;
        setIsPreviewVisible(true);
      });
    },
    [clearPreviewOpenFrame]
  );

  useEffect(() => {
    if (previewSlotIndex === null) return;
    if (!imageSlots[previewSlotIndex]?.url) {
      closePreview();
    }
  }, [closePreview, imageSlots, previewSlotIndex]);

  useEffect(
    () => () => {
      if (previewCloseTimerRef.current) {
        window.clearTimeout(previewCloseTimerRef.current);
      }
      clearPreviewOpenFrame();
    },
    [clearPreviewOpenFrame]
  );

  return {
    previewSlotIndex,
    previewImageUrl,
    isPreviewVisible,
    openPreview,
    closePreview,
  };
};
