import type { MutableRefObject } from 'react';
import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { PdfMessagePreview } from '../../hooks/useMessagePdfPreviews';
import type {
  ComposerPendingFileKind,
  MenuPlacement,
  MenuSideAnchor,
  MenuVerticalAnchor,
} from '../../types';

export interface MessageItemLayoutModel {
  isGroupedWithPrevious: boolean;
  isGroupedWithNext: boolean;
  isFirstVisibleMessage: boolean;
  hasDateSeparatorBefore?: boolean;
}

export interface MessageItemInteractionModel {
  userId?: string;
  isSelectionMode: boolean;
  isSelected: boolean;
  selectionTargetMessageIds: string[];
  expandedMessageIds: Set<string>;
  flashingMessageId: string | null;
  isFlashHighlightVisible: boolean;
  searchMatchedMessageIds: Set<string>;
  activeSearchMessageId: string | null;
  maxMessageChars: number;
  onToggleMessageSelection: (messageId: string | string[]) => void;
  handleToggleExpand: (messageId: string) => void;
}

export interface MessageItemMenuModel {
  openMessageId: string | null;
  dimmingMessageId: string | null;
  placement: MenuPlacement;
  sideAnchor: MenuSideAnchor;
  verticalAnchor: MenuVerticalAnchor;
  shouldAnimateOpen: boolean;
  transitionSourceId: string | null;
  offsetX: number;
  toggle: (
    anchor: HTMLElement,
    messageId: string,
    preferredSide: 'left' | 'right'
  ) => void;
}

export interface MessageItemRefsModel {
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
}

export interface MessageItemContentModel {
  resolvedMessageUrl: string | null;
  captionMessage?: ChatMessage;
  replyTargetMessage?: ChatMessage;
  groupedDocumentMessages?: ChatMessage[];
  groupedImageMessages?: ChatMessage[];
  pdfMessagePreview?: PdfMessagePreview;
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
  normalizedSearchQuery: string;
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
  focusReplyTargetMessage: (messageId: string) => void;
}

export interface MessageItemActionsModel {
  handleEditMessage: (targetMessage: ChatMessage) => void;
  handleReplyMessage: (targetMessage: ChatMessage) => void;
  handleCopyMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadImageGroup: (targetMessages: ChatMessage[]) => Promise<void>;
  handleDownloadDocumentGroup: (targetMessages: ChatMessage[]) => Promise<void>;
  handleDeleteMessages: (targetMessages: ChatMessage[]) => Promise<{
    deletedTargetMessageIds: string[];
    failedTargetMessageIds: string[];
    cleanupWarningTargetMessageIds: string[];
  }>;
  handleOpenForwardMessagePicker: (targetMessage: ChatMessage) => void;
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
}

export interface MessageItemModel {
  message: ChatMessage;
  layout: MessageItemLayoutModel;
  interaction: MessageItemInteractionModel;
  menu: MessageItemMenuModel;
  refs: MessageItemRefsModel;
  content: MessageItemContentModel;
  actions: MessageItemActionsModel;
}
