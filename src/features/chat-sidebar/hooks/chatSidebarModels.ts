import type { UserDetails } from '@/types/database';
import type { RefObject, MutableRefObject } from 'react';
import type { ChatHeaderModel } from '../components/ChatHeader';
import type { ComposerPanelModel } from '../components/ComposerPanel';
import type { MessagesPaneModel } from '../components/MessagesPane';
import { isPresenceFresh } from '../components/header/presence';
import type { ChatMessage, UserPresence } from '../data/chatSidebarGateway';
import type {
  ChatSidebarPanelTargetUser,
  MenuPlacement,
  MenuSideAnchor,
  PendingComposerAttachment,
} from '../types';

interface BuildChatHeaderModelParams {
  targetUser?: ChatSidebarPanelTargetUser;
  displayTargetPhotoUrl: string | null;
  isTargetOnline?: boolean;
  targetUserPresence: UserPresence | null;
  targetUserPresenceError: string | null;
  interaction: {
    isMessageSearchMode: boolean;
    messageSearchQuery: string;
    messageSearchState: ChatHeaderModel['searchState'];
    searchMatchedMessageIds: Array<string>;
    activeSearchResultIndex: number;
    canNavigateSearchUp: boolean;
    canNavigateSearchDown: boolean;
    isSelectionMode: boolean;
    selectedVisibleMessages: Array<unknown>;
    canDeleteSelectedMessages: boolean;
    searchInputRef: ChatHeaderModel['searchInputRef'];
    handleEnterMessageSearchMode: ChatHeaderModel['onEnterSearchMode'];
    handleExitMessageSearchMode: ChatHeaderModel['onExitSearchMode'];
    handleEnterMessageSelectionMode: ChatHeaderModel['onEnterSelectionMode'];
    handleExitMessageSelectionMode: ChatHeaderModel['onExitSelectionMode'];
    handleMessageSearchQueryChange: ChatHeaderModel['onSearchQueryChange'];
    handleNavigateSearchUp: ChatHeaderModel['onNavigateSearchUp'];
    handleNavigateSearchDown: ChatHeaderModel['onNavigateSearchDown'];
    handleFocusSearchInput: ChatHeaderModel['onFocusSearchInput'];
    handleCopySelectedMessages: ChatHeaderModel['onCopySelectedMessages'];
  };
  onDeleteSelectedMessages: ChatHeaderModel['onDeleteSelectedMessages'];
  onClose: ChatHeaderModel['onClose'];
  getInitials: ChatHeaderModel['getInitials'];
  getInitialsColor: ChatHeaderModel['getInitialsColor'];
}

export const buildChatHeaderModel = ({
  targetUser,
  displayTargetPhotoUrl,
  isTargetOnline,
  targetUserPresence,
  targetUserPresenceError,
  interaction,
  onDeleteSelectedMessages,
  onClose,
  getInitials,
  getInitialsColor,
}: BuildChatHeaderModelParams): ChatHeaderModel => {
  const resolvedTargetOnline =
    typeof isTargetOnline === 'boolean'
      ? isTargetOnline
      : targetUserPresence?.is_online === true &&
        isPresenceFresh(targetUserPresence.last_seen);
  const searchResultCount = interaction.searchMatchedMessageIds.length;

  return {
    targetUser,
    displayTargetPhotoUrl,
    isTargetOnline: resolvedTargetOnline,
    targetUserPresence,
    targetUserPresenceError,
    isSearchMode: interaction.isMessageSearchMode,
    searchQuery: interaction.messageSearchQuery,
    searchState: interaction.messageSearchState,
    searchResultCount,
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
    onDeleteSelectedMessages,
    onClose,
    getInitials,
    getInitialsColor,
  };
};

interface BuildChatMessagesModelParams {
  loading: boolean;
  loadError: string | null;
  messages: ChatMessage[];
  user: UserDetails | null;
  composer: {
    messageInputHeight: number;
    composerContextualOffset: number;
    handleEditMessage: MessagesPaneModel['handleEditMessage'];
    handleCopyMessage: MessagesPaneModel['handleCopyMessage'];
    handleDownloadMessage: MessagesPaneModel['handleDownloadMessage'];
    handleDeleteMessage: MessagesPaneModel['handleDeleteMessage'];
  };
  viewport: {
    composerContainerHeight: number;
    openMenuMessageId: string | null;
    menuPlacement: MenuPlacement;
    menuSideAnchor: MenuSideAnchor;
    shouldAnimateMenuOpen: boolean;
    menuTransitionSourceId: string | null;
    menuOffsetX: number;
    flashingMessageId: string | null;
    isFlashHighlightVisible: boolean;
    hasNewMessages: boolean;
    isAtBottom: boolean;
    closeMessageMenu: MessagesPaneModel['closeMessageMenu'];
    scrollToBottom: MessagesPaneModel['onScrollToBottom'];
  };
  interaction: {
    isSelectionMode: boolean;
    selectedMessageIds: Set<string>;
    isMessageSearchMode: boolean;
    messageSearchQuery: string;
    searchMatchedMessageIdSet: Set<string>;
    activeSearchMessageId: string | null;
    handleToggleMessageSelection: MessagesPaneModel['onToggleMessageSelection'];
  };
  hasOlderMessages: boolean;
  isLoadingOlderMessages: boolean;
  olderMessagesError: string | null;
  expandedMessageIds: Set<string>;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
  toggleMessageMenu: MessagesPaneModel['toggleMessageMenu'];
  handleToggleExpand: MessagesPaneModel['handleToggleExpand'];
  getAttachmentFileName: MessagesPaneModel['getAttachmentFileName'];
  getAttachmentFileKind: MessagesPaneModel['getAttachmentFileKind'];
  loadOlderMessages: MessagesPaneModel['onLoadOlderMessages'];
  retryLoadMessages: MessagesPaneModel['onRetryLoadMessages'];
}

