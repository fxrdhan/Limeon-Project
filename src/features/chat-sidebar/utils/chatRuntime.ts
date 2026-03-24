import { chatRuntimeCache } from './chatRuntimeCache';
import * as channelImageAssetCache from './channel-image-asset-cache';
import * as pdfPreviewPersistence from './pdf-preview-persistence';

export const chatRuntime = {
  cache: chatRuntimeCache,
  imageAssets: {
    activateScope: (
      ...args: Parameters<
        typeof channelImageAssetCache.activateChannelImageAssetScope
      >
    ) => channelImageAssetCache.activateChannelImageAssetScope(...args),
    ensureUrl: (
      ...args: Parameters<
        typeof channelImageAssetCache.ensureChannelImageAssetUrl
      >
    ) => channelImageAssetCache.ensureChannelImageAssetUrl(...args),
    isPreviewableMessage: (
      ...args: Parameters<
        typeof channelImageAssetCache.isCacheableChannelImageMessage
      >
    ) => channelImageAssetCache.isCacheableChannelImageMessage(...args),
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
    get: (...args: Parameters<typeof chatRuntimeCache.pdfPreviews.get>) =>
      chatRuntimeCache.pdfPreviews.get(...args),
    set: (...args: Parameters<typeof chatRuntimeCache.pdfPreviews.set>) =>
      chatRuntimeCache.pdfPreviews.set(...args),
    hydrate: (
      ...args: Parameters<typeof chatRuntimeCache.pdfPreviews.hydrate>
    ) => chatRuntimeCache.pdfPreviews.hydrate(...args),
    pruneInactiveMessageIds: (
      ...args: Parameters<
        typeof chatRuntimeCache.pdfPreviews.pruneInactiveMessageIds
      >
    ) => chatRuntimeCache.pdfPreviews.pruneInactiveMessageIds(...args),
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
