import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { TbPhotoOff, TbPhotoUp } from 'react-icons/tb';
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
    pendingImageDelete,
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
  const sourceImageUrl = pendingImageDelete
    ? null
    : currentImageUrl || cachedImageUrl || defaultImageUrl || null;
  const hasImage = pendingImageDelete
    ? false
    : Boolean(currentImageUrl || cachedImageUrl);

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
          className={`w-full h-auto ${aspectRatioClass} object-cover rounded-xl border border-slate-200 transition duration-200 group-hover:brightness-95`}
        />
      );
    }

    if (mode === 'add') {
      return (
        <div
          className={`w-full ${aspectRatioClass} flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50 transition duration-200 group-hover:bg-slate-100`}
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
          className={`w-full h-auto ${aspectRatioClass} object-cover rounded-xl border border-slate-200 transition duration-200 group-hover:brightness-95`}
        />
      );
    }

    if (imagePlaceholder) {
      return (
        <img
          src={imagePlaceholder}
          alt={String(localData?.name ?? 'Detail')}
          className={`w-full h-auto ${aspectRatioClass} object-cover rounded-xl border border-slate-200 transition duration-200 group-hover:brightness-95`}
        />
      );
    }

    return (
      <div
        className={`w-full ${aspectRatioClass} flex items-center justify-center border border-slate-200 rounded-xl bg-slate-50 transition duration-200 group-hover:bg-slate-100`}
      >
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <TbPhotoOff className="w-8 h-8 text-slate-400" />
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
