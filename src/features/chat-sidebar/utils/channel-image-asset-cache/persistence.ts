import {
  CHAT_RUNTIME_INDEXED_DB_NAMES,
  closeRuntimeIndexedDb,
  deleteRuntimeIndexedDb,
  openRuntimeIndexedDb,
} from '../runtime-persistence';
import type {
  ChannelImageAssetVariant,
  PersistedChannelImageAssetRecord,
} from './types';

const CHANNEL_IMAGE_ASSET_DB_NAME =
  CHAT_RUNTIME_INDEXED_DB_NAMES.channelImageAssets;
const CHANNEL_IMAGE_ASSET_DB_VERSION = 1;
const CHANNEL_IMAGE_ASSET_STORE_NAME = 'channel-image-assets';
const CHANNEL_IMAGE_ASSET_CHANNEL_INDEX = 'channelId';
const CHANNEL_IMAGE_ASSET_CHANNEL_VARIANT_INDEX = 'channelVariant';

let channelImageAssetDbPromise: Promise<IDBDatabase | null> | null = null;

const canUseIndexedDb = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const getChannelImageAssetDb = async (): Promise<IDBDatabase | null> => {
  if (!canUseIndexedDb()) {
    return null;
  }

  if (!channelImageAssetDbPromise) {
    channelImageAssetDbPromise = openRuntimeIndexedDb({
      dbName: CHANNEL_IMAGE_ASSET_DB_NAME,
      version: CHANNEL_IMAGE_ASSET_DB_VERSION,
      onOpenError: () => {
        channelImageAssetDbPromise = null;
      },
      onUpgrade: database => {
        if (
          database.objectStoreNames.contains(CHANNEL_IMAGE_ASSET_STORE_NAME)
        ) {
          database.deleteObjectStore(CHANNEL_IMAGE_ASSET_STORE_NAME);
        }

        const store = database.createObjectStore(
          CHANNEL_IMAGE_ASSET_STORE_NAME,
          {
            keyPath: 'key',
          }
        );

        store.createIndex(
          CHANNEL_IMAGE_ASSET_CHANNEL_INDEX,
          CHANNEL_IMAGE_ASSET_CHANNEL_INDEX
        );
        store.createIndex(CHANNEL_IMAGE_ASSET_CHANNEL_VARIANT_INDEX, [
          CHANNEL_IMAGE_ASSET_CHANNEL_INDEX,
          'variant',
        ]);
      },
    });
  }

  return channelImageAssetDbPromise;
};

export const readPersistedChannelImageAssetRecord = async (
  assetKey: string
): Promise<PersistedChannelImageAssetRecord | null> => {
  const database = await getChannelImageAssetDb();
  if (!database) {
    return null;
  }

  return new Promise(resolve => {
    const transaction = database.transaction(
      CHANNEL_IMAGE_ASSET_STORE_NAME,
      'readonly'
    );
    const store = transaction.objectStore(CHANNEL_IMAGE_ASSET_STORE_NAME);
    const request = store.get(assetKey);

    request.onsuccess = () => {
      resolve(
        (request.result as PersistedChannelImageAssetRecord | undefined) ?? null
      );
    };
    request.onerror = () => {
      resolve(null);
    };
  });
};

export const listPersistedChannelImageAssetRecords = async (
  channelId: string,
  variant?: ChannelImageAssetVariant
): Promise<PersistedChannelImageAssetRecord[]> => {
  const database = await getChannelImageAssetDb();
  if (!database) {
    return [];
  }

  return new Promise(resolve => {
    const transaction = database.transaction(
      CHANNEL_IMAGE_ASSET_STORE_NAME,
      'readonly'
    );
    const store = transaction.objectStore(CHANNEL_IMAGE_ASSET_STORE_NAME);
    const source = variant
      ? store.index(CHANNEL_IMAGE_ASSET_CHANNEL_VARIANT_INDEX)
      : store.index(CHANNEL_IMAGE_ASSET_CHANNEL_INDEX);
    const request = source.getAll(variant ? [channelId, variant] : channelId);

    request.onsuccess = () => {
      resolve((request.result || []) as PersistedChannelImageAssetRecord[]);
    };
    request.onerror = () => {
      resolve([]);
    };
  });
};

export const touchPersistedChannelImageAssetRecord = async (
  record: PersistedChannelImageAssetRecord
) => {
  const database = await getChannelImageAssetDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      CHANNEL_IMAGE_ASSET_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(CHANNEL_IMAGE_ASSET_STORE_NAME);
    store.put({
      ...record,
      lastAccessedAt: Date.now(),
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
};

export const writePersistedChannelImageAssetRecord = async (
  record: PersistedChannelImageAssetRecord
) => {
  const database = await getChannelImageAssetDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      CHANNEL_IMAGE_ASSET_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(CHANNEL_IMAGE_ASSET_STORE_NAME);
    store.put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
};

export const deletePersistedChannelImageAssetKeys = async (
  assetKeys: string[]
) => {
  const normalizedAssetKeys = [...new Set(assetKeys)]
    .map(assetKey => assetKey.trim())
    .filter(Boolean);
  if (normalizedAssetKeys.length === 0) {
    return;
  }

  const database = await getChannelImageAssetDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      CHANNEL_IMAGE_ASSET_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(CHANNEL_IMAGE_ASSET_STORE_NAME);

    normalizedAssetKeys.forEach(assetKey => {
      store.delete(assetKey);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
};

export const purgePersistedChannelImageAssetsExcept = async (
  retainedChannelIds: Set<string>
) => {
  const database = await getChannelImageAssetDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      CHANNEL_IMAGE_ASSET_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(CHANNEL_IMAGE_ASSET_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      ((request.result || []) as PersistedChannelImageAssetRecord[]).forEach(
        record => {
          if (retainedChannelIds.has(record.channelId)) {
            return;
          }

          store.delete(record.key);
        }
      );
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
};

export const resetPersistedChannelImageAssetCache = async () => {
  await closeRuntimeIndexedDb(channelImageAssetDbPromise);
  channelImageAssetDbPromise = null;

  if (!canUseIndexedDb()) {
    return;
  }

  await deleteRuntimeIndexedDb(CHANNEL_IMAGE_ASSET_DB_NAME);
};
