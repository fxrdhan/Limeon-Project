import { useAuthStore } from '@/store/authStore';
import { useCallback, useRef, useState } from 'react';
import type { ChatHeaderModel } from '../components/ChatHeader';
import type { ComposerPanelModel } from '../components/ComposerPanel';
import type { MessagesPaneModel } from '../components/MessagesPane';
import type { ChatSidebarPanelProps } from '../types';
import {
  getAttachmentFileKind,
  getAttachmentFileName,
} from '../utils/attachment';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import { generateChannelId } from '../utils/channel';
import { isPresenceFresh } from '../components/header/presence';
import { useChatComposer } from './useChatComposer';
import { useChatBulkDelete } from './useChatBulkDelete';
import { useChatInteractionModes } from './useChatInteractionModes';
import { useChatSession } from './useChatSession';
import { useChatViewport } from './useChatViewport';
import { useTargetProfilePhoto } from './useTargetProfilePhoto';

export const useChatSidebarController = ({
  isOpen,
  onClose,
  targetUser,
}: ChatSidebarPanelProps) => {
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(
    () => new Set()
  );
  const { user } = useAuthStore();
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const composerContainerRef = useRef<HTMLDivElement>(null);
  const chatHeaderContainerRef = useRef<HTMLDivElement>(null);
  const messageBubbleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const initialMessageAnimationKeysRef = useRef<Set<string>>(new Set());
  const initialOpenJumpAnimationKeysRef = useRef<Set<string>>(new Set());
  const closeMessageMenuRef = useRef<() => void>(() => {});
  const scheduleScrollMessagesToBottomRef = useRef<() => void>(() => {});
  /* c8 ignore next */
  const currentChannelId =
    user && targetUser ? generateChannelId(user.id, targetUser.id) : null;
  const closeMessageMenu = useCallback(() => {
    closeMessageMenuRef.current();
  }, []);
  const scheduleScrollMessagesToBottom = useCallback(() => {
    scheduleScrollMessagesToBottomRef.current();
  }, []);

  const { displayTargetPhotoUrl } = useTargetProfilePhoto(targetUser);
  const {
    messages,
    setMessages,
    loading,
    loadError,
    targetUserPresence,
    targetUserPresenceError,
    markMessageIdsAsRead,
    hasOlderMessages,
    isLoadingOlderMessages,
    olderMessagesError,
    loadOlderMessages,
    retryLoadMessages,
  } = useChatSession({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
  });

  const focusMessageComposer = useCallback(() => {
    const textarea = messageInputRef.current;
    if (!textarea) return;

    textarea.focus();
    const cursorPosition = textarea.value.length;
    textarea.setSelectionRange(cursorPosition, cursorPosition);
  }, []);

  const composer = useChatComposer({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    messages,
    setMessages,
    closeMessageMenu,
    scheduleScrollMessagesToBottom,
    messageInputRef,
    focusMessageComposer,
  });

  const interaction = useChatInteractionModes({
    isOpen,
    currentChannelId,
    messages,
    user,
    targetUser,
    closeMessageMenu,
    getAttachmentFileName,
  });

  const viewport = useChatViewport({
    isOpen,
    currentChannelId,
    messages,
    userId: user?.id,
    targetUserId: targetUser?.id,
    messagesCount: messages.length,
    loading,
    messageInputHeight: composer.messageInputHeight,
    composerContextualOffset: composer.composerContextualOffset,
    isMessageInputMultiline: composer.isMessageInputMultiline,
    pendingComposerAttachmentsCount: composer.pendingComposerAttachments.length,
    normalizedMessageSearchQuery: interaction.normalizedMessageSearchQuery,
    isMessageSearchMode: interaction.isMessageSearchMode,
    activeSearchMessageId: interaction.activeSearchMessageId,
    searchNavigationTick: interaction.searchNavigationTick,
    editingMessageId: composer.editingMessageId,
    focusMessageComposer,
    markMessageIdsAsRead,
    messagesContainerRef,
    messagesEndRef,
    composerContainerRef,
    chatHeaderContainerRef,
    messageBubbleRefs,
  });
  closeMessageMenuRef.current = viewport.closeMessageMenu;
  scheduleScrollMessagesToBottomRef.current =
    viewport.scheduleScrollMessagesToBottom;

  const toggleMessageMenu = useCallback(
    (
      anchor: HTMLElement,
      messageId: string,
      preferredSide: 'left' | 'right'
    ) => {
      composer.closeAttachModal();
      viewport.toggleMessageMenu(anchor, messageId, preferredSide);
    },
    [composer, viewport]
  );

  const handleToggleExpand = useCallback((messageId: string) => {
    setExpandedMessageIds(previousIds => {
      const nextIds = new Set(previousIds);
      if (nextIds.has(messageId)) {
        nextIds.delete(messageId);
      } else {
        nextIds.add(messageId);
      }
      return nextIds;
    });
  }, []);

  const handleDeleteSelectedMessages = useChatBulkDelete({
    user,
    selectedVisibleMessages: interaction.selectedVisibleMessages,
    setSelectedMessageIds: interaction.setSelectedMessageIds,
    deleteMessage: composer.handleDeleteMessage,
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const headerModel = createChatHeaderModel({
    targetUser,
    displayTargetPhotoUrl,
    isTargetOnline:
      targetUserPresence?.is_online === true &&
      isPresenceFresh(targetUserPresence.last_seen),
    targetUserPresence,
    targetUserPresenceError,
    interaction,
    handleDeleteSelectedMessages,
    handleClose,
    getInitials,
    getInitialsColor,
  });

  const messagesModel = createMessagesPaneModel({
    loading,
    loadError,
    messages,
    user,
    composer: {
      messageInputHeight: composer.messageInputHeight,
      composerContextualOffset: composer.composerContextualOffset,
      editingMessageId: composer.editingMessageId,
      handleEditMessage: composer.handleEditMessage,
      handleCopyMessage: composer.handleCopyMessage,
      handleDownloadMessage: composer.handleDownloadMessage,
      handleDeleteMessage: composer.handleDeleteMessage,
    },
    viewport: {
      composerContainerHeight: viewport.composerContainerHeight,
      openMenuMessageId: viewport.openMenuMessageId,
      menuPlacement: viewport.menuPlacement,
      menuSideAnchor: viewport.menuSideAnchor,
      shouldAnimateMenuOpen: viewport.shouldAnimateMenuOpen,
      menuTransitionSourceId: viewport.menuTransitionSourceId,
      menuOffsetX: viewport.menuOffsetX,
      flashingMessageId: viewport.flashingMessageId,
      isFlashHighlightVisible: viewport.isFlashHighlightVisible,
      hasNewMessages: viewport.hasNewMessages,
      isAtBottom: viewport.isAtBottom,
      hasOlderMessages,
      isLoadingOlderMessages,
      olderMessagesError,
      closeMessageMenu: viewport.closeMessageMenu,
      toggleMessageMenu,
      scrollToBottom: viewport.scrollToBottom,
      loadOlderMessages,
      retryLoadMessages,
      messagesContainerRef,
      messagesEndRef,
      messageBubbleRefs,
      initialMessageAnimationKeysRef,
      initialOpenJumpAnimationKeysRef,
    },
    interaction,
    expandedMessageIds,
    handleToggleExpand,
  });

  const composerModel = createComposerPanelModel({
    composer: {
      ...composer,
      messageInputRef,
      composerContainerRef,
    },
    viewport,
  });

  return {
    chatHeaderContainerRef,
    isAtTop: viewport.isAtTop,
    handleChatPortalBackgroundClick: viewport.handleChatPortalBackgroundClick,
    headerModel,
    messagesModel,
    composerModel,
  };
};

const createChatHeaderModel = ({
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

const createMessagesPaneModel = ({
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

const createComposerPanelModel = ({
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
