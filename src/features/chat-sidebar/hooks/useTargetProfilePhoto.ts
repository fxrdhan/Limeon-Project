import { useEffect, useState } from 'react';
import {
  cacheImageBlob,
  getCachedImageBlobUrl,
  releaseCachedImageBlob,
  setCachedImage,
} from '@/utils/imageCache';

export const useTargetProfilePhoto = (targetUser?: {
  id: string;
  profilephoto?: string | null;
}) => {
  const [displayTargetPhotoUrl, setDisplayTargetPhotoUrl] = useState<
    string | null
  >(null);
  const targetProfilePhotoUrl = targetUser?.profilephoto ?? null;
  const targetCacheKey = targetUser?.id ? `profile:${targetUser.id}` : null;

  useEffect(() => {
    if (!targetCacheKey || !targetProfilePhotoUrl) return;
    if (targetProfilePhotoUrl.startsWith('http')) {
      setCachedImage(targetCacheKey, targetProfilePhotoUrl);
    }
  }, [targetCacheKey, targetProfilePhotoUrl]);

  useEffect(() => {
    let isActive = true;

    const resolveImage = async () => {
      if (!targetProfilePhotoUrl) {
        if (isActive) setDisplayTargetPhotoUrl(null);
        return;
      }

      if (!targetProfilePhotoUrl.startsWith('http')) {
        if (isActive) setDisplayTargetPhotoUrl(targetProfilePhotoUrl);
        return;
      }

      const cachedBlobUrl = await getCachedImageBlobUrl(targetProfilePhotoUrl);
      if (cachedBlobUrl) {
        if (isActive) setDisplayTargetPhotoUrl(cachedBlobUrl);
        return;
      }

      const blobUrl = await cacheImageBlob(targetProfilePhotoUrl);
      if (isActive) {
        setDisplayTargetPhotoUrl(blobUrl || targetProfilePhotoUrl);
      }
    };

    void resolveImage();

    return () => {
      isActive = false;
      if (targetProfilePhotoUrl?.startsWith('http')) {
        releaseCachedImageBlob(targetProfilePhotoUrl);
      }
    };
  }, [targetProfilePhotoUrl]);

  return {
    displayTargetPhotoUrl,
  };
};
