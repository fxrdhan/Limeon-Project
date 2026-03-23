import type {
  PendingComposerAttachment,
  PendingComposerAttachmentKind,
} from '../types';
import { readRuntimeStorage, writeRuntimeStorage } from './chatRuntimeState';

const COMPOSER_DRAFT_MESSAGES_STORAGE_KEY = 'chat-composer-draft-messages';
const COMPOSER_DRAFT_ATTACHMENTS_DB_NAME = 'pharmasys-chat-composer-drafts';
const COMPOSER_DRAFT_ATTACHMENTS_DB_VERSION = 1;
const COMPOSER_DRAFT_ATTACHMENTS_STORE_NAME = 'composer-drafts';

interface PersistedComposerDraftMessageRecord {
  message: string;
  updatedAt: number;
}

interface PersistedComposerDraftMessageStore {
  [channelId: string]: PersistedComposerDraftMessageRecord;
}

interface PersistedComposerDraftAttachmentRecord {
  id: string;
  file: File;
  fileKind: PendingComposerAttachmentKind;
  fileName: string;
  fileTypeLabel: string;
  mimeType: string;
  pdfCoverUrl: string | null;
  pdfPageCount: number | null;
}

interface PersistedComposerDraftRecord {
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

const getComposerDraftDb = async (): Promise<IDBDatabase | null> => {
  if (!canUseIndexedDb()) {
    return null;
  }

  if (!composerDraftDbPromise) {
    composerDraftDbPromise = new Promise(resolve => {
      const request = window.indexedDB.open(
        COMPOSER_DRAFT_ATTACHMENTS_DB_NAME,
        COMPOSER_DRAFT_ATTACHMENTS_DB_VERSION
      );

      request.onerror = () => {
        composerDraftDbPromise = null;
        resolve(null);
      };

      request.onupgradeneeded = event => {
        const database = (event.target as IDBOpenDBRequest).result;

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
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  return composerDraftDbPromise;
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
  const record = payload?.[normalizedChannelId];

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

  const nextPayload =
    readRuntimeStorage<PersistedComposerDraftMessageStore>(
      COMPOSER_DRAFT_MESSAGES_STORAGE_KEY,
      'local'
    ) ?? {};

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

  return new Promise(resolve => {
    const transaction = database.transaction(
      COMPOSER_DRAFT_ATTACHMENTS_STORE_NAME,
      'readonly'
    );
    const store = transaction.objectStore(
      COMPOSER_DRAFT_ATTACHMENTS_STORE_NAME
    );
    const request = store.get(normalizedChannelId);

    request.onsuccess = () => {
      const record = request.result as PersistedComposerDraftRecord | undefined;
      if (!record || !Array.isArray(record.attachments)) {
        resolve([]);
        return;
      }

      const attachments = record.attachments.flatMap(attachment => {
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

      resolve(attachments);
    };

    request.onerror = () => {
      resolve([]);
    };
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
};
