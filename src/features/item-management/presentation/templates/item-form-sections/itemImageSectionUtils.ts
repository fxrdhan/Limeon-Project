import { StorageService } from '@/services/api/storage.service';

export interface ItemImageSlot {
  url: string;
  path: string;
}

export const ITEM_IMAGE_BUCKET = 'item_images';
export const ITEM_IMAGE_SLOT_COUNT = 4;
export const MAX_ITEM_IMAGE_SOURCE_BYTES = 20 * 1024 * 1024;
export const ALLOWED_ITEM_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const createEmptyItemImageSlots = () =>
  Array.from({ length: ITEM_IMAGE_SLOT_COUNT }, () => ({ url: '', path: '' }));

export const areImageSlotsEqual = (
  left: ItemImageSlot[],
  right: ItemImageSlot[]
) =>
  left.length === right.length &&
  left.every(
    (slot, index) =>
      slot.url === right[index]?.url && slot.path === right[index]?.path
  );

export const areImageUrlsEqual = (left: string[], right: string[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

export const appendCacheBust = (url: string, token: string | number) =>
  url.includes('?') ? `${url}&t=${token}` : `${url}?t=${token}`;

export const resolveItemImageSlotPath = (
  url: string,
  itemId: string | undefined,
  slotIndex: number
) => {
  if (!url || !itemId) return '';

  const cleanUrl = url.split('?')[0];
  const extracted = StorageService.extractPathFromUrl(
    cleanUrl,
    ITEM_IMAGE_BUCKET
  );
  return extracted || `items/${itemId}/slot-${slotIndex}`;
};

export const buildItemImageSlotsFromUrls = (
  urls: string[],
  itemId: string | undefined
) =>
  Array.from({ length: ITEM_IMAGE_SLOT_COUNT }, (_, index) => {
    const url = urls[index] || '';
    return {
      url,
      path: url ? resolveItemImageSlotPath(url, itemId, index) : '',
    };
  });

export const buildItemImageUrlsPayload = (slots: Array<{ url: string }>) => {
  const urls = slots.map(slot => slot.url || '');
  return urls.some(Boolean) ? urls : [];
};
