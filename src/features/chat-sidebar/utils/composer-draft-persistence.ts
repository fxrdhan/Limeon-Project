import { resetPersistedComposerDraftAttachmentStorage } from './composer-draft-persistence/attachments';
import { resetPersistedComposerDraftMessages } from './composer-draft-persistence/messages';

export {
  clearPersistedComposerDraftAttachments,
  loadPersistedComposerDraftAttachments,
  persistComposerDraftAttachments,
} from './composer-draft-persistence/attachments';
export {
  COMPOSER_DRAFT_ATTACHMENTS_MAX_CHANNEL_BYTES,
  COMPOSER_DRAFT_ATTACHMENTS_MAX_TOTAL_BYTES,
  COMPOSER_DRAFT_MAX_AGE_MS,
} from './composer-draft-persistence/constants';
export {
  readPersistedComposerDraftMessage,
  writePersistedComposerDraftMessage,
} from './composer-draft-persistence/messages';
export {
  prunePersistedComposerDraftAttachmentRecords,
  prunePersistedComposerDraftMessageStore,
} from './composer-draft-persistence/pruning';
export type {
  PersistedComposerDraftAttachment,
  PersistedComposerDraftAttachmentRecord,
  PersistedComposerDraftMessageRecord,
  PersistedComposerDraftMessageStore,
  PersistedComposerDraftRecord,
} from './composer-draft-persistence/types';

export const resetPersistedComposerDrafts = async () => {
  resetPersistedComposerDraftMessages();
  await resetPersistedComposerDraftAttachmentStorage();
};
