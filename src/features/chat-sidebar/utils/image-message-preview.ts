import {
  IMAGE_MESSAGE_PREVIEW_OUTPUT_QUALITY,
  IMAGE_MESSAGE_PREVIEW_TARGET_SIZE,
} from '../constants';
import { buildImagePreviewStoragePath } from './image-preview-path';

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
      reject(new Error('Failed to load image preview source'));
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

const renderImagePreviewBlob = async (file: Blob) => {
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
  const outputSize = Math.max(
    1,
    Math.min(IMAGE_MESSAGE_PREVIEW_TARGET_SIZE, sourceSquareSize)
  );
  const sourceX = Math.max(0, Math.round((sourceWidth - sourceSquareSize) / 2));
  const sourceY = Math.max(
    0,
    Math.round((sourceHeight - sourceSquareSize) / 2)
  );
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;

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
    outputSize,
    outputSize
  );

  const encodedPreviewBlob =
    (await renderCanvasBlob(
      canvas,
      'image/webp',
      IMAGE_MESSAGE_PREVIEW_OUTPUT_QUALITY
    )) ||
    (await renderCanvasBlob(
      canvas,
      'image/jpeg',
      IMAGE_MESSAGE_PREVIEW_OUTPUT_QUALITY
    )) ||
    (await renderCanvasBlob(canvas, 'image/png'));

  return encodedPreviewBlob;
};

export const createImagePreviewUploadArtifact = async (
  file: Blob,
  storagePath: string
) => {
  const previewBlob = await renderImagePreviewBlob(file);
  if (!previewBlob) {
    return null;
  }

  const previewStoragePath = buildImagePreviewStoragePath(
    storagePath,
    previewBlob.type
  );
  if (!previewStoragePath) {
    return null;
  }

  return {
    previewFile: new File(
      [previewBlob],
      previewStoragePath.split('/').pop() || 'preview',
      {
        type: previewBlob.type,
        lastModified: Date.now(),
      }
    ),
    previewStoragePath,
  };
};
