import {
  StorageService,
  type UploadResult,
} from '@/services/api/storage.service';

const IDENTITY_IMAGE_BUCKET = 'profiles';

export const identityImageStorageService = {
  uploadIdentityImage(file: File, path: string): Promise<UploadResult> {
    return StorageService.uploadFile(IDENTITY_IMAGE_BUCKET, file, path);
  },

  deleteIdentityImage(path: string): Promise<void> {
    return StorageService.deleteEntityImage(IDENTITY_IMAGE_BUCKET, path);
  },

  extractIdentityImagePath(url: string): string | null {
    return StorageService.extractPathFromUrl(url, IDENTITY_IMAGE_BUCKET);
  },
};
