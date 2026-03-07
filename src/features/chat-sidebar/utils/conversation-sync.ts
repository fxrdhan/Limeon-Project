import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { mapConversationMessagesForDisplay } from './message-display';

interface ConversationParticipant {
  id: string;
  name: string;
}

export const mapPersistedMessageForDisplay = (
  message: ChatMessage,
  user: ConversationParticipant,
  targetUser: ChatSidebarPanelTargetUser,
  stableKey: string
): ChatMessage => ({
  ...message,
  sender_name: user.name || 'You',
  receiver_name: targetUser.name || 'Unknown',
  stableKey,
});

export const mergeConversationSnapshotWithPending = (
  previousMessages: ChatMessage[],
  mappedMessages: ChatMessage[]
) => {
  const mappedMessageIds = new Set(
    mappedMessages.map(messageItem => messageItem.id)
  );
  const pendingMessages = previousMessages.filter(
    messageItem =>
      messageItem.id.startsWith('temp_') &&
      !mappedMessageIds.has(messageItem.id)
  );

  return [...mappedMessages, ...pendingMessages];
};

export const reconcileConversationMessages = ({
  latestMessages,
  user,
  targetUser,
  setMessages,
}: {
  latestMessages: ChatMessage[];
  user: ConversationParticipant;
  targetUser: ChatSidebarPanelTargetUser;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}) => {
  const mappedMessages = mapConversationMessagesForDisplay(latestMessages, {
    currentUserId: user.id,
    currentUserName: user.name || 'You',
    targetUserName: targetUser.name || 'Unknown',
  });

  setMessages(previousMessages =>
    mergeConversationSnapshotWithPending(previousMessages, mappedMessages)
  );

  return mappedMessages;
};
