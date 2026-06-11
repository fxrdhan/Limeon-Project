import type { ChatPdfCompressionLevel } from '../../../../../shared/chatFunctionContracts';
import type { PendingComposerAttachment } from '../../types';

export interface MenuPosition {
  top: number;
  left: number;
}

export interface UseComposerAttachmentPreviewProps {
  pendingComposerAttachments: PendingComposerAttachment[];
  onOpenImageActionsMenu: () => void;
  onAttachImageClick: (replaceAttachmentId?: string) => void;
  onAttachDocumentClick: (replaceAttachmentId?: string) => void;
  onCompressPendingComposerImage: (attachmentId: string) => Promise<boolean>;
  onCompressPendingComposerPdf: (
    attachmentId: string,
    compressionLevel?: ChatPdfCompressionLevel
  ) => Promise<boolean>;
  onRemovePendingComposerAttachment: (attachmentId: string) => void;
  onOpenComposerImagePreview: (attachmentId: string) => void;
}
