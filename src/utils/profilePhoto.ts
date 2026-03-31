import {
  PROFILE_PHOTO_THUMBNAIL_OUTPUT_QUALITY,
  PROFILE_PHOTO_THUMBNAIL_SIZE,
  buildProfilePhotoStoragePath,
  buildProfilePhotoThumbnailStoragePath,
} from '../../shared/profilePhotoPaths';

const loadImageElement = (file: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const imageElement = new Image();

    imageElement.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(imageElement);
    };
    imageElement.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load profile photo source'));
    };
    imageElement.src = objectUrl;
  });

const renderCanvasBlob = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
) =>
  new Promise<Blob | null>(resolve => {
    canvas.toBlob(resolve, mimeType, quality);
  });

export const createProfilePhotoThumbnailBlob = async (file: Blob) => {
  if (typeof document === 'undefined') {
    return null;
  }

  const imageElement = await loadImageElement(file);
  const sourceWidth = imageElement.naturalWidth || imageElement.width;
  const sourceHeight = imageElement.naturalHeight || imageElement.height;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return null;
  }

  const sourceSquareSize = Math.min(sourceWidth, sourceHeight);
  const sourceX = Math.max(0, Math.round((sourceWidth - sourceSquareSize) / 2));
  const sourceY = Math.max(
    0,
    Math.round((sourceHeight - sourceSquareSize) / 2)
  );
  const canvas = document.createElement('canvas');
  canvas.width = PROFILE_PHOTO_THUMBNAIL_SIZE;
  canvas.height = PROFILE_PHOTO_THUMBNAIL_SIZE;

  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    imageElement,
    sourceX,
    sourceY,
    sourceSquareSize,
    sourceSquareSize,
    0,
    0,
    PROFILE_PHOTO_THUMBNAIL_SIZE,
    PROFILE_PHOTO_THUMBNAIL_SIZE
  );

  const thumbnailBlob =
    (await renderCanvasBlob(
      canvas,
      'image/webp',
      PROFILE_PHOTO_THUMBNAIL_OUTPUT_QUALITY
    )) ||
    (await renderCanvasBlob(
      canvas,
      'image/jpeg',
      PROFILE_PHOTO_THUMBNAIL_OUTPUT_QUALITY
    )) ||
    (await renderCanvasBlob(canvas, 'image/png'));

  return thumbnailBlob;
};

export const buildProfilePhotoUploadPlan = async (
  userId: string,
  file: File
) => {
  const originalPath = buildProfilePhotoStoragePath({
    userId,
    fileName: file.name,
    mimeType: file.type,
  });
  const thumbnailBlob = await createProfilePhotoThumbnailBlob(file);

  if (!thumbnailBlob) {
    return {
      originalPath,
      thumbnailPath: null,
      thumbnailFile: null,
    };
  }

  const thumbnailPath = buildProfilePhotoThumbnailStoragePath(
    originalPath,
    thumbnailBlob.type
  );
  const thumbnailFile = new File(
    [thumbnailBlob],
    thumbnailPath.split('/').pop() || 'profile-thumb',
    {
      type: thumbnailBlob.type,
      lastModified: Date.now(),
    }
  );

  return {
    originalPath,
    thumbnailPath,
    thumbnailFile,
  };
};
