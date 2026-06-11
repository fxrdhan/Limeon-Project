import type { RefObject } from 'react';
import type { VisibleBounds } from '../../utils/viewport-visibility';

export interface UseChatViewportScrollProps {
  isOpen: boolean;
  currentChannelId: string | null;
  messages: Array<{
    id: string;
  }>;
  messagesCount: number;
  loading: boolean;
  messageInputHeight: number;
  composerContextualOffset: number;
  composerContainerHeight: number;
  getVisibleMessagesBounds: () => VisibleBounds | null;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesContentRef?: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  scheduleVisibleUnreadReadReceipts: () => void;
}

export interface BottomScrollMetrics {
  container: HTMLDivElement;
  endTopInContent: number;
  targetScrollTop: number;
  visibleHeight: number;
}
