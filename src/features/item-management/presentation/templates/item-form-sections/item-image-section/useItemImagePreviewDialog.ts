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

  const previewImageUrl =
    previewSlotIndex !== null
      ? getDisplayUrlForSlot(imageSlots[previewSlotIndex], previewSlotIndex)
      : null;

  const closePreview = useCallback(() => {
    setIsPreviewVisible(false);
    if (previewCloseTimerRef.current) {
      window.clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
    previewCloseTimerRef.current = window.setTimeout(() => {
      setPreviewSlotIndex(null);
      previewCloseTimerRef.current = null;
    }, previewExitDurationMs);
  }, []);

  const openPreview = useCallback((slotIndex: number) => {
    if (previewCloseTimerRef.current) {
      window.clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
    setPreviewSlotIndex(slotIndex);
    window.requestAnimationFrame(() => {
      setIsPreviewVisible(true);
    });
  }, []);

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
    },
    []
  );

  return {
    previewSlotIndex,
    previewImageUrl,
    isPreviewVisible,
    openPreview,
    closePreview,
  };
};
