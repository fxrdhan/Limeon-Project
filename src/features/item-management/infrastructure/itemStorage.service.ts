import { supabase } from '@/lib/supabase';
import type { FileObject } from '@supabase/storage-js';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '@/services/api/base.service';

export const itemStorageService = {
  async listItemImages(
    bucketName: string,
    itemId: string
  ): Promise<ServiceResponse<FileObject[]>> {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(`items/${itemId}`, {
          limit: 20,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) {
        return { data: null, error: error as unknown as PostgrestError };
      }

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
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType,
        });

      return {
        data: null,
        error: error as unknown as PostgrestError | null,
      };
    } catch (error) {
      return { data: null, error: error as unknown as PostgrestError };
    }
  },
};
