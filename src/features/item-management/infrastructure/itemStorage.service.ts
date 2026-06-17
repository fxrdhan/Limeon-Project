import type { FileObject } from '@supabase/storage-js';
import {
  toServiceError,
  type ServiceResponse,
} from '@/services/api/base.service';
import {
  StorageService,
  type UploadResult,
} from '@/services/api/storage.service';

const ITEM_IMAGE_BUCKET = 'item_images';

export const itemStorageService = {
  async listItemImages(itemId: string): Promise<ServiceResponse<FileObject[]>> {
    try {
      const data = await StorageService.listFiles(
        ITEM_IMAGE_BUCKET,
        `items/${itemId}`,
        {
          limit: 20,
          sortBy: { column: 'name', order: 'asc' },
        }
      );

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  },

  async uploadItemImage(params: {
    path: string;
    file: File;
    contentType: string;
  }): Promise<ServiceResponse<null>> {
    try {
      const { path, file, contentType } = params;
      await StorageService.uploadRawFile(
        ITEM_IMAGE_BUCKET,
        file,
        path,
        contentType
      );

      return {
        data: null,
        error: null,
      };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  },

  uploadRawItemImage(params: {
    path: string;
    file: File;
    contentType: string;
  }): Promise<UploadResult> {
    return StorageService.uploadRawFile(
      ITEM_IMAGE_BUCKET,
      params.file,
      params.path,
      params.contentType
    );
  },

  deleteItemImage(path: string): Promise<void> {
    return StorageService.deleteFile(ITEM_IMAGE_BUCKET, path);
  },

  extractItemImagePathFromUrl(url: string): string | null {
    return StorageService.extractPathFromUrl(url, ITEM_IMAGE_BUCKET);
  },

  getItemImagePublicUrl(path: string): string {
    return StorageService.getPublicUrl(ITEM_IMAGE_BUCKET, path);
  },
};
