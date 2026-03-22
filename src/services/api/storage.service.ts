import { supabase } from '@/lib/supabase';
import { compressImageIfNeeded } from '@/utils/image';
import type { FileObject, TransformOptions } from '@supabase/storage-js';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

interface ListFilesOptions {
  limit?: number;
  offset?: number;
  sortBy?: { column: string; order: 'asc' | 'desc' };
  search?: string;
}

interface UploadOptions {
  contentType?: string;
  compress?: boolean;
}

export class StorageService {
  private static async uploadInternal(
    bucket: string,
    file: File,
    path: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const { contentType, compress = true } = options;
    const fileToUpload = compress ? await compressImageIfNeeded(file) : file;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, fileToUpload, {
        cacheControl: '3600',
        upsert: true,
        ...(contentType ? { contentType } : {}),
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

  public static async uploadFile(
    bucket: string,
    file: File,
    path: string
  ): Promise<UploadResult> {
    return this.uploadInternal(bucket, file, path, { compress: true });
  }

  public static async uploadRawFile(
    bucket: string,
    file: File,
    path: string,
    contentType?: string
  ): Promise<UploadResult> {
    return this.uploadInternal(bucket, file, path, {
      compress: false,
      contentType,
    });
  }

  public static async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  public static async downloadFile(
    bucket: string,
    path: string
  ): Promise<Blob> {
    const { data, error } = await supabase.storage.from(bucket).download(path);

    if (error || !data) {
      throw new Error(`Download failed: ${error?.message || 'Unknown error'}`);
    }

    return data;
  }

  public static async createSignedUrl(
    bucket: string,
    path: string,
    expiresInSeconds = 3600,
    transform?: TransformOptions
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(
        path,
        expiresInSeconds,
        transform ? { transform } : undefined
      );

    if (error || !data?.signedUrl) {
      throw new Error(
        `Create signed URL failed: ${error?.message || 'Unknown error'}`
      );
    }

    return data.signedUrl;
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

  static async listFiles(
    bucket: string,
    path: string,
    options?: ListFilesOptions
  ): Promise<FileObject[]> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path, options);

    if (error) {
      throw new Error(`List failed: ${error.message}`);
    }

    return data || [];
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
