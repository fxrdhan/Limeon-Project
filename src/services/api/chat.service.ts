export type {
  ChatMessage,
  UserPresence,
  PresenceSyncResult,
  ChatMessageInsertInput,
  CreateChatMessageInput,
  EditChatMessageTextInput,
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
  ChatDirectoryUser,
  ChatDirectoryUsersPage,
  ChatForwardMessageResult,
  ChatSharedLinkResult,
} from './chat/types';

export { DEFAULT_CHAT_MESSAGES_PAGE_SIZE } from './chat/types';

export { chatMessagesService } from './chat/messages.service';
export { chatDirectoryService } from './chat/directory.service';
export { chatCleanupService } from './chat/cleanup.service';
export { chatForwardService } from './chat/forward.service';
export { chatLinkService } from './chat/link.service';
export {
  chatPdfCompressService,
  type ChatPdfCompressResult,
} from './chat/pdf-compress.service';
export { chatPresenceService } from './chat/presence.service';

import { chatCleanupService } from './chat/cleanup.service';
import { chatDirectoryService } from './chat/directory.service';
import { chatForwardService } from './chat/forward.service';
import { chatLinkService } from './chat/link.service';
import { chatMessagesService } from './chat/messages.service';
import { chatPdfCompressService } from './chat/pdf-compress.service';
import { chatPresenceService } from './chat/presence.service';

export const chatService = {
  ...chatMessagesService,
  ...chatDirectoryService,
  ...chatCleanupService,
  ...chatForwardService,
  ...chatLinkService,
  ...chatPdfCompressService,
  ...chatPresenceService,
};
