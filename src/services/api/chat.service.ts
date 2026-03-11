export type {
  ChatMessage,
  UserPresence,
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
  UndeliveredIncomingMessageIdsPage,
  ConversationSearchContextOptions,
} from './chat/types';

export { DEFAULT_CHAT_MESSAGES_PAGE_SIZE } from './chat/types';

export { chatMessagesService } from './chat/messages.service';
export { chatCleanupService } from './chat/cleanup.service';
export { chatPresenceService } from './chat/presence.service';

import { chatCleanupService } from './chat/cleanup.service';
import { chatMessagesService } from './chat/messages.service';
import { chatPresenceService } from './chat/presence.service';

export const chatService = {
  ...chatMessagesService,
  ...chatCleanupService,
  ...chatPresenceService,
};
