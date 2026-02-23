import type { FileObject } from '@supabase/storage-js';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '@/services/api/base.service';
import { StorageService } from '@/services/api/storage.service';

export const itemStorageService = {
  async listItemImages(
    bucketName: string,
    itemId: string
  ): Promise<ServiceResponse<FileObject[]>> {
    try {
      const data = await StorageService.listFiles(
        bucketName,
        `items/${itemId}`,
        {
          limit: 20,
          sortBy: { column: 'name', order: 'asc' },
        }
      );

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: error as unknown as PostgrestError };
    }
  },

  async uploadItemImage(params: {
    bucketName: string;
    path: string;
    file: File;
    contentType: string;
  }): Promise<ServiceResponse<null>> {
    try {
      const { bucketName, path, file, contentType } = params;
      await StorageService.uploadRawFile(bucketName, file, path, contentType);

      return {
        data: null,
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as unknown as PostgrestError };
    }
  },
};
