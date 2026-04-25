import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { mapConversationMessagesForDisplay } from './message-display';

interface ConversationParticipant {
  id: string;
  name: string;
}

const compareConversationMessageOrder = (
  leftMessage: Pick<ChatMessage, 'created_at' | 'id'>,
  rightMessage: Pick<ChatMessage, 'created_at' | 'id'>
) => {
  const createdAtOrder = leftMessage.created_at.localeCompare(
    rightMessage.created_at
  );
  if (createdAtOrder !== 0) {
    return createdAtOrder;
  }

  return leftMessage.id.localeCompare(rightMessage.id);
};

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

export const mapConversationMessageForDisplay = (
  message: ChatMessage,
  user: ConversationParticipant,
  targetUser: ChatSidebarPanelTargetUser,
  stableKey?: string
) => ({
  ...mapConversationMessagesForDisplay([message], {
    currentUserId: user.id,
    currentUserName: user.name || 'You',
    targetUserName: targetUser.name || 'Unknown',
  })[0],
  stableKey: stableKey || message.stableKey,
});

export const mergeConversationSnapshotWithPending = (
  previousMessages: ChatMessage[],
  mappedMessages: ChatMessage[],
  currentChannelId?: string | null
) => {
  const stableKeysByMessageId = new Map(
    previousMessages.map(messageItem => [messageItem.id, messageItem.stableKey])
  );
  const mappedMessagesWithStableKeys = mappedMessages.map(messageItem => ({
    ...messageItem,
    stableKey:
      stableKeysByMessageId.get(messageItem.id) || messageItem.stableKey,
  }));
  const mappedMessageIds = new Set(
    mappedMessagesWithStableKeys.map(messageItem => messageItem.id)
  );
  const pendingMessages = previousMessages.filter(
    messageItem =>
      messageItem.id.startsWith('temp_') &&
      (!currentChannelId || messageItem.channel_id === currentChannelId) &&
      !mappedMessageIds.has(messageItem.id)
  );

  return [...mappedMessagesWithStableKeys, ...pendingMessages];
};

const sortPersistedConversationMessages = (messages: ChatMessage[]) =>
  [...messages].sort(compareConversationMessageOrder);

export const mergeLatestConversationPageWithExisting = ({
  previousMessages,
  latestMessages,
  currentChannelId,
  preserveOlderPersistedMessages,
}: {
  previousMessages: ChatMessage[];
  latestMessages: ChatMessage[];
  currentChannelId?: string | null;
  preserveOlderPersistedMessages: boolean;
}) => {
  const stableKeysByMessageId = new Map(
    previousMessages.map(messageItem => [messageItem.id, messageItem.stableKey])
  );
  const latestMessagesWithStableKeys = latestMessages.map(messageItem => ({
    ...messageItem,
    stableKey:
      stableKeysByMessageId.get(messageItem.id) || messageItem.stableKey,
  }));
  const latestMessageIds = new Set(
    latestMessagesWithStableKeys.map(messageItem => messageItem.id)
  );
  const pendingMessages = previousMessages.filter(
    messageItem =>
      messageItem.id.startsWith('temp_') &&
      (!currentChannelId || messageItem.channel_id === currentChannelId) &&
      !latestMessageIds.has(messageItem.id)
  );

  if (latestMessagesWithStableKeys.length === 0) {
    return pendingMessages;
  }

  const oldestLatestMessage = latestMessagesWithStableKeys[0];
  const olderPersistedMessages = preserveOlderPersistedMessages
    ? previousMessages.filter(messageItem => {
        if (messageItem.id.startsWith('temp_')) {
          return false;
        }

        if (latestMessageIds.has(messageItem.id)) {
          return false;
        }

        if (currentChannelId && messageItem.channel_id !== currentChannelId) {
          return false;
        }

        return (
          compareConversationMessageOrder(messageItem, oldestLatestMessage) < 0
        );
      })
    : [];

  return [
    ...sortPersistedConversationMessages([
      ...olderPersistedMessages,
      ...latestMessagesWithStableKeys,
    ]),
    ...pendingMessages,
  ];
};

export const mergeConversationContextWithExisting = (
  previousMessages: ChatMessage[],
  mappedContextMessages: ChatMessage[],
  currentChannelId?: string | null
) => {
  const stableKeysByMessageId = new Map(
    previousMessages.map(messageItem => [messageItem.id, messageItem.stableKey])
  );
  const pendingMessages = previousMessages.filter(
    messageItem =>
      messageItem.id.startsWith('temp_') &&
      (!currentChannelId || messageItem.channel_id === currentChannelId)
  );
  const persistedMessagesById = new Map(
    previousMessages
      .filter(messageItem => !messageItem.id.startsWith('temp_'))
      .map(messageItem => [messageItem.id, messageItem])
  );

  mappedContextMessages.forEach(messageItem => {
    persistedMessagesById.set(messageItem.id, {
      ...messageItem,
      stableKey:
        stableKeysByMessageId.get(messageItem.id) || messageItem.stableKey,
    });
  });

  return [
    ...sortPersistedConversationMessages([...persistedMessagesById.values()]),
    ...pendingMessages,
  ];
};

