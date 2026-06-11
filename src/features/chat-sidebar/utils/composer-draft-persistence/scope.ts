export const normalizeChannelId = (channelId?: string | null) =>
  channelId?.trim() || null;

export const normalizeDraftScopeKey = (
  channelId?: string | null,
  userId?: string | null
) => {
  const normalizedChannelId = normalizeChannelId(channelId);
  if (!normalizedChannelId) {
    return null;
  }

  const normalizedUserId = userId?.trim();
  return normalizedUserId
    ? `${normalizedUserId}:${normalizedChannelId}`
    : normalizedChannelId;
};
