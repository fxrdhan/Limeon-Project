import type {
  PendingComposerAttachment,
  PendingComposerAttachmentKind,
} from '../types';
import { readRuntimeStorage, writeRuntimeStorage } from './chatRuntimeState';
import {
  CHAT_RUNTIME_INDEXED_DB_NAMES,
  CHAT_RUNTIME_LOCAL_STORAGE_KEYS,
  openRuntimeIndexedDb,
} from './runtime-persistence';

const COMPOSER_DRAFT_MESSAGES_STORAGE_KEY =
  CHAT_RUNTIME_LOCAL_STORAGE_KEYS.composerDraftMessages;
const COMPOSER_DRAFT_ATTACHMENTS_DB_NAME =
  CHAT_RUNTIME_INDEXED_DB_NAMES.composerDrafts;
const COMPOSER_DRAFT_ATTACHMENTS_DB_VERSION = 1;
const COMPOSER_DRAFT_ATTACHMENTS_STORE_NAME = 'composer-drafts';
export const COMPOSER_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const COMPOSER_DRAFT_ATTACHMENTS_MAX_CHANNEL_BYTES = 64 * 1024 * 1024;
export const COMPOSER_DRAFT_ATTACHMENTS_MAX_TOTAL_BYTES = 128 * 1024 * 1024;

export interface PersistedComposerDraftMessageRecord {
  message: string;
  updatedAt: number;
}

export interface PersistedComposerDraftMessageStore {
  [channelId: string]: PersistedComposerDraftMessageRecord;
}

export interface PersistedComposerDraftAttachmentRecord {
  id: string;
  file: File;
  fileKind: PendingComposerAttachmentKind;
  fileName: string;
  fileTypeLabel: string;
  mimeType: string;
  pdfCoverUrl: string | null;
  pdfPageCount: number | null;
}

export interface PersistedComposerDraftRecord {
  channelId: string;
  attachments: PersistedComposerDraftAttachmentRecord[];
  updatedAt: number;
}

export interface PersistedComposerDraftAttachment {
  id: string;
  file: File;
  fileKind: PendingComposerAttachmentKind;
  fileName: string;
  fileTypeLabel: string;
  mimeType: string;
  pdfCoverUrl: string | null;
  pdfPageCount: number | null;
}

let composerDraftDbPromise: Promise<IDBDatabase | null> | null = null;

const normalizeChannelId = (channelId?: string | null) =>
  channelId?.trim() || null;

const canUseIndexedDb = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const normalizeUpdatedAt = (
  updatedAt: number | null | undefined,
  now: number
) =>
  Number.isFinite(updatedAt) && Number(updatedAt) > 0 ? Number(updatedAt) : now;

const isComposerDraftFresh = (
  updatedAt: number | null | undefined,
  now: number,
  maxAgeMs: number
) => now - normalizeUpdatedAt(updatedAt, now) <= maxAgeMs;

const getPersistedComposerDraftAttachmentRecordSize = (
  record: Pick<PersistedComposerDraftRecord, 'attachments'>
) =>
  record.attachments.reduce((totalSize, attachment) => {
    if (!(attachment.file instanceof Blob)) {
      return totalSize;
    }

    return totalSize + attachment.file.size;
  }, 0);

export const prunePersistedComposerDraftMessageStore = (
  payload: PersistedComposerDraftMessageStore | null | undefined,
  options?: {
    now?: number;
    maxAgeMs?: number;
  }
) => {
  const now = options?.now ?? Date.now();
  const maxAgeMs = options?.maxAgeMs ?? COMPOSER_DRAFT_MAX_AGE_MS;
  const nextStore: PersistedComposerDraftMessageStore = {};
  let didPrune = false;

  Object.entries(payload ?? {}).forEach(([rawChannelId, record]) => {
    const channelId = normalizeChannelId(rawChannelId);
    if (
      !channelId ||
      typeof record?.message !== 'string' ||
      record.message.length === 0
    ) {
      didPrune = true;
      return;
    }

    if (!isComposerDraftFresh(record.updatedAt, now, maxAgeMs)) {
      didPrune = true;
      return;
    }

    const updatedAt = normalizeUpdatedAt(record.updatedAt, now);
    nextStore[channelId] = {
      message: record.message,
      updatedAt,
    };

    if (channelId !== rawChannelId || updatedAt !== record.updatedAt) {
      didPrune = true;
    }
  });

  return {
    didPrune,
    store: nextStore,
  };
};

