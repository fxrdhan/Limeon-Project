import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cacheImageBlob,
  getCachedImageBlobUrl,
  releaseCachedImageBlobs,
} from '@/utils/imageCache';

export const useItemImageDisplayUrls = (imageSlots: Array<{ url: string }>) => {
  const [displayUrls, setDisplayUrls] = useState<
    Array<{ source: string; display: string }>
  >([]);
  const retainedDisplaySourcesRef = useRef<string[]>([]);

  useEffect(() => {
    let isActive = true;
    let didCommit = false;
    const previousSources = retainedDisplaySourcesRef.current;
    const nextSources = imageSlots
      .map(slot => slot.url)
      .filter(source => source && source.startsWith('http'));
    const nextSourceSet = new Set(nextSources);
    const releaseSources = previousSources.filter(
      source => !nextSourceSet.has(source)
    );

    const resolveDisplayUrls = async () => {
      const results = await Promise.all(
        imageSlots.map(async slot => {
          const source = slot.url || '';
          if (!source) return { source: '', display: '' };
          if (!source.startsWith('http')) return { source, display: source };
          const cachedBlobUrl = await getCachedImageBlobUrl(source);
          if (cachedBlobUrl) return { source, display: cachedBlobUrl };
          const blobUrl = await cacheImageBlob(source);
          return { source, display: blobUrl || source };
        })
      );

      if (!isActive) {
        releaseCachedImageBlobs(nextSources);
        return;
      }

      releaseCachedImageBlobs(releaseSources);
      retainedDisplaySourcesRef.current = nextSources;
      setDisplayUrls(results);
      didCommit = true;
    };

    void resolveDisplayUrls();

    return () => {
      if (!didCommit) {
        releaseCachedImageBlobs(nextSources);
      }
      isActive = false;
    };
  }, [imageSlots]);

  useEffect(() => {
    return () => {
      releaseCachedImageBlobs(retainedDisplaySourcesRef.current);
      retainedDisplaySourcesRef.current = [];
    };
  }, []);

  const getDisplayUrlForSlot = useCallback(
    (slot: { url: string }, index: number) =>
      displayUrls[index]?.source === slot.url
        ? displayUrls[index]?.display || slot.url
        : slot.url,
    [displayUrls]
  );

  return {
    getDisplayUrlForSlot,
  };
};