export const reconcileConversationMessages = ({
  latestMessages,
  user,
  targetUser,
  currentChannelId,
  setMessages,
}: {
  latestMessages: ChatMessage[];
  user: ConversationParticipant;
  targetUser: ChatSidebarPanelTargetUser;
  currentChannelId?: string | null;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}) => {
  const mappedMessages = mapConversationMessagesForDisplay(latestMessages, {
    currentUserId: user.id,
    currentUserName: user.name || 'You',
    targetUserName: targetUser.name || 'Unknown',
  });

  setMessages(previousMessages =>
    mergeConversationSnapshotWithPending(
      previousMessages,
      mappedMessages,
      currentChannelId
    )
  );

  return mappedMessages;
};

export const applyConversationSnapshot = ({
  snapshotMessages,
  user,
  targetUser,
  currentChannelId,
  setMessages,
  initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef,
}: {
  snapshotMessages: ChatMessage[];
  user: ConversationParticipant;
  targetUser: ChatSidebarPanelTargetUser;
  currentChannelId?: string | null;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  initialMessageAnimationKeysRef?: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef?: MutableRefObject<Set<string>>;
}) => {
  const mappedMessages = mapConversationMessagesForDisplay(snapshotMessages, {
    currentUserId: user.id,
    currentUserName: user.name || 'You',
    targetUserName: targetUser.name || 'Unknown',
  });

  if (initialMessageAnimationKeysRef) {
    const initialMessageAnimationKeys = new Set(
      mappedMessages.map(messageItem => messageItem.stableKey || messageItem.id)
    );
    initialMessageAnimationKeysRef.current = initialMessageAnimationKeys;
    if (initialOpenJumpAnimationKeysRef) {
      initialOpenJumpAnimationKeysRef.current = new Set();
    }
  }

  setMessages(previousMessages => {
    if (previousMessages.length === 0) {
      return mergeConversationSnapshotWithPending(
        previousMessages,
        mappedMessages,
        currentChannelId
      );
    }

    return mergeConversationSnapshotWithPending(
      previousMessages,
      mappedMessages,
      currentChannelId
    );
  });

  return mappedMessages;
};

export const isConversationMessageForPair = (
  message: Pick<ChatMessage, 'sender_id' | 'receiver_id'>,
  userId: string,
  targetUserId: string
) => {
  const isIncomingConversationMessage =
    message.sender_id === targetUserId && message.receiver_id === userId;
  const isOutgoingConversationMessage =
    message.sender_id === userId && message.receiver_id === targetUserId;

  return isIncomingConversationMessage || isOutgoingConversationMessage;
};

export const reconcileInsertedConversationMessage = ({
  previousMessages,
  insertedMessage,
  currentChannelId,
}: {
  previousMessages: ChatMessage[];
  insertedMessage: ChatMessage;
  currentChannelId: string | null;
}) => {
  const existingPersistedMessage = previousMessages.some(
    messageItem => messageItem.id === insertedMessage.id
  );
  if (existingPersistedMessage) {
    return previousMessages;
  }

  let matchingTempIndex = -1;

  for (
    let messageIndex = previousMessages.length - 1;
    messageIndex >= 0;
    messageIndex -= 1
  ) {
    const previousMessage = previousMessages[messageIndex];
    if (!previousMessage.id.startsWith('temp_')) continue;
    if (previousMessage.channel_id !== currentChannelId) continue;
    if (previousMessage.sender_id !== insertedMessage.sender_id) continue;
    if (previousMessage.receiver_id !== insertedMessage.receiver_id) continue;
    if (previousMessage.message_type !== insertedMessage.message_type) continue;

    const matchesStoragePath =
      previousMessage.file_storage_path &&
      insertedMessage.file_storage_path &&
      previousMessage.file_storage_path === insertedMessage.file_storage_path;
    const matchesAttachmentCaption =
      previousMessage.message_relation_kind === 'attachment_caption' &&
      insertedMessage.message_relation_kind === 'attachment_caption' &&
      previousMessage.message.trim() === insertedMessage.message.trim();
    const matchesTextContent =
      previousMessage.message_type === 'text' &&
      previousMessage.message.trim() === insertedMessage.message.trim() &&
      (previousMessage.reply_to_id ?? null) ===
        (insertedMessage.reply_to_id ?? null);

    if (matchesStoragePath || matchesAttachmentCaption || matchesTextContent) {
      matchingTempIndex = messageIndex;
      break;
    }
  }

  if (matchingTempIndex === -1) {
    return [...previousMessages, insertedMessage];
  }

  return previousMessages.map((messageItem, messageIndex) =>
    messageIndex === matchingTempIndex
      ? {
          ...insertedMessage,
          stableKey: messageItem.stableKey || insertedMessage.stableKey,
        }
      : messageItem
  );
};
