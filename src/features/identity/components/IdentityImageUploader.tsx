import React from 'react';
import ImageUploader from '@/components/image-manager';
import { FaPencilAlt } from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import { useIdentityModalContext } from '@/contexts/IdentityModalContext';

const IdentityImageUploader: React.FC = () => {
  const {
    currentImageUrl,
    isUploadingImage,
    localData,
    mode,
    imageAspectRatio,
    imageUploadText,
    imageFormatHint,
    imageNotAvailableText,
    defaultImageUrl,
    imagePlaceholder,
    handleImageUpload,
    handleImageDeleteInternal,
  } = useIdentityModalContext();

  const aspectRatioClass =
    imageAspectRatio === 'square' ? 'aspect-square' : 'aspect-video';

  const renderImageContent = () => {
    if (currentImageUrl) {
      return (
        <img
          src={currentImageUrl}
          alt={String(localData?.name ?? 'Detail')}
          className={`w-full h-auto ${aspectRatioClass} object-cover rounded-md border border-gray-200`}
        />
      );
    }

    if (mode === 'add') {
      return (
        <div
          className={`w-full ${aspectRatioClass} flex items-center justify-center border border-dashed border-gray-300 rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors`}
        >
          <div className="text-center p-4">
            <p className="text-sm font-medium text-gray-600">
              {imageUploadText}
            </p>
            <p className="text-xs text-gray-400 mt-1">{imageFormatHint}</p>
          </div>
        </div>
      );
    }

    if (defaultImageUrl) {
      return (
        <img
          src={defaultImageUrl}
          alt={String(localData?.name ?? 'Detail')}
          className={`w-full h-auto ${aspectRatioClass} object-cover rounded-md border border-gray-200`}
        />
      );
    }

    if (imagePlaceholder) {
      return (
        <img
          src={imagePlaceholder}
          alt={String(localData?.name ?? 'Detail')}
          className={`w-full h-auto ${aspectRatioClass} object-cover rounded-md border border-gray-200`}
        />
      );
    }

    return (
      <div
        className={`w-full ${aspectRatioClass} flex items-center justify-center border border-gray-200 rounded-md bg-gray-50`}
      >
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-8 h-8 text-gray-400"
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
          <p className="text-gray-500 font-medium">{imageNotAvailableText}</p>
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
          disabled={isUploadingImage || mode !== 'add'}
          loadingIcon={
            <ClipLoader color="#ffffff" size={20} loading={true} />
          }
          defaultIcon={<FaPencilAlt className="text-white text-lg" />}
        >
          {renderImageContent()}
        </ImageUploader>
      </div>
    </div>
  );
};

export default IdentityImageUploader;
