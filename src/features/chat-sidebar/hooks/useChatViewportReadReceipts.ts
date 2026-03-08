import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type { RefObject } from 'react';
import {
  getVerticalVisibilityBounds,
  type VisibleBounds,
} from '../utils/viewport-visibility';

const SCROLL_READ_RECEIPT_DEBOUNCE_MS = 90;

interface ReadReceiptMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  is_read: boolean;
}

interface UseChatViewportReadReceiptsProps {
  messages: ReadReceiptMessage[];
  userId?: string;
  targetUserId?: string;
  markMessageIdsAsRead: (messageIds: string[]) => Promise<void>;
  getVisibleMessagesBounds: () => VisibleBounds | null;
  chatHeaderContainerRef: RefObject<HTMLDivElement | null>;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
}

export const useChatViewportReadReceipts = ({
  messages,
  userId,
  targetUserId,
  markMessageIdsAsRead,
  getVisibleMessagesBounds,
  chatHeaderContainerRef,
  messageBubbleRefs,
}: UseChatViewportReadReceiptsProps) => {
  const pendingReadReceiptTimeoutRef = useRef<number | null>(null);

  const flushVisibleUnreadReadReceipts = useCallback(() => {
    if (!userId || !targetUserId) {
      return;
    }

    const bounds = getVisibleMessagesBounds();
    if (!bounds) {
      return;
    }

    const visibleUnreadIncomingMessageIds = messages
      .filter(
        messageItem =>
          messageItem.sender_id === targetUserId &&
          messageItem.receiver_id === userId &&
          !messageItem.is_read
      )
      .map(messageItem => {
        const bubbleElement = messageBubbleRefs.current.get(messageItem.id);
        if (!bubbleElement) return null;

        const verticalVisibilityBounds = getVerticalVisibilityBounds(
          bounds,
          chatHeaderContainerRef.current?.getBoundingClientRect(),
          0
        );
        const bubbleRect = bubbleElement.getBoundingClientRect();
        const isVisible =
          bubbleRect.top >= verticalVisibilityBounds.minVisibleTop &&
          bubbleRect.top < verticalVisibilityBounds.maxVisibleBottom;
        return isVisible ? messageItem.id : null;
      })
      .filter((messageId): messageId is string => Boolean(messageId));

    if (visibleUnreadIncomingMessageIds.length === 0) {
      return;
    }

    void markMessageIdsAsRead(visibleUnreadIncomingMessageIds);
  }, [
    chatHeaderContainerRef,
    getVisibleMessagesBounds,
    markMessageIdsAsRead,
    messageBubbleRefs,
    messages,
    targetUserId,
    userId,
  ]);

  const scheduleVisibleUnreadReadReceipts = useCallback(() => {
    if (pendingReadReceiptTimeoutRef.current !== null) {
      window.clearTimeout(pendingReadReceiptTimeoutRef.current);
    }

    pendingReadReceiptTimeoutRef.current = window.setTimeout(() => {
      pendingReadReceiptTimeoutRef.current = null;
      flushVisibleUnreadReadReceipts();
    }, SCROLL_READ_RECEIPT_DEBOUNCE_MS);
  }, [flushVisibleUnreadReadReceipts]);

  useEffect(() => {
    return () => {
      if (pendingReadReceiptTimeoutRef.current !== null) {
        window.clearTimeout(pendingReadReceiptTimeoutRef.current);
        pendingReadReceiptTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    scheduleVisibleUnreadReadReceipts,
  };
};