export const prunePersistedComposerDraftAttachmentRecords = (
  records: PersistedComposerDraftRecord[],
  options?: {
    now?: number;
    maxAgeMs?: number;
    maxChannelBytes?: number;
    maxTotalBytes?: number;
  }
) => {
  const now = options?.now ?? Date.now();
  const maxAgeMs = options?.maxAgeMs ?? COMPOSER_DRAFT_MAX_AGE_MS;
  const maxChannelBytes =
    options?.maxChannelBytes ?? COMPOSER_DRAFT_ATTACHMENTS_MAX_CHANNEL_BYTES;
  const maxTotalBytes =
    options?.maxTotalBytes ?? COMPOSER_DRAFT_ATTACHMENTS_MAX_TOTAL_BYTES;
  const removedChannelIds = new Set<string>();

  const normalizedRecords = records
    .flatMap(record => {
      const channelId = normalizeChannelId(record?.channelId);
      if (!channelId || !Array.isArray(record?.attachments)) {
        if (channelId) {
          removedChannelIds.add(channelId);
        }
        return [];
      }

      if (
        record.attachments.length === 0 ||
        !isComposerDraftFresh(record.updatedAt, now, maxAgeMs)
      ) {
        removedChannelIds.add(channelId);
        return [];
      }

      const normalizedRecord: PersistedComposerDraftRecord = {
        channelId,
        attachments: record.attachments,
        updatedAt: normalizeUpdatedAt(record.updatedAt, now),
      };
      const byteSize =
        getPersistedComposerDraftAttachmentRecordSize(normalizedRecord);

      if (byteSize === 0 || byteSize > maxChannelBytes) {
        removedChannelIds.add(channelId);
        return [];
      }

      return [{ byteSize, record: normalizedRecord }];
    })
    .sort((left, right) => right.record.updatedAt - left.record.updatedAt);

  const keptRecords: PersistedComposerDraftRecord[] = [];
  let totalBytes = 0;

  normalizedRecords.forEach(({ byteSize, record }) => {
    if (totalBytes + byteSize > maxTotalBytes) {
      removedChannelIds.add(record.channelId);
      return;
    }

    totalBytes += byteSize;
    keptRecords.push(record);
  });

  return {
    records: keptRecords,
    removedChannelIds: [...removedChannelIds],
    totalBytes,
  };
};

const getComposerDraftDb = async (): Promise<IDBDatabase | null> => {
  if (!canUseIndexedDb()) {
    return null;
  }

  if (!composerDraftDbPromise) {
    composerDraftDbPromise = openRuntimeIndexedDb({
      dbName: COMPOSER_DRAFT_ATTACHMENTS_DB_NAME,
      version: COMPOSER_DRAFT_ATTACHMENTS_DB_VERSION,
      onOpenError: () => {
        composerDraftDbPromise = null;
      },
      onUpgrade: database => {
        if (
          database.objectStoreNames.contains(
            COMPOSER_DRAFT_ATTACHMENTS_STORE_NAME
          )
        ) {
          return;
        }

        database.createObjectStore(COMPOSER_DRAFT_ATTACHMENTS_STORE_NAME, {
          keyPath: 'channelId',
        });
      },
    });
  }

  return composerDraftDbPromise;
};

const listPersistedComposerDraftRecords = async (
  database: IDBDatabase
): Promise<PersistedComposerDraftRecord[]> =>
  new Promise(resolve => {
    const transaction = database.transaction(
      COMPOSER_DRAFT_ATTACHMENTS_STORE_NAME,
      'readonly'
    );
    const store = transaction.objectStore(
      COMPOSER_DRAFT_ATTACHMENTS_STORE_NAME
    );
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(
        Array.isArray(request.result)
          ? (request.result as PersistedComposerDraftRecord[])
          : []
      );
    };

    request.onerror = () => {
      resolve([]);
    };
  });

const deletePersistedComposerDraftRecords = async (
  database: IDBDatabase,
  channelIds: string[]
) => {
  const normalizedChannelIds = [
    ...new Set(channelIds.map(normalizeChannelId)),
  ].filter((channelId): channelId is string => Boolean(channelId));
  if (normalizedChannelIds.length === 0) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      COMPOSER_DRAFT_ATTACHMENTS_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(
      COMPOSER_DRAFT_ATTACHMENTS_STORE_NAME
    );

    normalizedChannelIds.forEach(channelId => {
      store.delete(channelId);
    });

    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      resolve();
    };
    transaction.onabort = () => {
      resolve();
    };
  });
};

const prunePersistedComposerDraftAttachments = async (
  database: IDBDatabase
) => {
  const records = await listPersistedComposerDraftRecords(database);
  const prunedRecords = prunePersistedComposerDraftAttachmentRecords(records);

  if (prunedRecords.removedChannelIds.length > 0) {
    await deletePersistedComposerDraftRecords(
      database,
      prunedRecords.removedChannelIds
    );
  }

  return prunedRecords.records;
};

const mapPendingComposerAttachmentToPersistedRecord = (
  attachment: PendingComposerAttachment
): PersistedComposerDraftAttachmentRecord => ({
  id: attachment.id,
  file: attachment.file,
  fileKind: attachment.fileKind,
  fileName: attachment.fileName,
  fileTypeLabel: attachment.fileTypeLabel,
  mimeType: attachment.mimeType,
  pdfCoverUrl: attachment.pdfCoverUrl,
  pdfPageCount: attachment.pdfPageCount,
});

const coercePersistedDraftFile = (
  file: unknown,
  fileName: string,
  mimeType: string
) => {
  if (file instanceof File) {
    return file;
  }

  if (file instanceof Blob) {
    return new File([file], fileName, {
      type: file.type || mimeType,
      lastModified: Date.now(),
    });
  }

  return null;
};

