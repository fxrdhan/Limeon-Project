import {
  deleteRuntimeStorage,
  readRuntimeStorage,
  writeRuntimeStorage,
} from '../chatRuntimeState';
import { COMPOSER_DRAFT_MESSAGES_STORAGE_KEY } from './constants';
import { prunePersistedComposerDraftMessageStore } from './pruning';
import { normalizeDraftScopeKey } from './scope';

export const readPersistedComposerDraftMessage = (
  channelId?: string | null,
  userId?: string | null
) => {
  const draftScopeKey = normalizeDraftScopeKey(channelId, userId);
  if (!draftScopeKey) {
    return '';
  }

  const payload = readRuntimeStorage(
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
  const record = prunedPayload.store[draftScopeKey];

  return typeof record?.message === 'string' ? record.message : '';
};

export const writePersistedComposerDraftMessage = (
  channelId: string | null | undefined,
  message: string,
  userId?: string | null
) => {
  const draftScopeKey = normalizeDraftScopeKey(channelId, userId);
  if (!draftScopeKey) {
    return false;
  }

  const nextPayload = prunePersistedComposerDraftMessageStore(
    readRuntimeStorage(COMPOSER_DRAFT_MESSAGES_STORAGE_KEY, 'local')
  ).store;

  if (message.length === 0) {
    delete nextPayload[draftScopeKey];
  } else {
    nextPayload[draftScopeKey] = {
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

export const resetPersistedComposerDraftMessages = () => {
  deleteRuntimeStorage(COMPOSER_DRAFT_MESSAGES_STORAGE_KEY, 'local');
};
