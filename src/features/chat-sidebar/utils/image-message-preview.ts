import { IMAGE_MESSAGE_PREVIEW_TARGET_SIZE } from '../constants';
import { chatSidebarAssetsGateway } from '../data/chatSidebarAssetsGateway';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';

const IMAGE_PREVIEW_PRIMARY_MIME_TYPE = 'image/webp';
const IMAGE_PREVIEW_FALLBACK_MIME_TYPE = 'image/jpeg';
const IMAGE_PREVIEW_QUALITY = 0.72;

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
      reject(new Error('Failed to decode image preview source'));
    };

    imageElement.src = objectUrl;
  });

const renderImagePreviewCanvas = async (
  file: Blob,
  targetSize: number = IMAGE_MESSAGE_PREVIEW_TARGET_SIZE
) => {
  const imageElement = await loadImageElement(file);
  const maxSourceSide = Math.max(
    imageElement.naturalWidth || imageElement.width || 1,
    imageElement.naturalHeight || imageElement.height || 1
  );
  const scale = Math.min(1, targetSize / maxSourceSide);
  const targetWidth = Math.max(
    1,
    Math.round((imageElement.naturalWidth || imageElement.width || 1) * scale)
  );
  const targetHeight = Math.max(
    1,
    Math.round((imageElement.naturalHeight || imageElement.height || 1) * scale)
  );
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
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

const getPreviewExtension = (mimeType: string) =>
  mimeType === IMAGE_PREVIEW_PRIMARY_MIME_TYPE ? 'webp' : 'jpg';

export const buildImagePreviewStoragePath = (
  filePath: string,
  mimeType = IMAGE_PREVIEW_PRIMARY_MIME_TYPE
) => {
  const normalizedPath = filePath.replace(/^(images|documents)\//, 'previews/');
  const extension = getPreviewExtension(mimeType);

  if (/\.[^./]+$/.test(normalizedPath)) {
    return normalizedPath.replace(/\.[^./]+$/, `.${extension}`);
  }

  return `${normalizedPath}.${extension}`;
};

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
    IMAGE_PREVIEW_QUALITY
  );

  if (!previewBlob) {
    previewMimeType = IMAGE_PREVIEW_FALLBACK_MIME_TYPE;
    previewBlob = await renderCanvasBlob(
      canvas,
      previewMimeType,
      IMAGE_PREVIEW_QUALITY
    );
  }

  if (!previewBlob) {
    return null;
  }

  const previewDataUrl = canvas.toDataURL(
    previewMimeType,
    IMAGE_PREVIEW_QUALITY
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
