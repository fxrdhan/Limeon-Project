import type { ChatHeaderModel } from '../components/ChatHeader';
import type { ComposerPanelModel } from '../components/ComposerPanel';
import type { MessagesPaneModel } from '../components/MessagesPane';
import {
  getAttachmentFileKind,
  getAttachmentFileName,
} from '../utils/attachment';

export const createChatHeaderModel = ({
  targetUser,
  displayTargetPhotoUrl,
  isTargetOnline,
  targetUserPresence,
  targetUserPresenceError,
  interaction,
  handleDeleteSelectedMessages,
  handleClose,
  getInitials,
  getInitialsColor,
}: {
  targetUser: ChatHeaderModel['targetUser'];
  displayTargetPhotoUrl: ChatHeaderModel['displayTargetPhotoUrl'];
  isTargetOnline: ChatHeaderModel['isTargetOnline'];
  targetUserPresence: ChatHeaderModel['targetUserPresence'];
  targetUserPresenceError: ChatHeaderModel['targetUserPresenceError'];
  interaction: {
    isMessageSearchMode: boolean;
    messageSearchQuery: string;
    messageSearchState: ChatHeaderModel['searchState'];
    searchMatchedMessageIds: string[];
    activeSearchResultIndex: number;
    canNavigateSearchUp: boolean;
    canNavigateSearchDown: boolean;
    isSelectionMode: boolean;
    selectedVisibleMessages: Array<unknown>;
    canDeleteSelectedMessages: boolean;
    searchInputRef: ChatHeaderModel['searchInputRef'];
    handleEnterMessageSearchMode: () => void;
    handleExitMessageSearchMode: () => void;
    handleEnterMessageSelectionMode: () => void;
    handleExitMessageSelectionMode: () => void;
    handleMessageSearchQueryChange: (value: string) => void;
    handleNavigateSearchUp: () => void;
    handleNavigateSearchDown: () => void;
    handleFocusSearchInput: () => void;
    handleCopySelectedMessages: () => void;
  };
  handleDeleteSelectedMessages: () => void;
  handleClose: () => void;
  getInitials: ChatHeaderModel['getInitials'];
  getInitialsColor: ChatHeaderModel['getInitialsColor'];
}): ChatHeaderModel => ({
  targetUser,
  displayTargetPhotoUrl,
  isTargetOnline,
  targetUserPresence,
  targetUserPresenceError,
  isSearchMode: interaction.isMessageSearchMode,
  searchQuery: interaction.messageSearchQuery,
  searchState: interaction.messageSearchState,
  searchResultCount: interaction.searchMatchedMessageIds.length,
  activeSearchResultIndex: Math.max(interaction.activeSearchResultIndex, 0),
  canNavigateSearchUp: interaction.canNavigateSearchUp,
  canNavigateSearchDown: interaction.canNavigateSearchDown,
  isSelectionMode: interaction.isSelectionMode,
  selectedMessageCount: interaction.selectedVisibleMessages.length,
  canDeleteSelectedMessages: interaction.canDeleteSelectedMessages,
  searchInputRef: interaction.searchInputRef,
  onEnterSearchMode: interaction.handleEnterMessageSearchMode,
  onExitSearchMode: interaction.handleExitMessageSearchMode,
  onEnterSelectionMode: interaction.handleEnterMessageSelectionMode,
  onExitSelectionMode: interaction.handleExitMessageSelectionMode,
  onSearchQueryChange: interaction.handleMessageSearchQueryChange,
  onNavigateSearchUp: interaction.handleNavigateSearchUp,
  onNavigateSearchDown: interaction.handleNavigateSearchDown,
  onFocusSearchInput: interaction.handleFocusSearchInput,
  onCopySelectedMessages: interaction.handleCopySelectedMessages,
  onDeleteSelectedMessages: handleDeleteSelectedMessages,
  onClose: handleClose,
  getInitials,
  getInitialsColor,
});