export const readPersistedComposerDraftMessage = (
  channelId?: string | null
) => {
  const normalizedChannelId = normalizeChannelId(channelId);
  if (!normalizedChannelId) {
    return '';
  }

  const payload = readRuntimeStorage<PersistedComposerDraftMessageStore>(
    COMPOSER_DRAFT_MESSAGES_STORAGE_KEY,
    'local'
  );
  const prunedPayload = prunePersistedComposerDraftMessageStore(payload);
  if (prunedPayload.didPrune) {
    writeRuntimeStorage(
      COMPOSER_DRAFT_MESSAGES_STORAGE_KEY,
      prunedPayload.store,
      'local'
    );
  }
  const record = prunedPayload.store[normalizedChannelId];

  return typeof record?.message === 'string' ? record.message : '';
};

export const writePersistedComposerDraftMessage = (
  channelId: string | null | undefined,
  message: string
) => {
  const normalizedChannelId = normalizeChannelId(channelId);
  if (!normalizedChannelId) {
    return false;
  }

  const nextPayload = prunePersistedComposerDraftMessageStore(
    readRuntimeStorage<PersistedComposerDraftMessageStore>(
      COMPOSER_DRAFT_MESSAGES_STORAGE_KEY,
      'local'
    )
  ).store;

  if (message.length === 0) {
    delete nextPayload[normalizedChannelId];
  } else {
    nextPayload[normalizedChannelId] = {
      message,
      updatedAt: Date.now(),
    };
  }

  return writeRuntimeStorage(
    COMPOSER_DRAFT_MESSAGES_STORAGE_KEY,
    nextPayload,
    'local'
  );
};

export const loadPersistedComposerDraftAttachments = async (
  channelId?: string | null
): Promise<PersistedComposerDraftAttachment[]> => {
  const normalizedChannelId = normalizeChannelId(channelId);
  if (!normalizedChannelId) {
    return [];
  }

  const database = await getComposerDraftDb();
  if (!database) {
    return [];
  }

  const records = await prunePersistedComposerDraftAttachments(database);
  const record = records.find(
    persistedRecord => persistedRecord.channelId === normalizedChannelId
  );
  if (!record) {
    return [];
  }

  return record.attachments.flatMap(attachment => {
    const fileName = attachment?.fileName?.trim() || 'Lampiran';
    const fileKind = attachment?.fileKind;
    if (
      fileKind !== 'image' &&
      fileKind !== 'document' &&
      fileKind !== 'audio'
    ) {
      return [];
    }

    const file = coercePersistedDraftFile(
      attachment.file,
      fileName,
      attachment?.mimeType?.trim() || ''
    );
    if (!file) {
      return [];
    }

    return [
      {
        id:
          typeof attachment?.id === 'string' && attachment.id.trim()
            ? attachment.id
            : `pending_file_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`,
        file,
        fileKind,
        fileName,
        fileTypeLabel:
          typeof attachment?.fileTypeLabel === 'string' &&
          attachment.fileTypeLabel.trim()
            ? attachment.fileTypeLabel
            : 'FILE',
        mimeType: attachment?.mimeType?.trim() || file.type,
        pdfCoverUrl:
          typeof attachment?.pdfCoverUrl === 'string'
            ? attachment.pdfCoverUrl
            : null,
        pdfPageCount:
          typeof attachment?.pdfPageCount === 'number'
            ? attachment.pdfPageCount
            : null,
      } satisfies PersistedComposerDraftAttachment,
    ];
  });
};

export const persistComposerDraftAttachments = async (
  channelId: string | null | undefined,
  attachments: PendingComposerAttachment[]
) => {
  const normalizedChannelId = normalizeChannelId(channelId);
  if (!normalizedChannelId) {
    return;
  }

  const database = await getComposerDraftDb();
  if (!database) {
    return;
  }

  await new Promise<void>(resolve => {
    const transaction = database.transaction(
      COMPOSER_DRAFT_ATTACHMENTS_STORE_NAME,
      'readwrite'
    );
    const store = transaction.objectStore(
      COMPOSER_DRAFT_ATTACHMENTS_STORE_NAME
    );

    if (attachments.length === 0) {
      store.delete(normalizedChannelId);
    } else {
      store.put({
        channelId: normalizedChannelId,
        attachments: attachments.map(
          mapPendingComposerAttachmentToPersistedRecord
        ),
        updatedAt: Date.now(),
      } satisfies PersistedComposerDraftRecord);
    }

    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      resolve();
    };
    transaction.onabort = () => {
      resolve();
    };
  });

  await prunePersistedComposerDraftAttachments(database);
};

export const clearPersistedComposerDraftAttachments = async (
  channelId?: string | null
) => {
  const normalizedChannelId = normalizeChannelId(channelId);
  if (!normalizedChannelId) {
    return;
  }

  const database = await getComposerDraftDb();
  if (!database) {
    return;
  }

  await deletePersistedComposerDraftRecords(database, [normalizedChannelId]);
};
