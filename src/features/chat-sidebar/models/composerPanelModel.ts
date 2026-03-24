import type { PopupMenuAction } from '@/components/image-manager/PopupMenuContent';
import type {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  RefObject,
} from 'react';
import type {
  ComposerAttachmentPreviewItem,
  PendingComposerAttachment,
} from '../types';
import type {
  ComposerHoverableAttachmentCandidate,
  ComposerPromptableLink,
} from './shared';

export interface ComposerPanelModel {
  state: {
    message: string;
    editingMessagePreview: string | null;
    messageInputHeight: number;
    isMessageInputMultiline: boolean;
    isSendSuccessGlowVisible: boolean;
    isSendDisabled: boolean;
  };
  attachments: {
    isAttachModalOpen: boolean;
    linkPrompt: {
      url: string | null;
      isAttachmentCandidate: boolean;
      isShortenable: boolean;
      hoverableCandidates: ComposerHoverableAttachmentCandidate[];
      hoverableUrl: string | null;
    };
    pendingComposerAttachments: ComposerAttachmentPreviewItem[];
    previewComposerImageAttachment: PendingComposerAttachment | undefined;
    isComposerImageExpanded: boolean;
    isComposerImageExpandedVisible: boolean;
    openImageActionsAttachmentId: string | null;
    imageActionsMenuPosition: {
      top: number;
      left: number;
    } | null;
    pdfCompressionMenuPosition: {
      top: number;
      left: number;
    } | null;
    imageActions: PopupMenuAction[];
    pdfCompressionLevelActions: PopupMenuAction[];
  };
  documentPreview: {
    composerDocumentPreviewUrl: string | null;
    composerDocumentPreviewName: string;
    isComposerDocumentPreviewVisible: boolean;
  };
  refs: {
    messageInputRef: RefObject<HTMLTextAreaElement | null>;
    composerContainerRef: RefObject<HTMLDivElement | null>;
    attachButtonRef: RefObject<HTMLButtonElement | null>;
    attachModalRef: RefObject<HTMLDivElement | null>;
    attachmentPastePromptRef: RefObject<HTMLDivElement | null>;
    imageInputRef: RefObject<HTMLInputElement | null>;
    documentInputRef: RefObject<HTMLInputElement | null>;
    audioInputRef: RefObject<HTMLInputElement | null>;
    imageActionsButtonRef: RefObject<HTMLButtonElement | null>;
    imageActionsMenuRef: RefObject<HTMLDivElement | null>;
    pdfCompressionMenuRef: RefObject<HTMLDivElement | null>;
  };
  actions: {
    onMessageChange: (nextMessage: string) => void;
    onKeyDown: (e: ReactKeyboardEvent) => void;
    onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
    onDismissAttachmentPastePrompt: () => void;
    onOpenAttachmentPastePrompt: (
      candidate?: ComposerHoverableAttachmentCandidate
    ) => void;
    onOpenComposerLinkPrompt: (link: ComposerPromptableLink) => void;
    onEditAttachmentLink: (
      candidate: ComposerHoverableAttachmentCandidate,
      selection?: {
        selectionStart: number;
        selectionEnd?: number;
      }
    ) => void;
    onOpenAttachmentPastePromptLink: () => void;
    onCopyAttachmentPastePromptLink: () => void;
    onShortenAttachmentPastePromptLink: () => void;
    onUseAttachmentPasteAsUrl: () => void;
    onUseAttachmentPasteAsAttachment: () => void;
    onSendMessage: () => void;
    onAttachButtonClick: () => void;
    onAttachImageClick: (replaceAttachmentId?: string) => void;
    onAttachDocumentClick: (replaceAttachmentId?: string) => void;
    onAttachAudioClick: () => void;
    onImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onDocumentFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onAudioFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onCancelEditMessage: () => void;
    onFocusEditingTargetMessage: () => void;
    onOpenComposerImagePreview: (attachmentId: string) => void;
    onCloseComposerImagePreview: () => void;
    onCancelLoadingComposerAttachment: (attachmentId: string) => void;
    onRemovePendingComposerAttachment: (attachmentId: string) => void;
    onQueueComposerImage: (file: File, replaceAttachmentId?: string) => boolean;
    onCloseComposerDocumentPreview: () => void;
    onOpenDocumentAttachmentInPortal: (
      attachment: PendingComposerAttachment
    ) => void;
    onClosePdfCompressionMenu: () => void;
    onToggleImageActionsMenu: (
      event: ReactMouseEvent<HTMLButtonElement>,
      attachmentId: string
    ) => void;
  };
}
