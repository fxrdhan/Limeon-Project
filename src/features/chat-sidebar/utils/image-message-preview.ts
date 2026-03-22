import {
  IMAGE_EXPAND_STAGE_TARGET_SIZE,
  IMAGE_MESSAGE_PREVIEW_OUTPUT_QUALITY,
  IMAGE_MESSAGE_PREVIEW_TARGET_SIZE,
} from '../constants';
import { chatSidebarAssetsGateway } from '../data/chatSidebarAssetsGateway';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import { buildImagePreviewStoragePath } from './image-preview-path';

const IMAGE_PREVIEW_PRIMARY_MIME_TYPE = 'image/webp';
const IMAGE_PREVIEW_FALLBACK_MIME_TYPE = 'image/jpeg';
const loadImageElement = (source: Blob | string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const imageElement = new Image();
    const objectUrl =
      typeof source === 'string' ? null : URL.createObjectURL(source);
    const imageSource = typeof source === 'string' ? source : objectUrl;

    const cleanup = () => {
      if (!objectUrl) {
        return;
      }

      URL.revokeObjectURL(objectUrl);
    };

    imageElement.onload = () => {
      cleanup();
      resolve(imageElement);
    };

    imageElement.onerror = () => {
      cleanup();
      reject(new Error('Failed to decode image preview source'));
    };

    if (!imageSource) {
      cleanup();
      reject(new Error('Failed to resolve image preview source'));
      return;
    }

    imageElement.src = imageSource;
  });

const renderImagePreviewCanvas = async (
  source: Blob | string,
  targetSize: number = IMAGE_MESSAGE_PREVIEW_TARGET_SIZE
) => {
  const imageElement = await loadImageElement(source);
  const sourceWidth = Math.max(
    imageElement.naturalWidth || imageElement.width || 1
  );
  const sourceHeight = Math.max(
    imageElement.naturalHeight || imageElement.height || 1
  );
  const longestSide = Math.max(sourceWidth, sourceHeight, 1);
  const targetScale = Math.min(targetSize / longestSide, 1);
  const targetWidth = Math.max(1, Math.round(sourceWidth * targetScale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * targetScale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(imageElement, 0, 0, targetWidth, targetHeight);

  return canvas;
};

const renderCanvasBlob = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
) =>
  new Promise<Blob | null>(resolve => {
    canvas.toBlob(
      blob => {
        resolve(blob);
      },
      mimeType,
      quality
    );
  });

export const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = () => {
      if (typeof fileReader.result === 'string') {
        resolve(fileReader.result);
        return;
      }

      reject(new Error('Failed to read image preview blob'));
    };
    fileReader.onerror = () => {
      reject(
        fileReader.error ?? new Error('Failed to read image preview blob')
      );
    };

    fileReader.readAsDataURL(blob);
  });

export const createImagePreviewUploadArtifact = async (
  file: Blob,
  filePath: string
) => {
  const canvas = await renderImagePreviewCanvas(file);
  if (!canvas) {
    return null;
  }

  let previewMimeType = IMAGE_PREVIEW_PRIMARY_MIME_TYPE;
  let previewBlob = await renderCanvasBlob(
    canvas,
    previewMimeType,
    IMAGE_MESSAGE_PREVIEW_OUTPUT_QUALITY
  );

  if (!previewBlob) {
    previewMimeType = IMAGE_PREVIEW_FALLBACK_MIME_TYPE;
    previewBlob = await renderCanvasBlob(
      canvas,
      previewMimeType,
      IMAGE_MESSAGE_PREVIEW_OUTPUT_QUALITY
    );
  }

  if (!previewBlob) {
    return null;
  }

  const previewDataUrl = canvas.toDataURL(
    previewMimeType,
    IMAGE_MESSAGE_PREVIEW_OUTPUT_QUALITY
  );
  const previewPath = buildImagePreviewStoragePath(filePath, previewMimeType);

  return {
    previewFile: new File(
      [previewBlob],
      previewPath.split('/').pop() || 'preview',
      {
        type: previewMimeType,
      }
    ),
    previewDataUrl,
    previewPath,
  };
};

export const createImageExpandStageDataUrl = async (
  source: Blob | string,
  targetSize: number = IMAGE_EXPAND_STAGE_TARGET_SIZE
) => {
  const canvas = await renderImagePreviewCanvas(source, targetSize);
  if (!canvas) {
    return null;
  }

  const webpDataUrl = canvas.toDataURL(
    IMAGE_PREVIEW_PRIMARY_MIME_TYPE,
    IMAGE_MESSAGE_PREVIEW_OUTPUT_QUALITY
  );
  if (webpDataUrl !== 'data:,') {
    return webpDataUrl;
  }

  const jpegDataUrl = canvas.toDataURL(
    IMAGE_PREVIEW_FALLBACK_MIME_TYPE,
    IMAGE_MESSAGE_PREVIEW_OUTPUT_QUALITY
  );
  return jpegDataUrl === 'data:,' ? null : jpegDataUrl;
};

export const persistImageMessagePreview = async ({
  messageId,
  file,
  fileStoragePath,
}: {
  messageId: string;
  file: Blob;
  fileStoragePath: string;
}): Promise<{
  previewDataUrl: string;
  previewPath: string;
  message: ChatMessage | null;
  error: unknown;
} | null> => {
  const renderedPreview = await createImagePreviewUploadArtifact(
    file,
    fileStoragePath
  );
  if (!renderedPreview) {
    return null;
  }

  await chatSidebarAssetsGateway.uploadImagePreview(
    renderedPreview.previewFile,
    renderedPreview.previewPath,
    renderedPreview.previewFile.type
  );

  const { data, error } = await chatSidebarMessagesGateway.updateFilePreview(
    messageId,
    {
      file_preview_url: renderedPreview.previewPath,
      file_preview_page_count: null,
      file_preview_status: 'ready',
      file_preview_error: null,
    }
  );

  return {
    previewDataUrl: renderedPreview.previewDataUrl,
    previewPath: renderedPreview.previewPath,
    message: data,
    error,
  };
};
