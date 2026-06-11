import { isImageFileExtensionOrMime } from '../message-file';
import { resolveAttachmentExtension } from './fileMetadata';
import { isKnownAttachmentRemoteAssetUrl } from './sharedLinks';

const hasSupportedDirectAssetExtension = (url: string) => {
  const extension = resolveAttachmentExtension(null, url, '');
  return extension === 'pdf' || isImageFileExtensionOrMime(extension);
};

export const isSupportedAttachmentAssetCandidateUrl = (url: string) =>
  hasSupportedDirectAssetExtension(url) || isKnownAttachmentRemoteAssetUrl(url);
