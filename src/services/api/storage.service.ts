import { supabase } from '@/lib/supabase';
import { compressImageIfNeeded } from '@/utils/image';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export class StorageService {
  public static async uploadFile(
    bucket: string,
    file: File,
    path: string
  ): Promise<UploadResult> {
    const compressedFile = await compressImageIfNeeded(file);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, compressedFile, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return {
      path: data.path,
      publicUrl,
    };
  }

  public static async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  static async uploadEntityImage(
    bucket: string,
    userId: string,
    file: File
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/image_${timestamp}.${extension}`;
    return this.uploadFile(bucket, file, path);
  }

  static async deleteEntityImage(bucket: string, path: string): Promise<void> {
    return this.deleteFile(bucket, path);
  }

  static extractPathFromUrl(url: string, bucket: string): string | null {
    try {
      // Pastikan bucket name diapit oleh garis miring jika belum
      const safeBucket = bucket.startsWith('/') ? bucket : `/${bucket}/`;
      const regex = new RegExp(
        `/storage/v1/object/public${safeBucket.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(.+)`
      );
      const match = url.match(regex);
      if (match && match[1]) {
        return match[1];
      }
      // Fallback ke metode split jika regex tidak cocok (misalnya URL tidak standar)
      const urlParts = url.split(`/storage/v1/object/public${safeBucket}`);
      return urlParts[1] || null;
    } catch {
      return null;
    }
  }

  static getPublicUrl(bucket: string, path: string): string {
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);

    return publicUrl;
  }
}