export const createMessagesPaneModel = ({
  loading,
  loadError,
  messages,
  user,
  composer,
  viewport,
  interaction,
  expandedMessageIds,
  handleToggleExpand,
}: {
  loading: boolean;
  loadError: string | null;
  messages: MessagesPaneModel['messages'];
  user: MessagesPaneModel['user'];
  composer: {
    messageInputHeight: number;
    composerContextualOffset: number;
    editingMessageId: string | null;
    handleEditMessage: MessagesPaneModel['handleEditMessage'];
    handleCopyMessage: MessagesPaneModel['handleCopyMessage'];
    handleDownloadMessage: MessagesPaneModel['handleDownloadMessage'];
    handleDeleteMessage: MessagesPaneModel['handleDeleteMessage'];
  };
  viewport: {
    composerContainerHeight: number;
    openMenuMessageId: string | null;
    menuPlacement: MessagesPaneModel['menuPlacement'];
    menuSideAnchor: MessagesPaneModel['menuSideAnchor'];
    shouldAnimateMenuOpen: boolean;
    menuTransitionSourceId: string | null;
    menuOffsetX: number;
    flashingMessageId: string | null;
    isFlashHighlightVisible: boolean;
    hasNewMessages: boolean;
    isAtBottom: boolean;
    hasOlderMessages: boolean;
    isLoadingOlderMessages: boolean;
    olderMessagesError: string | null;
    closeMessageMenu: () => void;
    toggleMessageMenu: MessagesPaneModel['toggleMessageMenu'];
    scrollToBottom: () => void;
    retryLoadMessages: () => void;
    messagesContainerRef: MessagesPaneModel['messagesContainerRef'];
    messagesEndRef: MessagesPaneModel['messagesEndRef'];
    messageBubbleRefs: MessagesPaneModel['messageBubbleRefs'];
    initialMessageAnimationKeysRef: MessagesPaneModel['initialMessageAnimationKeysRef'];
    initialOpenJumpAnimationKeysRef: MessagesPaneModel['initialOpenJumpAnimationKeysRef'];
    loadOlderMessages: () => Promise<void>;
  };
  interaction: {
    isSelectionMode: boolean;
    selectedMessageIds: Set<string>;
    isMessageSearchMode: boolean;
    messageSearchQuery: string;
    searchMatchedMessageIdSet: Set<string>;
    activeSearchMessageId: string | null;
    handleToggleMessageSelection: (messageId: string) => void;
  };
  expandedMessageIds: Set<string>;
  handleToggleExpand: MessagesPaneModel['handleToggleExpand'];
}): MessagesPaneModel => ({
  loading,
  loadError,
  messages,
  user,
  messageInputHeight: composer.messageInputHeight,
  composerContextualOffset: composer.composerContextualOffset,
  composerContainerHeight: viewport.composerContainerHeight,
  openMenuMessageId: viewport.openMenuMessageId,
  menuPlacement: viewport.menuPlacement,
  menuSideAnchor: viewport.menuSideAnchor,
  shouldAnimateMenuOpen: viewport.shouldAnimateMenuOpen,
  menuTransitionSourceId: viewport.menuTransitionSourceId,
  menuOffsetX: viewport.menuOffsetX,
  expandedMessageIds,
  flashingMessageId: viewport.flashingMessageId,
  isFlashHighlightVisible: viewport.isFlashHighlightVisible,
  isSelectionMode: interaction.isSelectionMode,
  selectedMessageIds: interaction.selectedMessageIds,
  searchQuery: interaction.isMessageSearchMode
    ? interaction.messageSearchQuery
    : '',
  searchMatchedMessageIds: interaction.isMessageSearchMode
    ? interaction.searchMatchedMessageIdSet
    : new Set<string>(),
  activeSearchMessageId: interaction.isMessageSearchMode
    ? interaction.activeSearchMessageId
    : null,
  showScrollToBottom: viewport.hasNewMessages || !viewport.isAtBottom,
  hasOlderMessages: viewport.hasOlderMessages,
  isLoadingOlderMessages: viewport.isLoadingOlderMessages,
  olderMessagesError: viewport.olderMessagesError,
  messagesContainerRef: viewport.messagesContainerRef,
  messagesEndRef: viewport.messagesEndRef,
  messageBubbleRefs: viewport.messageBubbleRefs,
  initialMessageAnimationKeysRef: viewport.initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef: viewport.initialOpenJumpAnimationKeysRef,
  closeMessageMenu: viewport.closeMessageMenu,
  toggleMessageMenu: viewport.toggleMessageMenu,
  handleToggleExpand,
  handleEditMessage: composer.handleEditMessage,
  handleCopyMessage: composer.handleCopyMessage,
  handleDownloadMessage: composer.handleDownloadMessage,
  handleDeleteMessage: composer.handleDeleteMessage,
  onToggleMessageSelection: interaction.handleToggleMessageSelection,
  getAttachmentFileName,
  getAttachmentFileKind,
  onScrollToBottom: viewport.scrollToBottom,
  onLoadOlderMessages: viewport.loadOlderMessages,
  onRetryLoadMessages: viewport.retryLoadMessages,
});

