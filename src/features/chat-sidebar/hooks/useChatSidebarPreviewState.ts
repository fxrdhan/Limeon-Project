import type { ChatPdfCompressionLevel } from '../../../../shared/chatFunctionContracts';
import type { RefObject } from 'react';
import type { MutableRefObject } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { PendingComposerAttachment } from '../types';
import { buildMessageRenderItems } from '../utils/message-render-items';
import type { AttachmentCaptionData } from '../utils/message-derivations';
import type { VisibleBounds } from '../utils/viewport-visibility';
import { isCacheableChannelImageMessage } from '../utils/channel-image-asset-cache';
import { useChatSidebarAssetPreviews } from './useChatSidebarAssetPreviews';
import { useComposerAttachmentPreview } from './useComposerAttachmentPreview';
import { useMessagesPanePreviews } from './useMessagesPanePreviews';

interface UseChatSidebarPreviewStateProps {
  currentChannelId: string | null;
  messages: ChatMessage[];
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  chatHeaderContainerRef: RefObject<HTMLDivElement | null>;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  getVisibleMessagesBounds: () => VisibleBounds | null;
  pendingComposerAttachments: PendingComposerAttachment[];
  closeMessageMenu: () => void;
  handleAttachImageClick: (replaceAttachmentId?: string) => void;
  handleAttachDocumentClick: (replaceAttachmentId?: string) => void;
  compressPendingComposerImage: (attachmentId: string) => Promise<boolean>;
  compressPendingComposerPdf: (
    attachmentId: string,
    compressionLevel?: ChatPdfCompressionLevel
  ) => Promise<boolean>;
  removePendingComposerAttachment: (attachmentId: string) => void;
  openComposerImagePreview: (attachmentId: string) => void;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: (targetMessage: ChatMessage) => 'audio' | 'document';
  captionData: AttachmentCaptionData;
}

export const useChatSidebarPreviewState = ({
  currentChannelId,
  messages,
  messagesContainerRef,
  chatHeaderContainerRef,
  messageBubbleRefs,
  getVisibleMessagesBounds,
  pendingComposerAttachments,
  closeMessageMenu,
  handleAttachImageClick,
  handleAttachDocumentClick,
  compressPendingComposerImage,
  compressPendingComposerPdf,
  removePendingComposerAttachment,
  openComposerImagePreview,
  getAttachmentFileName,
  getAttachmentFileKind,
  captionData,
}: UseChatSidebarPreviewStateProps) => {
  const viewportPrefetchableImageMessageIds = new Set<string>();
  buildMessageRenderItems({
    messages: messages.filter(
      messageItem => !captionData.captionMessageIds.has(messageItem.id)
    ),
    captionMessagesByAttachmentId: captionData.captionMessagesByAttachmentId,
    getAttachmentFileKind,
    enableImageBubbleGrouping: true,
    enableDocumentBubbleGrouping: true,
  }).forEach(renderItem => {
    if (renderItem.kind === 'image-group') {
      renderItem.messages.slice(0, 4).forEach(messageItem => {
        viewportPrefetchableImageMessageIds.add(messageItem.id);
      });
      return;
    }

    if (isCacheableChannelImageMessage(renderItem.anchorMessage)) {
      viewportPrefetchableImageMessageIds.add(renderItem.anchorMessage.id);
    }
  });
  messages.forEach(messageItem => {
    if (
      !captionData.captionMessageIds.has(messageItem.id) &&
      isCacheableChannelImageMessage(messageItem)
    ) {
      viewportPrefetchableImageMessageIds.add(messageItem.id);
    }
  });

  const panePreviews = useMessagesPanePreviews({
    currentChannelId,
    closeMessageMenu,
  });
  const assetPreviews = useChatSidebarAssetPreviews({
    currentChannelId,
    messages,
    messagesContainerRef,
    chatHeaderContainerRef,
    messageBubbleRefs,
    getVisibleMessagesBounds,
    viewportPrefetchableImageMessageIds,
    getAttachmentFileName,
    getAttachmentFileKind,
  });
  const composerAttachmentPreview = useComposerAttachmentPreview({
    pendingComposerAttachments,
    onOpenImageActionsMenu: closeMessageMenu,
    onAttachImageClick: handleAttachImageClick,
    onAttachDocumentClick: handleAttachDocumentClick,
    onCompressPendingComposerImage: compressPendingComposerImage,
    onCompressPendingComposerPdf: compressPendingComposerPdf,
    onRemovePendingComposerAttachment: removePendingComposerAttachment,
    onOpenComposerImagePreview: openComposerImagePreview,
  });

  return {
    ...panePreviews,
    ...composerAttachmentPreview,
    ...assetPreviews,
    captionMessagesByAttachmentId: captionData.captionMessagesByAttachmentId,
    captionMessageIds: captionData.captionMessageIds,
  };
};
