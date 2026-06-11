import type { RefObject } from 'react';
import { MESSAGE_BOTTOM_GAP } from '../../constants';
import type { VisibleBounds } from '../../utils/viewport-visibility';
import type { BottomScrollMetrics } from './types';

interface GetBottomScrollMetricsOptions {
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  getVisibleMessagesBounds: () => VisibleBounds | null;
}

export const getBottomScrollMetrics = ({
  messagesContainerRef,
  messagesEndRef,
  getVisibleMessagesBounds,
}: GetBottomScrollMetricsOptions): BottomScrollMetrics | null => {
  const container = messagesContainerRef.current;
  const endMarker = messagesEndRef.current;
  const bounds = getVisibleMessagesBounds();
  if (!container || !endMarker || !bounds) return null;

  const hiddenBottom = Math.max(
    0,
    bounds.containerRect.bottom - bounds.visibleBottom
  );
  const visibleHeight = container.clientHeight - hiddenBottom;
  if (visibleHeight <= 0) return null;

  const endTopInContent =
    endMarker.getBoundingClientRect().top -
    bounds.containerRect.top +
    container.scrollTop;
  const rawTargetScrollTop =
    endTopInContent - Math.max(visibleHeight - MESSAGE_BOTTOM_GAP, 0);
  const maxScrollTop = Math.max(
    0,
    container.scrollHeight - container.clientHeight
  );

  return {
    container,
    endTopInContent,
    targetScrollTop: Math.min(Math.max(rawTargetScrollTop, 0), maxScrollTop),
    visibleHeight,
  };
};
