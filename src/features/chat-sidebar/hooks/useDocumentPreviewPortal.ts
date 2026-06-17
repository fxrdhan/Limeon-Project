import { useCallback, useEffect, useRef, useState } from 'react';

interface OpenDocumentPreviewOptions {
  previewName: string;
  resolvePreviewUrl: () => Promise<{
    previewUrl: string;
    revokeOnClose: boolean;
  }>;
}

export const useDocumentPreviewPortal = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const previewOpenFrameRef = useRef<number | null>(null);
  const previewCloseTimerRef = useRef<number | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const activeOpenRequestIdRef = useRef(0);

  const releasePreviewObjectUrl = useCallback(() => {
    if (!previewObjectUrlRef.current) return;
    URL.revokeObjectURL(previewObjectUrlRef.current);
    previewObjectUrlRef.current = null;
  }, []);

  const cancelPreviewOpenFrame = useCallback(() => {
    if (previewOpenFrameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(previewOpenFrameRef.current);
    previewOpenFrameRef.current = null;
  }, []);

  const closeDocumentPreview = useCallback(() => {
    activeOpenRequestIdRef.current += 1;
    cancelPreviewOpenFrame();
    setIsPreviewVisible(false);
    if (previewCloseTimerRef.current) {
      window.clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
    previewCloseTimerRef.current = window.setTimeout(() => {
      setPreviewUrl(null);
      setPreviewName('');
      releasePreviewObjectUrl();
      previewCloseTimerRef.current = null;
    }, 150);
  }, [cancelPreviewOpenFrame, releasePreviewObjectUrl]);

  const openDocumentPreview = useCallback(
    async ({ previewName, resolvePreviewUrl }: OpenDocumentPreviewOptions) => {
      const requestId = activeOpenRequestIdRef.current + 1;
      activeOpenRequestIdRef.current = requestId;

      cancelPreviewOpenFrame();
      if (previewCloseTimerRef.current) {
        window.clearTimeout(previewCloseTimerRef.current);
        previewCloseTimerRef.current = null;
      }
      releasePreviewObjectUrl();

      const nextPreviewState = await resolvePreviewUrl();
      if (activeOpenRequestIdRef.current !== requestId) {
        if (nextPreviewState.revokeOnClose) {
          URL.revokeObjectURL(nextPreviewState.previewUrl);
        }
        return false;
      }

      previewObjectUrlRef.current = nextPreviewState.revokeOnClose
        ? nextPreviewState.previewUrl
        : null;
      setPreviewUrl(nextPreviewState.previewUrl);
      setPreviewName(previewName);
      const frameId = window.requestAnimationFrame(() => {
        if (
          activeOpenRequestIdRef.current === requestId &&
          previewOpenFrameRef.current === frameId
        ) {
          previewOpenFrameRef.current = null;
          setIsPreviewVisible(true);
        }
      });
      previewOpenFrameRef.current = frameId;

      return true;
    },
    [cancelPreviewOpenFrame, releasePreviewObjectUrl]
  );

  useEffect(() => {
    return () => {
      activeOpenRequestIdRef.current += 1;
      cancelPreviewOpenFrame();
      if (previewCloseTimerRef.current) {
        window.clearTimeout(previewCloseTimerRef.current);
        previewCloseTimerRef.current = null;
      }
      releasePreviewObjectUrl();
    };
  }, [cancelPreviewOpenFrame, releasePreviewObjectUrl]);

  return {
    previewUrl,
    previewName,
    isPreviewVisible,
    closeDocumentPreview,
    openDocumentPreview,
  };
};
