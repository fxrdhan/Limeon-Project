import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { ImageCropperHandle } from '@/components/image-cropper';
import { StorageService } from '@/services/api/storage.service';
import {
  preloadImages,
  removeCachedImageBlob,
  removeCachedImageSet,
  setCachedImageSet,
} from '@/utils/imageCache';
import { itemStorageService } from '../../../infrastructure/itemStorage.service';
import {
  ALLOWED_ITEM_IMAGE_TYPES,
  ITEM_IMAGE_BUCKET,
  ITEM_IMAGE_SLOT_COUNT,
  MAX_ITEM_IMAGE_SOURCE_BYTES,
  appendCacheBust,
  areImageSlotsEqual,
  areImageUrlsEqual,
  buildItemImageSlotsFromUrls,
  buildItemImageUrlsPayload,
  createEmptyItemImageSlots,
} from './itemImageSectionUtils';
import { getImageDimensions } from './item-image-section/imageDimensions';
import { useItemImageDisplayUrls } from './item-image-section/useItemImageDisplayUrls';
import { useItemImagePreviewDialog } from './item-image-section/useItemImagePreviewDialog';
import { useLocalImagePreviews } from './item-image-section/useLocalImagePreviews';

const cropperExitDurationMs = 180;

interface UseItemImageSectionProps {
  itemId?: string;
  isEditMode: boolean;
  loading: boolean;
  formImageUrls: string[];
  updateFormData: (updates: { image_urls: string[] }) => void;
}

