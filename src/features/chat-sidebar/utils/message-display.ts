import type { ChatMessage } from '../data/chatSidebarGateway';

interface ConversationDisplayParticipants {
  currentUserId: string;
  currentUserName: string;
  targetUserName: string;
}

export const mapConversationMessagesForDisplay = (
  conversationMessages: ChatMessage[],
  {
    currentUserId,
    currentUserName,
    targetUserName,
  }: ConversationDisplayParticipants
) =>
  conversationMessages.map(messageItem => ({
    ...messageItem,
    sender_name:
      messageItem.sender_id === currentUserId
        ? currentUserName
        : targetUserName,
    receiver_name:
      messageItem.receiver_id === currentUserId
        ? currentUserName
        : targetUserName,
  }));
