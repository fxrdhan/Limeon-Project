import {
  useMemo,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type RefObject,
} from 'react';
import { getInitials, getInitialsColor } from '@/utils/avatar';
import type { ChatHeaderModel } from '../components/ChatHeader';
import type { MessagesPaneModel } from '../components/MessagesPane';
import type { ComposerPanelModel } from '../components/ComposerPanel';
import type { ChatMessage, UserPresence } from '../data/chatSidebarGateway';
import { isPresenceFresh } from '../components/header/presence';
import {
  getAttachmentFileKind,
  getAttachmentFileName,
} from '../utils/attachment';
import type {
  ChatSidebarPanelTargetUser,
  PendingComposerAttachment,
} from '../types';

interface InteractionModel {
  isMessageSearchMode: boolean;
  messageSearchQuery: string;
  activeSearchMessageId: string | null;
  searchNavigationTick: number;
  normalizedMessageSearchQuery: string;
  searchMatchedMessageIds: string[];
  searchMatchedMessageIdSet: Set<string>;
  activeSearchResultIndex: number;
  canNavigateSearchUp: boolean;
  canNavigateSearchDown: boolean;
  messageSearchState: ChatHeaderModel['searchState'];
  isSelectionMode: boolean;
  selectedMessageIds: Set<string>;
  selectedVisibleMessages: ChatMessage[];
  canDeleteSelectedMessages: boolean;
  searchInputRef: ChatHeaderModel['searchInputRef'];
  handleEnterMessageSearchMode: () => void;
  handleExitMessageSearchMode: () => void;
  handleEnterMessageSelectionMode: () => void;
  handleExitMessageSelectionMode: () => void;
  handleFocusSearchInput: () => void;
  handleMessageSearchQueryChange: (value: string) => void;
  handleNavigateSearchUp: () => void;
  handleNavigateSearchDown: () => void;
  handleCopySelectedMessages: () => void;
  handleToggleMessageSelection: (messageId: string) => void;
}

interface ComposerModel {
  message: string;
  editingMessageId: string | null;
  editingMessagePreview: string | null;
  messageInputHeight: number;
  isMessageInputMultiline: boolean;
  isSendSuccessGlowVisible: boolean;
  isAttachModalOpen: boolean;
  pendingComposerAttachments: PendingComposerAttachment[];
  previewComposerImageAttachment: PendingComposerAttachment | undefined;
  isComposerImageExpanded: boolean;
  isComposerImageExpandedVisible: boolean;
  attachButtonRef: RefObject<HTMLButtonElement | null>;
  attachModalRef: RefObject<HTMLDivElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  documentInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLInputElement | null>;
  composerContextualOffset: number;
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
  handleEditMessage: (targetMessage: ChatMessage) => void;
  handleCopyMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
}

interface ViewportModel {
  isAtBottom: boolean;
  isAtTop: boolean;
  hasNewMessages: boolean;
  composerContainerHeight: number;
  openMenuMessageId: string | null;
  menuPlacement: MessagesPaneModel['menuPlacement'];
  menuSideAnchor: MessagesPaneModel['menuSideAnchor'];
  shouldAnimateMenuOpen: boolean;
  menuTransitionSourceId: string | null;
  menuOffsetX: number;
  flashingMessageId: string | null;
  isFlashHighlightVisible: boolean;
  closeMessageMenu: () => void;
  toggleMessageMenu: MessagesPaneModel['toggleMessageMenu'];
  scheduleScrollMessagesToBottom: () => void;
  focusEditingTargetMessage: () => void;
  handleChatPortalBackgroundClick: (
    event: ReactMouseEvent<HTMLDivElement>
  ) => void;
  scrollToBottom: () => void;
}

