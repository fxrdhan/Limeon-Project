import type { PendingComposerAttachment } from '../../types';
import {
  closeRuntimeIndexedDb,
  deleteRuntimeIndexedDb,
  openRuntimeIndexedDb,
} from '../runtime-persistence';
import {
  COMPOSER_DRAFT_ATTACHMENTS_DB_NAME,
  COMPOSER_DRAFT_ATTACHMENTS_DB_VERSION,
  COMPOSER_DRAFT_ATTACHMENTS_STORE_NAME,
} from './constants';
import { prunePersistedComposerDraftAttachmentRecords } from './pruning';
import { normalizeChannelId, normalizeDraftScopeKey } from './scope';
import type {
  PersistedComposerDraftAttachment,
  PersistedComposerDraftAttachmentRecord,
  PersistedComposerDraftRecord,
} from './types';

let composerDraftDbPromise: Promise<IDBDatabase | null> | null = null;

const canUseIndexedDb = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isPersistedComposerDraftAttachmentKind = (
  value: unknown
): value is PersistedComposerDraftAttachmentRecord['fileKind'] =>
  value === 'image' || value === 'document' || value === 'audio';

export const normalizePersistedComposerDraftAttachmentRecord = (
  value: unknown
): PersistedComposerDraftAttachmentRecord | null => {
  if (!isObjectRecord(value) || !(value.file instanceof Blob)) {
    return null;
  }

  const fileKind = value.fileKind;
  if (!isPersistedComposerDraftAttachmentKind(fileKind)) {
    return null;
  }

  return {
    id: typeof value.id === 'string' ? value.id : '',
    file: value.file,
    fileKind,
    fileName: typeof value.fileName === 'string' ? value.fileName : '',
    fileTypeLabel:
      typeof value.fileTypeLabel === 'string' ? value.fileTypeLabel : '',
    mimeType: typeof value.mimeType === 'string' ? value.mimeType : '',
    pdfCoverUrl:
      typeof value.pdfCoverUrl === 'string' || value.pdfCoverUrl === null
        ? value.pdfCoverUrl
        : null,
    pdfPageCount:
      typeof value.pdfPageCount === 'number' ? value.pdfPageCount : null,
  };
};

export const normalizePersistedComposerDraftRecords = (value: unknown) =>
  Array.isArray(value)
    ? value.flatMap(record => {
        if (!isObjectRecord(record)) {
          return [];
        }

        const channelId = normalizeChannelId(
          typeof record.channelId === 'string' ? record.channelId : null
        );
        if (!channelId || !Array.isArray(record.attachments)) {
          return [];
        }

        const attachments = record.attachments.flatMap(attachment => {
          const normalizedAttachment =
            normalizePersistedComposerDraftAttachmentRecord(attachment);
          return normalizedAttachment ? [normalizedAttachment] : [];
        });

        if (attachments.length === 0) {
          return [];
        }

        return [
          {
            channelId,
            attachments,
            updatedAt:
              typeof record.updatedAt === 'number' ? record.updatedAt : 0,
          },
        ];
      })
    : [];

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
      resolve(normalizePersistedComposerDraftRecords(request.result));
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

export const loadPersistedComposerDraftAttachments = async (
  channelId?: string | null,
  userId?: string | null
): Promise<PersistedComposerDraftAttachment[]> => {
  const draftScopeKey = normalizeDraftScopeKey(channelId, userId);
  if (!draftScopeKey) {
    return [];
  }

  const database = await getComposerDraftDb();
  if (!database) {
    return [];
  }

  const records = await prunePersistedComposerDraftAttachments(database);
  const record = records.find(
    persistedRecord => persistedRecord.channelId === draftScopeKey
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
            : `pending_file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
  attachments: PendingComposerAttachment[],
  userId?: string | null
) => {
  const draftScopeKey = normalizeDraftScopeKey(channelId, userId);
  if (!draftScopeKey) {
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
      store.delete(draftScopeKey);
    } else {
      store.put({
        channelId: draftScopeKey,
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
  channelId?: string | null,
  userId?: string | null
) => {
  const draftScopeKey = normalizeDraftScopeKey(channelId, userId);
  if (!draftScopeKey) {
    return;
  }

  const database = await getComposerDraftDb();
  if (!database) {
    return;
  }

  await deletePersistedComposerDraftRecords(database, [draftScopeKey]);
};

export const resetPersistedComposerDraftAttachmentStorage = async () => {
  await closeRuntimeIndexedDb(composerDraftDbPromise);
  composerDraftDbPromise = null;

  if (!canUseIndexedDb()) {
    return;
  }

  await deleteRuntimeIndexedDb(COMPOSER_DRAFT_ATTACHMENTS_DB_NAME);
};
