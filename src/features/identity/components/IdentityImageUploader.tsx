import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { TbPhotoUp } from 'react-icons/tb';
import ImageUploader from '@/components/image-manager';
import { useIdentityModalContext } from '@/contexts/IdentityModalContext';
import {
  cacheImageBlob,
  getCachedImage,
  getCachedImageBlobUrl,
  setCachedImage,
} from '@/utils/imageCache';

const IdentityImageUploader: React.FC = () => {
  const {
    currentImageUrl,
    isUploadingImage,
    localData,
    mode,
    imageAspectRatio,
    imageUploadText,
    imageNotAvailableText,
    defaultImageUrl,
    imagePlaceholder,
    handleImageUpload,
    handleImageDeleteInternal,
  } = useIdentityModalContext();

  const aspectRatioClass =
    imageAspectRatio === 'square' ? 'aspect-square' : 'aspect-video';
  const cacheKey = useMemo(() => {
    const entityId = localData?.id ? String(localData.id) : null;
    return entityId ? `identity:${entityId}` : null;
  }, [localData?.id]);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const cachedImageUrl = cacheKey ? getCachedImage(cacheKey) : null;
  const sourceImageUrl =
    currentImageUrl || cachedImageUrl || defaultImageUrl || null;
  const hasImage = Boolean(currentImageUrl || cachedImageUrl);

  useEffect(() => {
    if (!cacheKey || !currentImageUrl) return;
    if (currentImageUrl.startsWith('http')) {
      setCachedImage(cacheKey, currentImageUrl);
    }
  }, [cacheKey, currentImageUrl]);

  useEffect(() => {
    let isActive = true;

    const resolveImage = async () => {
      if (!sourceImageUrl) {
        await Promise.resolve();
        if (isActive) setDisplayImageUrl(null);
        return;
      }

      if (!sourceImageUrl.startsWith('http')) {
        await Promise.resolve();
        if (isActive) setDisplayImageUrl(sourceImageUrl);
        return;
      }

      const cachedBlobUrl = await getCachedImageBlobUrl(sourceImageUrl);
      if (cachedBlobUrl) {
        if (isActive) setDisplayImageUrl(cachedBlobUrl);
        return;
      }

      const blobUrl = await cacheImageBlob(sourceImageUrl);
      if (isActive) {
        setDisplayImageUrl(blobUrl || sourceImageUrl);
      }
    };

    void resolveImage();

    return () => {
      isActive = false;
    };
  }, [sourceImageUrl]);

  const renderImageContent = () => {
    if (displayImageUrl) {
      return (
        <img
          src={displayImageUrl}
          alt={String(localData?.name ?? 'Detail')}
          className={`w-full h-auto ${aspectRatioClass} object-cover rounded-lg border border-slate-200 transition duration-200 group-hover:brightness-95`}
        />
      );
    }

    if (mode === 'add') {
      return (
        <div
          className={`w-full ${aspectRatioClass} flex items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50 transition duration-200 group-hover:bg-slate-100`}
        >
          <div className="text-center p-4">
            <TbPhotoUp className="mx-auto h-8 w-8 text-slate-400" />
            <span className="sr-only">{imageUploadText}</span>
          </div>
        </div>
      );
    }

    if (defaultImageUrl) {
      return (
        <img
          src={defaultImageUrl}
          alt={String(localData?.name ?? 'Detail')}
          className={`w-full h-auto ${aspectRatioClass} object-cover rounded-lg border border-slate-200 transition duration-200 group-hover:brightness-95`}
        />
      );
    }

    if (imagePlaceholder) {
      return (
        <img
          src={imagePlaceholder}
          alt={String(localData?.name ?? 'Detail')}
          className={`w-full h-auto ${aspectRatioClass} object-cover rounded-lg border border-slate-200 transition duration-200 group-hover:brightness-95`}
        />
      );
    }

    return (
      <div
        className={`w-full ${aspectRatioClass} flex items-center justify-center border border-slate-200 rounded-lg bg-slate-50 transition duration-200 group-hover:bg-slate-100`}
      >
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-8 h-8 text-slate-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">{imageNotAvailableText}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex justify-center mb-6">
      <div className="relative group w-48">
        <ImageUploader
          id="detail-image-upload"
          className="w-full"
          shape="rounded"
          onImageUpload={handleImageUpload}
          onImageDelete={handleImageDeleteInternal}
          hasImage={hasImage}
          disabled={isUploadingImage}
          interaction="direct"
          loadingIcon={null}
          validTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
        >
          {renderImageContent()}
        </ImageUploader>
      </div>
    </div>
  );
};

export default IdentityImageUploader;
