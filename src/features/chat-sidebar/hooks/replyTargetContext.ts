import type { ChatMessage } from '../data/chatSidebarGateway';

export const REPLY_TARGET_CONTEXT_BEFORE_LIMIT = 20;
export const REPLY_TARGET_CONTEXT_AFTER_LIMIT = 20;

const compareMessagesByCreatedAtAndId = (
  leftMessage: ChatMessage,
  rightMessage: ChatMessage
) => {
  const createdAtOrder = leftMessage.created_at.localeCompare(
    rightMessage.created_at
  );

  return createdAtOrder !== 0
    ? createdAtOrder
    : leftMessage.id.localeCompare(rightMessage.id);
};

export const getReplyTargetContextHasOlderMessages = (
  messageId: string,
  contextMessages: ChatMessage[],
  beforeLimit = REPLY_TARGET_CONTEXT_BEFORE_LIMIT
) => {
  const targetMessage = contextMessages.find(
    messageItem => messageItem.id === messageId
  );
  if (!targetMessage) {
    return undefined;
  }

  const replyTargetAndOlderCount = contextMessages.filter(messageItem => {
    const createdAtOrder = messageItem.created_at.localeCompare(
      targetMessage.created_at
    );
    return (
      createdAtOrder < 0 ||
      (createdAtOrder === 0 &&
        messageItem.id.localeCompare(targetMessage.id) <= 0)
    );
  }).length;

  return replyTargetAndOlderCount > beforeLimit;
};

export const getOldestReplyTargetContextMessage = (
  contextMessages: ChatMessage[]
) =>
  contextMessages.reduce<ChatMessage | null>((oldestMessage, messageItem) => {
    if (!oldestMessage) {
      return messageItem;
    }

    return compareMessagesByCreatedAtAndId(messageItem, oldestMessage) < 0
      ? messageItem
      : oldestMessage;
  }, null);

export const mergeAndOrderReplyTargetContextMessages = (
  currentMessages: ChatMessage[],
  contextMessages: ChatMessage[]
) => {
  const messagesById = [...currentMessages, ...contextMessages].reduce<
    Map<string, ChatMessage>
  >((mergedMessages, messageItem) => {
    mergedMessages.set(messageItem.id, messageItem);
    return mergedMessages;
  }, new Map());

  return [...messagesById.values()].sort(compareMessagesByCreatedAtAndId);
};