interface UseChatSidebarViewModelsProps {
  targetUser?: ChatSidebarPanelTargetUser;
  displayTargetPhotoUrl: string | null;
  isTargetOnline: boolean;
  targetUserPresence: UserPresence | null;
  targetUserPresenceError: string | null;
  user?: {
    id?: string;
    name?: string;
  } | null;
  messages: ChatMessage[];
  loading: boolean;
  loadError: string | null;
  hasOlderMessages: boolean;
  isLoadingOlderMessages: boolean;
  olderMessagesError: string | null;
  expandedMessageIds: Set<string>;
  handleDeleteSelectedMessages: () => void;
  handleClose: () => void;
  loadOlderMessages: () => void;
  retryLoadMessages: () => void;
  toggleMessageMenu: MessagesPaneModel['toggleMessageMenu'];
  handleToggleExpand: (messageId: string) => void;
  interaction: InteractionModel;
  composer: ComposerModel;
  viewport: ViewportModel;
  refs: {
    messageInputRef: RefObject<HTMLTextAreaElement | null>;
    composerContainerRef: RefObject<HTMLDivElement | null>;
    messagesContainerRef: RefObject<HTMLDivElement | null>;
    messagesEndRef: RefObject<HTMLDivElement | null>;
    messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
    chatHeaderContainerRef: RefObject<HTMLDivElement | null>;
    initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
    initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
  };
}

export const useChatSidebarViewModels = ({
  targetUser,
  displayTargetPhotoUrl,
  isTargetOnline,
  targetUserPresence,
  targetUserPresenceError,
  user,
  messages,
  loading,
  loadError,
  hasOlderMessages,
  isLoadingOlderMessages,
  olderMessagesError,
  expandedMessageIds,
  handleDeleteSelectedMessages,
  handleClose,
  loadOlderMessages,
  retryLoadMessages,
  toggleMessageMenu,
  handleToggleExpand,
  interaction,
  composer,
  viewport,
  refs,
}: UseChatSidebarViewModelsProps) => {
  const headerModel = useMemo<ChatHeaderModel>(
    () => ({
      targetUser,
      displayTargetPhotoUrl,
      isTargetOnline:
        typeof isTargetOnline === 'boolean'
          ? isTargetOnline
          : targetUserPresence?.is_online === true &&
            isPresenceFresh(targetUserPresence.last_seen),
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
    }),
    [
      displayTargetPhotoUrl,
      handleClose,
      handleDeleteSelectedMessages,
      interaction,
      isTargetOnline,
      targetUser,
      targetUserPresence,
      targetUserPresenceError,
    ]
  );

  const messagesModel = useMemo<MessagesPaneModel>(
    () => ({
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
      messagesContainerRef: refs.messagesContainerRef,
      messagesEndRef: refs.messagesEndRef,
      messageBubbleRefs: refs.messageBubbleRefs,
      initialMessageAnimationKeysRef: refs.initialMessageAnimationKeysRef,
      initialOpenJumpAnimationKeysRef: refs.initialOpenJumpAnimationKeysRef,
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
    }),
    [
      composer,
      expandedMessageIds,
      handleToggleExpand,
      hasOlderMessages,
      interaction,
      isLoadingOlderMessages,
      loadError,
      loadOlderMessages,
      loading,
      messages,
      olderMessagesError,
      refs.initialMessageAnimationKeysRef,
      refs.initialOpenJumpAnimationKeysRef,
      refs.messageBubbleRefs,
      refs.messagesContainerRef,
      refs.messagesEndRef,
      retryLoadMessages,
      toggleMessageMenu,
      user,
      viewport,
    ]
  );

  const composerModel = useMemo<ComposerPanelModel>(
    () => ({
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
      messageInputRef: refs.messageInputRef,
      composerContainerRef: refs.composerContainerRef,
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
      onRemovePendingComposerAttachment:
        composer.removePendingComposerAttachment,
      onQueueComposerImage: composer.queueComposerImage,
    }),
    [composer, refs.composerContainerRef, refs.messageInputRef, viewport]
  );

  return {
    headerModel,
    messagesModel,
    composerModel,
  };
};