export const createComposerPanelModel = ({
  composer,
  viewport,
}: {
  composer: {
    message: string;
    editingMessagePreview: string | null;
    messageInputHeight: number;
    isMessageInputMultiline: boolean;
    isSendSuccessGlowVisible: boolean;
    isAttachModalOpen: boolean;
    pendingComposerAttachments: ComposerPanelModel['pendingComposerAttachments'];
    previewComposerImageAttachment: ComposerPanelModel['previewComposerImageAttachment'];
    isComposerImageExpanded: boolean;
    isComposerImageExpandedVisible: boolean;
    messageInputRef: ComposerPanelModel['messageInputRef'];
    composerContainerRef: ComposerPanelModel['composerContainerRef'];
    attachButtonRef: ComposerPanelModel['attachButtonRef'];
    attachModalRef: ComposerPanelModel['attachModalRef'];
    imageInputRef: ComposerPanelModel['imageInputRef'];
    documentInputRef: ComposerPanelModel['documentInputRef'];
    audioInputRef: ComposerPanelModel['audioInputRef'];
    setMessage: (nextMessage: string) => void;
    handleKeyPress: ComposerPanelModel['onKeyDown'];
    handleComposerPaste: ComposerPanelModel['onPaste'];
    handleSendMessage: () => Promise<void>;
    handleAttachButtonClick: () => void;
    handleAttachImageClick: (replaceAttachmentId?: string) => void;
    handleAttachDocumentClick: (replaceAttachmentId?: string) => void;
    handleAttachAudioClick: () => void;
    handleImageFileChange: ComposerPanelModel['onImageFileChange'];
    handleDocumentFileChange: ComposerPanelModel['onDocumentFileChange'];
    handleAudioFileChange: ComposerPanelModel['onAudioFileChange'];
    handleCancelEditMessage: () => void;
    openComposerImagePreview: (attachmentId: string) => void;
    closeComposerImagePreview: () => void;
    removePendingComposerAttachment: (attachmentId: string) => void;
    queueComposerImage: (file: File, replaceAttachmentId?: string) => boolean;
  };
  viewport: {
    focusEditingTargetMessage: () => void;
  };
}): ComposerPanelModel => ({
  message: composer.message,
  editingMessagePreview: composer.editingMessagePreview,
  messageInputHeight: composer.messageInputHeight,
  isMessageInputMultiline: composer.isMessageInputMultiline,
  isSendSuccessGlowVisible: composer.isSendSuccessGlowVisible,
  isAttachModalOpen: composer.isAttachModalOpen,
  pendingComposerAttachments: composer.pendingComposerAttachments,
  previewComposerImageAttachment: composer.previewComposerImageAttachment,
  isComposerImageExpanded: composer.isComposerImageExpanded,
  isComposerImageExpandedVisible: composer.isComposerImageExpandedVisible,
  messageInputRef: composer.messageInputRef,
  composerContainerRef: composer.composerContainerRef,
  attachButtonRef: composer.attachButtonRef,
  attachModalRef: composer.attachModalRef,
  imageInputRef: composer.imageInputRef,
  documentInputRef: composer.documentInputRef,
  audioInputRef: composer.audioInputRef,
  onMessageChange: composer.setMessage,
  onKeyDown: composer.handleKeyPress,
  onPaste: composer.handleComposerPaste,
  onSendMessage: () => {
    void composer.handleSendMessage();
  },
  onAttachButtonClick: composer.handleAttachButtonClick,
  onAttachImageClick: composer.handleAttachImageClick,
  onAttachDocumentClick: composer.handleAttachDocumentClick,
  onAttachAudioClick: composer.handleAttachAudioClick,
  onImageFileChange: composer.handleImageFileChange,
  onDocumentFileChange: composer.handleDocumentFileChange,
  onAudioFileChange: composer.handleAudioFileChange,
  onCancelEditMessage: composer.handleCancelEditMessage,
  onFocusEditingTargetMessage: viewport.focusEditingTargetMessage,
  onOpenComposerImagePreview: composer.openComposerImagePreview,
  onCloseComposerImagePreview: composer.closeComposerImagePreview,
  onRemovePendingComposerAttachment: composer.removePendingComposerAttachment,
  onQueueComposerImage: composer.queueComposerImage,
});
