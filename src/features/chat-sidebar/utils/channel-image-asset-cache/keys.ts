import type { ChannelImageAssetVariant } from './types';

export const CHANNEL_IMAGE_ASSET_SCOPE_RETENTION_LIMIT = 3;

export const normalizeChannelId = (channelId?: string | null) =>
  channelId?.trim() || null;

export const normalizeMessageId = (messageId?: string | null) =>
  messageId?.trim() || null;

export const buildRetainedChannelImageAssetScopeIds = ({
  activeChannelId,
  previousRetainedChannelIds = [],
  retentionLimit = CHANNEL_IMAGE_ASSET_SCOPE_RETENTION_LIMIT,
}: {
  activeChannelId?: string | null;
  previousRetainedChannelIds?: Array<string | null | undefined>;
  retentionLimit?: number;
}) => {
  const normalizedActiveChannelId = normalizeChannelId(activeChannelId);
  const normalizedPreviousChannelIds = previousRetainedChannelIds
    .map(channelId => normalizeChannelId(channelId))
    .filter((channelId): channelId is string => Boolean(channelId));

  if (!normalizedActiveChannelId) {
    return [...new Set(normalizedPreviousChannelIds)].slice(0, retentionLimit);
  }

  return [
    ...new Set([
      normalizedActiveChannelId,
      ...normalizedPreviousChannelIds.filter(
        channelId => channelId !== normalizedActiveChannelId
      ),
    ]),
  ].slice(0, retentionLimit);
};

export const buildChannelImageAssetKey = (
  channelId: string,
  messageId: string,
  variant: ChannelImageAssetVariant
) => `${channelId}::${messageId}::${variant}`;
