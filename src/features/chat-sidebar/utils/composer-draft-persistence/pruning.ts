import {
  COMPOSER_DRAFT_ATTACHMENTS_MAX_CHANNEL_BYTES,
  COMPOSER_DRAFT_ATTACHMENTS_MAX_TOTAL_BYTES,
  COMPOSER_DRAFT_MAX_AGE_MS,
} from './constants';
import { normalizeChannelId } from './scope';
import type {
  PersistedComposerDraftMessageStore,
  PersistedComposerDraftRecord,
} from './types';

const normalizeUpdatedAt = (updatedAt: unknown, now: number) =>
  typeof updatedAt === 'number' && Number.isFinite(updatedAt) && updatedAt > 0
    ? updatedAt
    : now;

const isComposerDraftFresh = (
  updatedAt: unknown,
  now: number,
  maxAgeMs: number
) => now - normalizeUpdatedAt(updatedAt, now) <= maxAgeMs;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

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
  payload: unknown,
  options?: {
    now?: number;
    maxAgeMs?: number;
  }
) => {
  const now = options?.now ?? Date.now();
  const maxAgeMs = options?.maxAgeMs ?? COMPOSER_DRAFT_MAX_AGE_MS;
  const nextStore: PersistedComposerDraftMessageStore = {};
  let didPrune = false;

  if (!isObjectRecord(payload)) {
    return {
      didPrune: payload !== null && payload !== undefined,
      store: nextStore,
    };
  }

  Object.entries(payload).forEach(([rawChannelId, record]) => {
    const channelId = normalizeChannelId(rawChannelId);
    if (
      !channelId ||
      !isObjectRecord(record) ||
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
