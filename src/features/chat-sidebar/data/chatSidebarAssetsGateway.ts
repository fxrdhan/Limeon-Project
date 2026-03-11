import { StorageService } from '@/services/api/storage.service';
import type { UploadResult } from '@/services/api/storage.service';
import { CHAT_IMAGE_BUCKET } from '../constants';

export const chatSidebarAssetsGateway = {
  uploadImage(file: File, storagePath: string): Promise<UploadResult> {
    return StorageService.uploadFile(CHAT_IMAGE_BUCKET, file, storagePath);
  },
  uploadAttachment(
    file: File,
    storagePath: string,
    contentType?: string
  ): Promise<UploadResult> {
    return StorageService.uploadRawFile(
      CHAT_IMAGE_BUCKET,
      file,
      storagePath,
      contentType
    );
  },
  uploadPdfPreview(file: File, storagePath: string): Promise<UploadResult> {
    return StorageService.uploadRawFile(
      CHAT_IMAGE_BUCKET,
      file,
      storagePath,
      'image/png'
    );
  },
  deleteAsset(storagePath: string): Promise<void> {
    return StorageService.deleteFile(CHAT_IMAGE_BUCKET, storagePath);
  },
  downloadAsset(storagePath: string): Promise<Blob> {
    return StorageService.downloadFile(CHAT_IMAGE_BUCKET, storagePath);
  },
  createSignedAssetUrl(
    storagePath: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    return StorageService.createSignedUrl(
      CHAT_IMAGE_BUCKET,
      storagePath,
      expiresInSeconds
    );
  },
};
