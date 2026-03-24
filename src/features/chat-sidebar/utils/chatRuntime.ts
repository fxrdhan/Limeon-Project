import { chatRuntimeCache } from './chatRuntimeCache';
import * as channelImageAssetCache from './channel-image-asset-cache';
import * as pdfPreviewPersistence from './pdf-preview-persistence';

export const chatRuntime = {
  cache: chatRuntimeCache,
  imageAssets: {
    deleteByMessageIds: (
      ...args: Parameters<
        typeof channelImageAssetCache.deleteChannelImageAssetsByMessageIds
      >
    ) => channelImageAssetCache.deleteChannelImageAssetsByMessageIds(...args),
    getUrl: (
      ...args: Parameters<
        typeof channelImageAssetCache.getRuntimeChannelImageAssetUrl
      >
    ) => channelImageAssetCache.getRuntimeChannelImageAssetUrl(...args),
    reset: (
      ...args: Parameters<
        typeof channelImageAssetCache.resetChannelImageAssetCache
      >
    ) => channelImageAssetCache.resetChannelImageAssetCache(...args),
    seedFromFile: (
      ...args: Parameters<
        typeof channelImageAssetCache.seedChannelImageAssetsFromFile
      >
    ) => channelImageAssetCache.seedChannelImageAssetsFromFile(...args),
  },
  pdfPreviews: {
    loadPersistedEntry: (
      ...args: Parameters<
        typeof pdfPreviewPersistence.loadPersistedPdfPreviewEntry
      >
    ) => pdfPreviewPersistence.loadPersistedPdfPreviewEntry(...args),
    loadPersistedEntries: (
      ...args: Parameters<
        typeof pdfPreviewPersistence.loadPersistedPdfPreviewEntries
      >
    ) => pdfPreviewPersistence.loadPersistedPdfPreviewEntries(...args),
    resetPersisted: (
      ...args: Parameters<
        typeof pdfPreviewPersistence.resetPersistedPdfPreviewCache
      >
    ) => pdfPreviewPersistence.resetPersistedPdfPreviewCache(...args),
  },
};
