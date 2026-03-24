import type { MutableRefObject, RefObject } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { VisibleBounds } from '../utils/viewport-visibility';
import { useMessageImagePreviews } from './useMessageImagePreviews';
import { useMessagePdfPreviews } from './useMessagePdfPreviews';

interface UseChatSidebarAssetPreviewsProps {
  currentChannelId: string | null;
  messages: ChatMessage[];
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  chatHeaderContainerRef: RefObject<HTMLDivElement | null>;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  getVisibleMessagesBounds: () => VisibleBounds | null;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: (targetMessage: ChatMessage) => 'audio' | 'document';
}

export const useChatSidebarAssetPreviews = ({
  currentChannelId,
  messages,
  messagesContainerRef,
  chatHeaderContainerRef,
  messageBubbleRefs,
  getVisibleMessagesBounds,
  getAttachmentFileName,
  getAttachmentFileKind,
}: UseChatSidebarAssetPreviewsProps) => {
  const imagePreviews = useMessageImagePreviews({
    messages,
    currentChannelId,
    messagesContainerRef,
    chatHeaderContainerRef,
    messageBubbleRefs,
    getVisibleMessagesBounds,
  });
  const pdfPreviews = useMessagePdfPreviews({
    messages,
    getAttachmentFileName,
    getAttachmentFileKind,
  });

  return {
    ...imagePreviews,
    ...pdfPreviews,
  };
};