export const useItemImageSection = ({
  itemId,
  isEditMode,
  loading,
  formImageUrls,
  updateFormData,
}: UseItemImageSectionProps) => {
  const cacheKey = itemId ? `item-images:${itemId}` : null;
  const isDraftMode = !itemId && !isEditMode;
  const [imageSlots, setImageSlots] = useState(createEmptyItemImageSlots);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [cropState, setCropState] = useState<{
    slotIndex: number;
    file: File;
    previewUrl: string;
  } | null>(null);
  const [isCropperVisible, setIsCropperVisible] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const imageCropperRef = useRef<ImageCropperHandle | null>(null);
  const cropperCloseTimerRef = useRef<number | null>(null);
  const { revokeLocalPreview, setLocalPreviewForSlot } =
    useLocalImagePreviews();

  const imageTabIndexMap = useMemo(() => {
    const slots = Array.from(
      { length: ITEM_IMAGE_SLOT_COUNT },
      (_, index) => index
    );
    const firstEmptyIndex = imageSlots.findIndex(slot => !slot.url);
    const startIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
    const ordered = slots.slice(startIndex);
    const map = ordered.reduce<Record<number, number>>((acc, index, order) => {
      acc[index] = 8 + order;
      return acc;
    }, {});
    if (startIndex > 0) {
      for (let index = 0; index < startIndex; index += 1) {
        map[index] = -1;
      }
    }
    return map;
  }, [imageSlots]);
  const { getDisplayUrlForSlot } = useItemImageDisplayUrls(imageSlots);
  const {
    previewSlotIndex,
    previewImageUrl,
    isPreviewVisible,
    openPreview,
    closePreview,
  } = useItemImagePreviewDialog({
    imageSlots,
    getDisplayUrlForSlot,
  });

  const buildSlotsFromUrls = useCallback(
    (urls: string[]) => buildItemImageSlotsFromUrls(urls, itemId),
    [itemId]
  );

  const openCropper = useCallback((slotIndex: number, file: File) => {
    if (cropperCloseTimerRef.current) {
      window.clearTimeout(cropperCloseTimerRef.current);
      cropperCloseTimerRef.current = null;
    }

    if (
      file.size > MAX_ITEM_IMAGE_SOURCE_BYTES ||
      !ALLOWED_ITEM_IMAGE_TYPES.has(file.type)
    ) {
      toast.error('Gunakan gambar JPG, PNG, atau WebP maksimal 20 MB.');
      return;
    }

    setCropState({ slotIndex, file, previewUrl: URL.createObjectURL(file) });
  }, []);

  const closeCropper = useCallback(() => {
    setIsCropperVisible(false);
    if (cropperCloseTimerRef.current) {
      window.clearTimeout(cropperCloseTimerRef.current);
    }
    cropperCloseTimerRef.current = window.setTimeout(() => {
      setCropState(previousCropState => {
        if (previousCropState?.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previousCropState.previewUrl);
        }
        return null;
      });
      cropperCloseTimerRef.current = null;
    }, cropperExitDurationMs);
  }, []);

  useEffect(() => {
    if (!cropState) return;

    const frameId = window.requestAnimationFrame(() => {
      setIsCropperVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [cropState]);

  useEffect(() => {
    return () => {
      if (cropperCloseTimerRef.current) {
        window.clearTimeout(cropperCloseTimerRef.current);
      }
    };
  }, []);

  const updateImageCache = useCallback(
    (slots: Array<{ url: string }>) => {
      if (!cacheKey) return;
      const urls = slots.map(slot => slot.url);
      const hasImage = urls.some(Boolean);
      if (hasImage) {
        setCachedImageSet(cacheKey, urls);
      } else {
        removeCachedImageSet(cacheKey);
      }
      preloadImages(urls.filter(Boolean));
    },
    [cacheKey]
  );

  const syncPendingImageUrls = useCallback(
    (slots: Array<{ url: string }>) => {
      const nextImageUrls = buildItemImageUrlsPayload(slots);
      if (areImageUrlsEqual(formImageUrls, nextImageUrls)) return;
      updateFormData({ image_urls: nextImageUrls });
    },
    [formImageUrls, updateFormData]
  );

  useEffect(() => {
    if (!isDraftMode) return;
    const nextImageUrls = buildItemImageUrlsPayload(imageSlots);
    if (areImageUrlsEqual(formImageUrls, nextImageUrls)) return;
    updateFormData({ image_urls: nextImageUrls });
  }, [formImageUrls, imageSlots, isDraftMode, updateFormData]);

  const handleBrokenImage = useCallback(
    (slotIndex: number) => {
      setImageSlots(prevSlots => {
        const nextSlots = prevSlots.map((slot, index) =>
          index === slotIndex ? { path: '', url: '' } : slot
        );
        updateImageCache(nextSlots);
        syncPendingImageUrls(nextSlots);
        return nextSlots;
      });
    },
    [syncPendingImageUrls, updateImageCache]
  );

  useEffect(() => {
    if (!itemId) return;

    if (formImageUrls.length > 0) {
      const nextSlots = buildSlotsFromUrls(formImageUrls);
      setImageSlots(nextSlots);
      updateImageCache(nextSlots);
      setIsLoadingImages(false);
      return;
    }

    if (loading) {
      return;
    }

    let isMounted = true;

    const loadItemImages = async () => {
      setIsLoadingImages(true);
      const { data, error } = await itemStorageService.listItemImages(
        ITEM_IMAGE_BUCKET,
        itemId
      );

      if (!isMounted) return;

      if (error) {
        toast.error('Gagal memuat gambar item.');
        setImageSlots(createEmptyItemImageSlots());
        setIsLoadingImages(false);
        return;
      }

      const nextSlots = createEmptyItemImageSlots();

      data?.forEach(file => {
        const match = file.name.match(/^slot-(\d)$/);
        if (!match) return;
        const slotIndex = Number(match[1]);
        if (Number.isNaN(slotIndex) || slotIndex < 0 || slotIndex > 3) return;
        const path = `items/${itemId}/${file.name}`;
        const versionToken = file.updated_at
          ? new Date(file.updated_at).getTime()
          : Date.now();
        nextSlots[slotIndex] = {
          path,
          url: appendCacheBust(
            StorageService.getPublicUrl(ITEM_IMAGE_BUCKET, path),
            versionToken
          ),
        };
      });

      setImageSlots(nextSlots);
      updateImageCache(nextSlots);
      setIsLoadingImages(false);
    };

    void loadItemImages();

    return () => {
      isMounted = false;
    };
  }, [buildSlotsFromUrls, formImageUrls, itemId, loading, updateImageCache]);

  useEffect(() => {
    if (!itemId) return;

    const nextSlots = buildSlotsFromUrls(formImageUrls);
    setImageSlots(prevSlots =>
      areImageSlotsEqual(prevSlots, nextSlots) ? prevSlots : nextSlots
    );
    updateImageCache(nextSlots);
    setIsLoadingImages(false);
  }, [buildSlotsFromUrls, formImageUrls, itemId, updateImageCache]);

  const handleImageUpload = useCallback(
    async (slotIndex: number, file: File) => {
      if (
        file.size > MAX_ITEM_IMAGE_SOURCE_BYTES ||
        !ALLOWED_ITEM_IMAGE_TYPES.has(file.type)
      ) {
        toast.error('Gunakan gambar JPG, PNG, atau WebP maksimal 20 MB.');
        return;
      }

      try {
        const { width, height } = await getImageDimensions(file);
        if (width !== height) {
          openCropper(slotIndex, file);
          return;
        }
      } catch {
        toast.error('Gagal membaca ukuran gambar.');
        return;
      }

      const previewUrl = setLocalPreviewForSlot(slotIndex, file);
      setImageSlots(prevSlots => {
        const nextSlots = prevSlots.map((slot, index) =>
          index === slotIndex ? { path: '', url: previewUrl } : slot
        );
        updateImageCache(nextSlots);
        syncPendingImageUrls(nextSlots);
        return nextSlots;
      });
    },
    [
      openCropper,
      setLocalPreviewForSlot,
      syncPendingImageUrls,
      updateImageCache,
    ]
  );

  const handleCropConfirm = useCallback(async () => {
    if (!cropState || !imageCropperRef.current) return;
    setIsCropping(true);

    try {
      const mimeType = cropState.file.type || 'image/jpeg';
      const blob = await imageCropperRef.current.toBlob({
        width: 1024,
        height: 1024,
        mimeType,
        quality: 0.9,
      });

      const croppedFile = new File([blob], cropState.file.name, {
        type: blob.type,
        lastModified: Date.now(),
      });

      const targetSlot = cropState.slotIndex;
      closeCropper();
      const previewUrl = setLocalPreviewForSlot(targetSlot, croppedFile);
      setImageSlots(prevSlots => {
        const nextSlots = prevSlots.map((slot, index) =>
          index === targetSlot ? { path: '', url: previewUrl } : slot
        );
        updateImageCache(nextSlots);
        syncPendingImageUrls(nextSlots);
        return nextSlots;
      });
    } catch {
      toast.error('Gagal memproses gambar.');
    } finally {
      setIsCropping(false);
    }
  }, [
    closeCropper,
    cropState,
    setLocalPreviewForSlot,
    syncPendingImageUrls,
    updateImageCache,
  ]);

  const handleImageDelete = useCallback(
    async (slotIndex: number) => {
      const targetSlot = imageSlots[slotIndex];
      try {
        revokeLocalPreview(slotIndex);
        if (targetSlot.url) {
          await removeCachedImageBlob(targetSlot.url);
        }
        if (targetSlot.path && !targetSlot.url.startsWith('blob:')) {
          await StorageService.deleteFile(ITEM_IMAGE_BUCKET, targetSlot.path);
        }
        setImageSlots(prevSlots => {
          const nextSlots = prevSlots.map((slot, index) =>
            index === slotIndex ? { path: '', url: '' } : slot
          );
          updateImageCache(nextSlots);
          syncPendingImageUrls(nextSlots);
          return nextSlots;
        });
      } catch (deleteError) {
        console.error(deleteError);
        toast.error('Gagal menghapus gambar.');
      }
    },
    [imageSlots, revokeLocalPreview, syncPendingImageUrls, updateImageCache]
  );

  return {
    imageSlots,
    isLoadingImages,
    previewSlotIndex,
    previewImageUrl,
    isPreviewVisible,
    cropState,
    isCropperVisible,
    isCropping,
    imageCropperRef,
    imageTabIndexMap,
    getDisplayUrlForSlot,
    handleImageUpload,
    handleImageDelete,
    handleBrokenImage,
    openPreview,
    closePreview,
    closeCropper,
    handleCropConfirm,
  };
};
