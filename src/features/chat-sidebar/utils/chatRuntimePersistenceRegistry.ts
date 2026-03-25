import { resetChatSidebarStore } from '@/store/chatSidebarStore';
import { chatRuntime } from './chatRuntime';
import { deleteRuntimeStorage } from './chatRuntimeState';
import { resetPersistedComposerDrafts } from './composer-draft-persistence';
import {
  CHAT_RUNTIME_INDEXED_DB_NAME_LIST,
  CHAT_RUNTIME_LOCAL_STORAGE_KEY_LIST,
} from './runtime-persistence';

const resetChatRuntimeState = () => {
  resetChatSidebarStore();
  chatRuntime.cache.conversation.reset();
  chatRuntime.cache.readReceipts.reset();
  chatRuntime.cache.signedAssets.reset();
  chatRuntime.cache.pdfPreviews.reset();
};

const clearChatRuntimeLocalStorage = () => {
  CHAT_RUNTIME_LOCAL_STORAGE_KEY_LIST.forEach(storageKey => {
    deleteRuntimeStorage(storageKey, 'local');
  });
};

const resetChatRuntimePersistentState = async () => {
  clearChatRuntimeLocalStorage();

  await Promise.all([
    resetPersistedComposerDrafts(),
    chatRuntime.pdfPreviews.resetPersisted(),
    chatRuntime.imageAssets.reset(),
  ]);
};

export const chatRuntimePersistenceRegistry = {
  localStorageKeys: CHAT_RUNTIME_LOCAL_STORAGE_KEY_LIST,
  indexedDbNames: CHAT_RUNTIME_INDEXED_DB_NAME_LIST,
  resetRuntimeState: resetChatRuntimeState,
  resetPersistentState: resetChatRuntimePersistentState,
  async resetBrowserState() {
    resetChatRuntimeState();
    await resetChatRuntimePersistentState();
  },
};
