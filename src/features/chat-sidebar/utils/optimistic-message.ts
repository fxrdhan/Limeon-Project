import type { ChatMessage } from '../data/chatSidebarGateway';

export const isTempMessageId = (messageId?: string | null) =>
  Boolean(messageId?.startsWith('temp_'));

export const commitOptimisticMessage = (
  previousMessages: ChatMessage[],
  tempMessageId: string,
  persistedMessage: ChatMessage
) => {
  let replacedTempMessage = false;

  const nextMessages = previousMessages.map(messageItem => {
    if (messageItem.id !== tempMessageId) {
      return messageItem;
    }

    replacedTempMessage = true;
    return persistedMessage;
  });

  if (!replacedTempMessage) {
    const alreadyHasPersistedMessage = nextMessages.some(
      messageItem => messageItem.id === persistedMessage.id
    );

    if (!alreadyHasPersistedMessage) {
      nextMessages.push(persistedMessage);
    }
  }

  const dedupedMessages: ChatMessage[] = [];
  const seenMessageIds = new Set<string>();

  for (const messageItem of nextMessages) {
    if (seenMessageIds.has(messageItem.id)) {
      continue;
    }

    seenMessageIds.add(messageItem.id);
    dedupedMessages.push(messageItem);
  }

  return dedupedMessages;
};
