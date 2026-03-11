export interface DeleteMessageOptions {
  suppressErrorToast?: boolean;
  onStorageCleanupFailure?: (failedPaths: string[]) => void;
}

export interface DeleteMessagesOptions {
  suppressErrorToast?: boolean;
}

export interface DeleteMessagesResult {
  deletedTargetMessageIds: string[];
  failedTargetMessageIds: string[];
  cleanupWarningTargetMessageIds: string[];
}
