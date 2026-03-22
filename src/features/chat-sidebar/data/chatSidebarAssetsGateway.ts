import { StorageService } from '@/services/api/storage.service';
import type { TransformOptions } from '@supabase/storage-js';
import { CHAT_IMAGE_BUCKET } from '../constants';

export interface ChatSidebarAssetUploadResult {
  path: string;
}

export const chatSidebarAssetsGateway = {
  async uploadImage(
    file: File,
    storagePath: string
  ): Promise<ChatSidebarAssetUploadResult> {
    const { path } = await StorageService.uploadFile(
      CHAT_IMAGE_BUCKET,
      file,
      storagePath
    );

    return { path };
  },
  async uploadAttachment(
    file: File,
    storagePath: string,
    contentType?: string
  ): Promise<ChatSidebarAssetUploadResult> {
    const { path } = await StorageService.uploadRawFile(
      CHAT_IMAGE_BUCKET,
      file,
      storagePath,
      contentType
    );

    return { path };
  },
  async uploadImagePreview(
    file: File,
    storagePath: string,
    contentType?: string
  ): Promise<ChatSidebarAssetUploadResult> {
    const { path } = await StorageService.uploadRawFile(
      CHAT_IMAGE_BUCKET,
      file,
      storagePath,
      contentType
    );

    return { path };
  },
  async uploadPdfPreview(
    file: File,
    storagePath: string
  ): Promise<ChatSidebarAssetUploadResult> {
    const { path } = await StorageService.uploadRawFile(
      CHAT_IMAGE_BUCKET,
      file,
      storagePath,
      'image/png'
    );

    return { path };
  },
  deleteAsset(storagePath: string): Promise<void> {
    return StorageService.deleteFile(CHAT_IMAGE_BUCKET, storagePath);
  },
  downloadAsset(storagePath: string): Promise<Blob> {
    return StorageService.downloadFile(CHAT_IMAGE_BUCKET, storagePath);
  },
  createSignedAssetUrl(
    storagePath: string,
    expiresInSeconds = 3600,
    transform?: TransformOptions
  ): Promise<string> {
    return StorageService.createSignedUrl(
      CHAT_IMAGE_BUCKET,
      storagePath,
      expiresInSeconds,
      transform
    );
  },
};
