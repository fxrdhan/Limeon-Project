import { registerBrowserLogoutCleanupContributor } from '@/lib/browserLogoutCleanupRegistry';
import { chatRuntimePersistenceRegistry } from './chatRuntimePersistenceRegistry';

registerBrowserLogoutCleanupContributor({
  id: 'chat-runtime',
  indexedDbNames: chatRuntimePersistenceRegistry.indexedDbNames,
  resetRuntimeState: chatRuntimePersistenceRegistry.resetRuntimeState,
  resetPersistentState: chatRuntimePersistenceRegistry.resetPersistentState,
});