export const buildChatMessagesModel = ({
  loading,
  loadError,
  messages,
  user,
  composer,
  viewport,
  interaction,
  hasOlderMessages,
  isLoadingOlderMessages,
  olderMessagesError,
  expandedMessageIds,
  messagesContainerRef,
  messagesEndRef,
  messageBubbleRefs,
  initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef,
  toggleMessageMenu,
  handleToggleExpand,
  getAttachmentFileName,
  getAttachmentFileKind,
  loadOlderMessages,
  retryLoadMessages,
}: BuildChatMessagesModelParams): MessagesPaneModel => ({
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
  hasOlderMessages,
  isLoadingOlderMessages,
  olderMessagesError,
  messagesContainerRef,
  messagesEndRef,
  messageBubbleRefs,
  initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef,
  closeMessageMenu: viewport.closeMessageMenu,
  toggleMessageMenu,
  handleToggleExpand,
  handleEditMessage: composer.handleEditMessage,
  handleCopyMessage: composer.handleCopyMessage,
  handleDownloadMessage: composer.handleDownloadMessage,
  handleDeleteMessage: composer.handleDeleteMessage,
  onToggleMessageSelection: interaction.handleToggleMessageSelection,
  getAttachmentFileName,
  getAttachmentFileKind,
  onScrollToBottom: viewport.scrollToBottom,
  onLoadOlderMessages: loadOlderMessages,
  onRetryLoadMessages: retryLoadMessages,
});

interface BuildChatComposerModelParams {
  composer: {
    message: string;
    editingMessagePreview: string | null;
    messageInputHeight: number;
    isMessageInputMultiline: boolean;
    isSendSuccessGlowVisible: boolean;
    isAttachModalOpen: boolean;
    pendingComposerAttachments: PendingComposerAttachment[];
    previewComposerImageAttachment: ComposerPanelModel['previewComposerImageAttachment'];
    isComposerImageExpanded: boolean;
    isComposerImageExpandedVisible: boolean;
    attachButtonRef: ComposerPanelModel['attachButtonRef'];
    attachModalRef: ComposerPanelModel['attachModalRef'];
    imageInputRef: ComposerPanelModel['imageInputRef'];
    documentInputRef: ComposerPanelModel['documentInputRef'];
    audioInputRef: ComposerPanelModel['audioInputRef'];
    setMessage: ComposerPanelModel['onMessageChange'];
    handleKeyPress: ComposerPanelModel['onKeyDown'];
    handleComposerPaste: ComposerPanelModel['onPaste'];
    handleSendMessage: () => Promise<void>;
    handleAttachButtonClick: ComposerPanelModel['onAttachButtonClick'];
    handleAttachImageClick: ComposerPanelModel['onAttachImageClick'];
    handleAttachDocumentClick: ComposerPanelModel['onAttachDocumentClick'];
    handleAttachAudioClick: ComposerPanelModel['onAttachAudioClick'];
    handleImageFileChange: ComposerPanelModel['onImageFileChange'];
    handleDocumentFileChange: ComposerPanelModel['onDocumentFileChange'];
    handleAudioFileChange: ComposerPanelModel['onAudioFileChange'];
    handleCancelEditMessage: ComposerPanelModel['onCancelEditMessage'];
    openComposerImagePreview: ComposerPanelModel['onOpenComposerImagePreview'];
    closeComposerImagePreview: ComposerPanelModel['onCloseComposerImagePreview'];
    removePendingComposerAttachment: ComposerPanelModel['onRemovePendingComposerAttachment'];
    queueComposerImage: ComposerPanelModel['onQueueComposerImage'];
  };
  messageInputRef: ComposerPanelModel['messageInputRef'];
  composerContainerRef: ComposerPanelModel['composerContainerRef'];
  focusEditingTargetMessage: ComposerPanelModel['onFocusEditingTargetMessage'];
}

export const buildChatComposerModel = ({
  composer,
  messageInputRef,
  composerContainerRef,
  focusEditingTargetMessage,
}: BuildChatComposerModelParams): ComposerPanelModel => ({
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
  messageInputRef,
  composerContainerRef,
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
  onFocusEditingTargetMessage: focusEditingTargetMessage,
  onOpenComposerImagePreview: composer.openComposerImagePreview,
  onCloseComposerImagePreview: composer.closeComposerImagePreview,
  onRemovePendingComposerAttachment: composer.removePendingComposerAttachment,
  onQueueComposerImage: composer.queueComposerImage,
});
