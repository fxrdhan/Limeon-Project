import { useCallback, useEffect, useRef } from 'react';

export const useLocalImagePreviews = () => {
  const localPreviewUrlsRef = useRef<Record<number, string>>({});

  const revokeLocalPreview = useCallback((slotIndex: number) => {
    const existing = localPreviewUrlsRef.current[slotIndex];
    if (!existing) return;
    URL.revokeObjectURL(existing);
    delete localPreviewUrlsRef.current[slotIndex];
  }, []);

  const setLocalPreviewForSlot = useCallback(
    (slotIndex: number, file: File) => {
      const objectUrl = URL.createObjectURL(file);
      const existing = localPreviewUrlsRef.current[slotIndex];
      if (existing) {
        URL.revokeObjectURL(existing);
      }
      localPreviewUrlsRef.current[slotIndex] = objectUrl;
      return objectUrl;
    },
    []
  );

  useEffect(() => {
    return () => {
      Object.values(localPreviewUrlsRef.current).forEach(url => {
        URL.revokeObjectURL(url);
      });
      localPreviewUrlsRef.current = {};
    };
  }, []);

  return {
    revokeLocalPreview,
    setLocalPreviewForSlot,
  };
};
