import { isTempMessageId } from './optimistic-message';

const getNormalizedMessageIds = (messageIds: string[] | null | undefined) => [
  ...new Set(
    messageIds?.filter(messageId => messageId.trim().length > 0) ?? []
  ),
];

export const resolveDeletedThreadMessageIds = (
  deletedMessageIds: string[] | null | undefined,
  fallbackMessageIds: string[]
) => {
  const resolvedDeletedMessageIds = getNormalizedMessageIds(deletedMessageIds);
  if (resolvedDeletedMessageIds.length > 0) {
    return resolvedDeletedMessageIds;
  }

  return getNormalizedMessageIds(fallbackMessageIds);
};

export const getPersistedDeletedThreadMessageIds = (
  deletedMessageIds: string[] | null | undefined,
  fallbackMessageIds: string[]
) =>
  resolveDeletedThreadMessageIds(deletedMessageIds, fallbackMessageIds).filter(
    messageId => !isTempMessageId(messageId)
  );
