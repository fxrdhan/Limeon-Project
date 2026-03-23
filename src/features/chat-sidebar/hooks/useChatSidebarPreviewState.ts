import type { ChatPdfCompressionLevel } from '../../../../shared/chatFunctionContracts';
import type { RefObject } from 'react';
import type { MutableRefObject } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { PendingComposerAttachment } from '../types';
import type { AttachmentCaptionData } from '../utils/message-derivations';
import type { VisibleBounds } from '../utils/viewport-visibility';
import { useComposerAttachmentPreview } from './useComposerAttachmentPreview';
import { useMessageImagePreviews } from './useMessageImagePreviews';
import { useMessagePdfPreviews } from './useMessagePdfPreviews';
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
  const panePreviews = useMessagesPanePreviews({ currentChannelId });
  const { getImageMessageUrl } = useMessageImagePreviews({
    messages,
    currentChannelId,
    messagesContainerRef,
    chatHeaderContainerRef,
    messageBubbleRefs,
    getVisibleMessagesBounds,
  });
  const { getPdfMessagePreview } = useMessagePdfPreviews({
    messages,
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
    getImageMessageUrl,
    getPdfMessagePreview,
    captionMessagesByAttachmentId: captionData.captionMessagesByAttachmentId,
    captionMessageIds: captionData.captionMessageIds,
  };
};
