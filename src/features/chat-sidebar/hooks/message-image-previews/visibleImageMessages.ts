import type { ChatMessage } from '../../data/chatSidebarGateway';
import { chatRuntime } from '../../utils/chatRuntime';
import {
  getVerticalVisibilityBounds,
  type VisibleBounds,
} from '../../utils/viewport-visibility';
import { MIN_PARTIAL_VISIBLE_READ_HEIGHT_PX } from './constants';

interface CollectVisibleImageMessagesProps {
  chatHeaderElement: HTMLDivElement | null;
  currentChannelId: string | null;
  getVisibleMessagesBounds: () => VisibleBounds | null;
  messageBubbleElements: Map<string, HTMLDivElement>;
  messages: ChatMessage[];
  viewportPrefetchableImageMessageIds?: ReadonlySet<string>;
}

export const collectVisibleImageMessages = ({
  chatHeaderElement,
  currentChannelId,
  getVisibleMessagesBounds,
  messageBubbleElements,
  messages,
  viewportPrefetchableImageMessageIds,
}: CollectVisibleImageMessagesProps) => {
  const normalizedChannelId = currentChannelId?.trim() || '';
  if (!normalizedChannelId) {
    return [];
  }

  const bounds = getVisibleMessagesBounds();
  if (!bounds) {
    return [];
  }

  const verticalVisibilityBounds = getVerticalVisibilityBounds(
    bounds,
    chatHeaderElement?.getBoundingClientRect(),
    0
  );

  return messages.filter(messageItem => {
    if (
      messageItem.channel_id !== normalizedChannelId ||
      messageItem.id.startsWith('temp_') ||
      !chatRuntime.imageAssets.isPreviewableMessage(messageItem) ||
      (viewportPrefetchableImageMessageIds &&
        !viewportPrefetchableImageMessageIds.has(messageItem.id))
    ) {
      return false;
    }

    const bubbleElement = messageBubbleElements.get(messageItem.id);
    if (!bubbleElement) {
      return false;
    }

    const bubbleRect = bubbleElement.getBoundingClientRect();
    const visibleTop = Math.max(
      bubbleRect.top,
      verticalVisibilityBounds.minVisibleTop
    );
    const visibleBottom = Math.min(
      bubbleRect.bottom,
      verticalVisibilityBounds.maxVisibleBottom
    );
    const visibleHeight = visibleBottom - visibleTop;
    const isTopEdgeVisible =
      bubbleRect.top >= verticalVisibilityBounds.minVisibleTop &&
      bubbleRect.top < verticalVisibilityBounds.maxVisibleBottom;
    const isMeaningfullyVisibleBelowHeader =
      bubbleRect.top < verticalVisibilityBounds.minVisibleTop &&
      visibleHeight >= MIN_PARTIAL_VISIBLE_READ_HEIGHT_PX;

    return (
      visibleHeight > 0 &&
      (isTopEdgeVisible || isMeaningfullyVisibleBelowHeader)
    );
  });
};
