import type { SearchState } from '@/components/search-bar/constants';
import type { PopupMenuAction } from '@/components/image-manager/PopupMenuContent';
import type { OnlineUser } from '@/types';
import type {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  RefObject,
} from 'react';
import type { UserPresence } from './data/chatSidebarGateway';
import type { ChatMessage } from './data/chatSidebarGateway';
import type { PdfMessagePreview } from './hooks/useMessagePdfPreviews';
import type {
  ChatSidebarPanelTargetUser,
  ComposerAttachmentPreviewItem,
  ComposerPendingFileKind,
  MenuPlacement,
  MenuSideAnchor,
  PendingComposerAttachment,
} from './types';

export interface ComposerHoverableEmbeddedLinkCandidate {
  id: string;
  url: string;
  pastedText: string;
  rangeStart: number;
  rangeEnd: number;
}

export interface ChatHeaderModel {
  targetUser?: ChatSidebarPanelTargetUser;
  displayTargetPhotoUrl: string | null;
  isTargetOnline: boolean;
  targetUserPresence: UserPresence | null;
  targetUserPresenceError: string | null;
  isSearchMode: boolean;
  searchQuery: string;
  searchState: SearchState;
  searchResultCount: number;
  activeSearchResultIndex: number;
  canNavigateSearchUp: boolean;
  canNavigateSearchDown: boolean;
  hasMoreSearchResults?: boolean;
  isSelectionMode: boolean;
  selectedMessageCount: number;
  canDeleteSelectedMessages: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onEnterSearchMode: () => void;
  onExitSearchMode: () => void;
  onEnterSelectionMode: () => void;
  onClearSelectedMessages: () => void;
  onExitSelectionMode: () => void;
  onSearchQueryChange: (value: string) => void;
  onNavigateSearchUp: () => void;
  onNavigateSearchDown: () => void;
  onFocusSearchInput: () => void;
  onCopySelectedMessages: () => void;
  onDeleteSelectedMessages: () => void;
  onClose: () => void;
  getInitials: (name: string) => string;
  getInitialsColor: (userId: string) => string;
}

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
        'id' | 'message' | 'message_type' | 'file_name' | 'file_mime_type'
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
    imagePreviewUrl: string | null;
    imagePreviewName: string;
    isImagePreviewVisible: boolean;
    closeImagePreview: () => void;
    openImageInPortal: (
      message: Pick<
        ChatMessage,
        'message' | 'file_storage_path' | 'file_mime_type'
      >,
      previewName: string
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
    embeddedLinkPastePromptUrl: string | null;
    hoverableEmbeddedLinkCandidates: ComposerHoverableEmbeddedLinkCandidate[];
    hoverableEmbeddedLinkUrl: string | null;
    pendingComposerAttachments: ComposerAttachmentPreviewItem[];
    previewComposerImageAttachment: PendingComposerAttachment | undefined;
    isComposerImageExpanded: boolean;
    isComposerImageExpandedVisible: boolean;
    openImageActionsAttachmentId: string | null;
    imageActionsMenuPosition: {
      top: number;
      left: number;
    } | null;
    imageActions: PopupMenuAction[];
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
    embeddedLinkPastePromptRef: RefObject<HTMLDivElement | null>;
    imageInputRef: RefObject<HTMLInputElement | null>;
    documentInputRef: RefObject<HTMLInputElement | null>;
    audioInputRef: RefObject<HTMLInputElement | null>;
    imageActionsButtonRef: RefObject<HTMLButtonElement | null>;
    imageActionsMenuRef: RefObject<HTMLDivElement | null>;
  };
  actions: {
    onMessageChange: (nextMessage: string) => void;
    onKeyDown: (e: ReactKeyboardEvent) => void;
    onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
    onDismissEmbeddedLinkPastePrompt: () => void;
    onOpenEmbeddedLinkPastePrompt: (
      candidate?: ComposerHoverableEmbeddedLinkCandidate
    ) => void;
    onUseEmbeddedLinkPasteAsUrl: () => void;
    onUseEmbeddedLinkPasteAsEmbed: () => void;
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
    onRemovePendingComposerAttachment: (attachmentId: string) => void;
    onQueueComposerImage: (file: File, replaceAttachmentId?: string) => boolean;
    onCloseComposerDocumentPreview: () => void;
    onOpenDocumentAttachmentInPortal: (
      attachment: PendingComposerAttachment
    ) => void;
    onToggleImageActionsMenu: (
      event: ReactMouseEvent<HTMLButtonElement>,
      attachmentId: string
    ) => void;
  };
}
