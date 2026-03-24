import type { OnlineUser } from '@/types';
import type { MutableRefObject, RefObject } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { PdfMessagePreview } from '../hooks/useMessagePdfPreviews';
import type {
  ComposerPendingFileKind,
  MenuPlacement,
  MenuSideAnchor,
} from '../types';

interface ChatPanelUser {
  id?: string;
  name?: string;
}

export interface MessagesPaneModel {
  state: {
    loading: boolean;
    loadError: string | null;
    messages: ChatMessage[];
    user?: ChatPanelUser | null;
    normalizedSearchQuery: string;
    messageInputHeight: number;
    composerContextualOffset: number;
    composerContainerHeight: number;
    showScrollToBottom: boolean;
    hasOlderMessages: boolean;
    isLoadingOlderMessages: boolean;
    olderMessagesError: string | null;
  };
  menu: {
    openMessageId: string | null;
    placement: MenuPlacement;
    sideAnchor: MenuSideAnchor;
    shouldAnimateOpen: boolean;
    transitionSourceId: string | null;
    offsetX: number;
    close: () => void;
    toggle: (
      anchor: HTMLElement,
      messageId: string,
      preferredSide: 'left' | 'right'
    ) => void;
  };
  interaction: {
    isSelectionMode: boolean;
    selectedMessageIds: Set<string>;
    searchMatchedMessageIds: Set<string>;
    activeSearchMessageId: string | null;
    expandedMessageIds: Set<string>;
    flashingMessageId: string | null;
    isFlashHighlightVisible: boolean;
    onToggleMessageSelection: (messageId: string) => void;
    onToggleExpand: (messageId: string) => void;
  };
  refs: {
    messagesContainerRef: RefObject<HTMLDivElement | null>;
    messagesContentRef?: RefObject<HTMLDivElement | null>;
    messagesEndRef: RefObject<HTMLDivElement | null>;
    messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
    initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
    initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
  };
  previews: {
    captionMessagesByAttachmentId: Map<string, ChatMessage>;
    captionMessageIds: Set<string>;
    getAttachmentFileName: (targetMessage: ChatMessage) => string;
    getAttachmentFileKind: (
      targetMessage: ChatMessage
    ) => ComposerPendingFileKind;
    getImageMessageUrl: (
      message: Pick<
        ChatMessage,
        | 'id'
        | 'message'
        | 'message_type'
        | 'file_name'
        | 'file_mime_type'
        | 'file_preview_url'
      >
    ) => string | null;
    getPdfMessagePreview: (
      message: ChatMessage,
      fileName: string | null
    ) => PdfMessagePreview | undefined;
    documentPreviewUrl: string | null;
    documentPreviewName: string;
    isDocumentPreviewVisible: boolean;
    closeDocumentPreview: () => void;
    isImagePreviewOpen: boolean;
    imagePreviewUrl: string | null;
    imagePreviewBackdropUrl: string | null;
    imagePreviewName: string;
    isImagePreviewVisible: boolean;
    closeImagePreview: () => void;
    imageGroupPreviewItems: Array<{
      id: string;
      thumbnailUrl: string | null;
      previewUrl: string | null;
      fullPreviewUrl: string | null;
      previewName: string;
    }>;
    activeImageGroupPreviewId: string | null;
    isImageGroupPreviewVisible: boolean;
    closeImageGroupPreview: () => void;
    selectImageGroupPreviewItem: (messageId: string) => void;
    openImageInPortal: (
      message: Pick<
        ChatMessage,
        | 'id'
        | 'message'
        | 'file_storage_path'
        | 'file_mime_type'
        | 'file_preview_url'
      >,
      previewName: string,
      initialPreviewUrl?: string | null
    ) => Promise<void>;
    openImageGroupInPortal: (
      messages: Array<
        Pick<
          ChatMessage,
          | 'id'
          | 'message'
          | 'file_storage_path'
          | 'file_mime_type'
          | 'file_name'
          | 'file_preview_url'
        > & {
          previewUrl?: string | null;
        }
      >,
      initialMessageId?: string | null,
      initialPreviewUrl?: string | null,
      initialPreviewIntrinsicDimensions?: {
        width: number;
        height: number;
      } | null
    ) => Promise<void>;
    openDocumentInPortal: (
      message: Pick<ChatMessage, 'message' | 'file_storage_path'>,
      previewName: string,
      forcePdfMime?: boolean
    ) => Promise<void>;
  };
  actions: {
    handleEditMessage: (targetMessage: ChatMessage) => void;
    handleCopyMessage: (targetMessage: ChatMessage) => Promise<void>;
    handleDownloadMessage: (targetMessage: ChatMessage) => Promise<void>;
    handleOpenForwardMessagePicker: (targetMessage: ChatMessage) => void;
    handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
    onScrollToBottom: () => void;
    onLoadOlderMessages: () => void;
    onRetryLoadMessages: () => void;
  };
  forwarding: {
    isOpen: boolean;
    targetMessage: ChatMessage | null;
    captionMessage: ChatMessage | null;
    availableUsers: OnlineUser[];
    selectedRecipientIds: Set<string>;
    isDirectoryLoading: boolean;
    directoryError: string | null;
    hasMoreDirectoryUsers: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onToggleRecipient: (userId: string) => void;
    onRetryLoadDirectory: () => void;
    onLoadMoreDirectoryUsers: () => void;
    onSubmit: () => Promise<void>;
  };
}
