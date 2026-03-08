export interface DeleteMessageOptions {
  suppressErrorToast?: boolean;
  onStorageCleanupFailure?: (failedPaths: string[]) => void;
}
