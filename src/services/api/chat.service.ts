export type {
  ChatMessage,
  UserPresence,
  PresenceSyncResult,
  ChatMessageInsertInput,
  CreateChatMessageInput,
  EditChatMessageTextInput,
  ChatFilePreviewUpdateInput,
  DeleteMessageThreadAndCleanupResult,
  DeleteMessageThreadsAndCleanupResult,
  CleanupStoragePathsResult,
  RetryChatCleanupFailuresResult,
  UserPresenceUpdateInput,
  ConversationMessagesPage,
  ConversationSearchMessagesOptions,
  ConversationSearchMessagesPage,
  UndeliveredIncomingMessageIdsPage,
  ConversationSearchContextOptions,
  PersistChatPdfPreviewInput,
  PersistChatPdfPreviewResult,
  ChatSharedLinkResult,
} from './chat/types';

export { DEFAULT_CHAT_MESSAGES_PAGE_SIZE } from './chat/types';

export { chatMessagesService } from './chat/messages.service';
export { chatCleanupService } from './chat/cleanup.service';
export { chatLinkService } from './chat/link.service';
export { chatPresenceService } from './chat/presence.service';
export { chatPreviewService } from './chat/preview.service';

import { chatCleanupService } from './chat/cleanup.service';
import { chatLinkService } from './chat/link.service';
import { chatMessagesService } from './chat/messages.service';
import { chatPresenceService } from './chat/presence.service';
import { chatPreviewService } from './chat/preview.service';

export const chatService = {
  ...chatMessagesService,
  ...chatCleanupService,
  ...chatLinkService,
  ...chatPresenceService,
  ...chatPreviewService,
};
