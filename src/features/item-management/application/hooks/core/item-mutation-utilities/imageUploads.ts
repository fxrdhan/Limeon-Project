import { StorageService } from '@/services/api/storage.service';
import { compressImageIfNeeded } from '@/utils/image';
import { itemDataService } from '../../../../infrastructure/itemData.service';

const ITEM_IMAGE_BUCKET = 'item_images';
const MAX_ITEM_IMAGE_UPLOAD_BYTES = 1024 * 1024;
const ALLOWED_ITEM_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const isTempImageUrl = (url: string) =>
  url.startsWith('blob:') || url.startsWith('data:');

const getFileExtension = (file: File) => {
  const parts = file.name.split('.');
  const nameExtension = parts.length > 1 ? parts[parts.length - 1] : '';
  if (nameExtension) return nameExtension.toLowerCase();
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
};

const buildHistoryImagePath = (
  itemId: string,
  slotIndex: number,
  file: File
) => {
  const extension = getFileExtension(file);
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `items/${itemId}/history/slot-${slotIndex}-${uniqueSuffix}.${extension}`;
};

const fileFromDataUrl = (dataUrl: string, filename: string) => {
  const [metadata, data] = dataUrl.split(',');
  const mimeMatch = metadata?.match(/data:(.*?);/);
  const mimeType = mimeMatch?.[1] || 'image/jpeg';
  const binary = atob(data || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mimeType });
};

const fileFromUrl = async (url: string, filename: string) => {
  if (url.startsWith('data:')) {
    return fileFromDataUrl(url, filename);
  }

  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, {
    type: blob.type || 'image/jpeg',
  });
};

export const uploadPendingItemImages = async (
  itemId: string,
  imageUrls: string[]
) => {
  const uploads = await Promise.all(
    imageUrls.map(async (url, index) => {
      if (!url) return '';
      if (!isTempImageUrl(url)) return url;

      try {
        const file = await fileFromUrl(url, `slot-${index + 1}.jpg`);
        if (!ALLOWED_ITEM_IMAGE_MIME_TYPES.has(file.type)) {
          return '';
        }

        const compressed = await compressImageIfNeeded(file);
        if (compressed.size > MAX_ITEM_IMAGE_UPLOAD_BYTES) {
          return '';
        }

        const uploadFile =
          compressed instanceof File
            ? compressed
            : new File([compressed], file.name, {
                type: compressed.type || file.type,
                lastModified: Date.now(),
              });
        const path = buildHistoryImagePath(itemId, index, file);
        const { publicUrl } = await StorageService.uploadRawFile(
          ITEM_IMAGE_BUCKET,
          uploadFile,
          path,
          uploadFile.type
        );
        return publicUrl;
      } catch (error) {
        console.error('Failed to upload item image', error);
        return '';
      }
    })
  );

  if (uploads.some(Boolean)) {
    await itemDataService.updateItemImages(itemId, uploads);
  }
};
