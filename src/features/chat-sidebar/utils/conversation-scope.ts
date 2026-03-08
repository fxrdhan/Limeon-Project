export const getConversationScopeKey = (
  userId?: string | null,
  targetUserId?: string | null,
  channelId?: string | null
) => {
  if (!userId || !targetUserId || !channelId) {
    return null;
  }

  return `${userId}::${targetUserId}::${channelId}`;
};
