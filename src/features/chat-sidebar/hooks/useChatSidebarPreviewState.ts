import type { ChatPdfCompressionLevel } from '../../../../shared/chatFunctionContracts';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { PendingComposerAttachment } from '../types';
import type { AttachmentCaptionData } from '../utils/message-derivations';
import { useComposerAttachmentPreview } from './useComposerAttachmentPreview';
import { useMessageImagePreviews } from './useMessageImagePreviews';
import { useMessagePdfPreviews } from './useMessagePdfPreviews';
import { useMessagesPanePreviews } from './useMessagesPanePreviews';

interface UseChatSidebarPreviewStateProps {
  messages: ChatMessage[];
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
  messages,
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
  const panePreviews = useMessagesPanePreviews();
  const { getImageMessageUrl } = useMessageImagePreviews({ messages });
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
