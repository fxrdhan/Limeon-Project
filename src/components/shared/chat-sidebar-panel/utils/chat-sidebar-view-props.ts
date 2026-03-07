import type {
  ComponentProps,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  RefObject,
} from 'react';
import type { UserDetails } from '@/types/database';
import ChatHeader from '../components/ChatHeader';
import ComposerPanel from '../components/ComposerPanel';
import MessagesPane from '../components/MessagesPane';
import {
  COMPOSER_BASE_BORDER_COLOR,
  COMPOSER_BASE_SHADOW,
  COMPOSER_GLOW_SHADOW_FADE,
  COMPOSER_GLOW_SHADOW_HIGH,
  COMPOSER_GLOW_SHADOW_LOW,
  COMPOSER_GLOW_SHADOW_MID,
  COMPOSER_GLOW_SHADOW_PEAK,
  COMPOSER_SYNC_LAYOUT_TRANSITION,
  MAX_MESSAGE_CHARS,
  SEND_SUCCESS_GLOW_DURATION,
} from '../constants';
import type { ChatMessage, UserPresence } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';

type HeaderProps = ComponentProps<typeof ChatHeader>;
type MessagesPaneProps = ComponentProps<typeof MessagesPane>;
type ComposerPanelProps = ComponentProps<typeof ComposerPanel>;

interface InteractionSlice {
  isMessageSearchMode: boolean;
  messageSearchQuery: string;
  messageSearchState: HeaderProps['searchState'];
  searchMatchedMessageIds: string[];
  searchMatchedMessageIdSet: Set<string>;
  activeSearchResultIndex: number;
  canNavigateSearchUp: boolean;
  canNavigateSearchDown: boolean;
  isSelectionMode: boolean;
  selectedVisibleMessages: ChatMessage[];
  canDeleteSelectedMessages: boolean;
  searchInputRef: HeaderProps['searchInputRef'];
  activeSearchMessageId: string | null;
  selectedMessageIds: Set<string>;
  handleEnterMessageSearchMode: () => void;
  handleExitMessageSearchMode: () => void;
  handleEnterMessageSelectionMode: () => void;
  handleExitMessageSelectionMode: () => void;
  handleMessageSearchQueryChange: (value: string) => void;
  handleNavigateSearchUp: () => void;
  handleNavigateSearchDown: () => void;
  handleFocusSearchInput: () => void;
  handleCopySelectedMessages: () => void;
  handleToggleMessageSelection: (messageId: string) => void;
}

interface ViewportSlice {
  isAtTop: boolean;
  isAtBottom: boolean;
  hasNewMessages: boolean;
  composerContainerHeight: number;
  openMenuMessageId: string | null;
  menuPlacement: MessagesPaneProps['menuPlacement'];
  menuSideAnchor: MessagesPaneProps['menuSideAnchor'];
  shouldAnimateMenuOpen: boolean;
  menuTransitionSourceId: string | null;
  menuOffsetX: number;
  flashingMessageId: string | null;
  isFlashHighlightVisible: boolean;
  closeMessageMenu: () => void;
  toggleMessageMenu: MessagesPaneProps['toggleMessageMenu'];
  handleChatPortalBackgroundClick: (
    event: ReactMouseEvent<HTMLDivElement>
  ) => void;
  scrollToBottom: () => void;
  focusEditingTargetMessage: () => void;
}

interface ComposerSlice {
  message: string;
  editingMessagePreview: string | null;
  messageInputHeight: number;
  isMessageInputMultiline: boolean;
  isSendSuccessGlowVisible: boolean;
  isAttachModalOpen: boolean;
  pendingComposerAttachments: ComposerPanelProps['pendingComposerAttachments'];
  previewComposerImageAttachment: ComposerPanelProps['previewComposerImageAttachment'];
  isComposerImageExpanded: boolean;
  isComposerImageExpandedVisible: boolean;
  composerContextualOffset: number;
  attachButtonRef: ComposerPanelProps['attachButtonRef'];
  attachModalRef: ComposerPanelProps['attachModalRef'];
  imageInputRef: ComposerPanelProps['imageInputRef'];
  documentInputRef: ComposerPanelProps['documentInputRef'];
  audioInputRef: ComposerPanelProps['audioInputRef'];
  setMessage: (value: string) => void;
  handleKeyPress: ComposerPanelProps['onKeyDown'];
  handleComposerPaste: ComposerPanelProps['onPaste'];
  handleSendMessage: () => Promise<void>;
  handleAttachButtonClick: () => void;
  handleAttachImageClick: () => void;
  handleAttachDocumentClick: () => void;
  handleAttachAudioClick: () => void;
  handleImageFileChange: ComposerPanelProps['onImageFileChange'];
  handleDocumentFileChange: ComposerPanelProps['onDocumentFileChange'];
  handleAudioFileChange: ComposerPanelProps['onAudioFileChange'];
  handleCancelEditMessage: () => void;
  openComposerImagePreview: ComposerPanelProps['onOpenComposerImagePreview'];
  closeComposerImagePreview: ComposerPanelProps['onCloseComposerImagePreview'];
  removePendingComposerAttachment: ComposerPanelProps['onRemovePendingComposerAttachment'];
  queueComposerImage: ComposerPanelProps['onQueueComposerImage'];
  handleEditMessage: MessagesPaneProps['handleEditMessage'];
  handleCopyMessage: MessagesPaneProps['handleCopyMessage'];
  handleDownloadMessage: MessagesPaneProps['handleDownloadMessage'];
  handleDeleteMessage: MessagesPaneProps['handleDeleteMessage'];
}

interface BuildChatSidebarViewPropsOptions {
  targetUser?: ChatSidebarPanelTargetUser;
  displayTargetPhotoUrl: string | null;
  targetUserPresence: UserPresence | null;
  currentChannelId: string | null;
  user: UserDetails | null;
  messages: ChatMessage[];
  loading: boolean;
  expandedMessageIds: Set<string>;
  interaction: InteractionSlice;
  viewport: ViewportSlice;
  composer: ComposerSlice;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  composerContainerRef: RefObject<HTMLDivElement | null>;
  chatHeaderContainerRef: RefObject<HTMLDivElement | null>;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messageBubbleRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
  getInitials: (name: string) => string;
  getInitialsColor: (userId: string) => string;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
  getAttachmentFileKind: MessagesPaneProps['getAttachmentFileKind'];
  handleClose: () => void;
  handleDeleteSelectedMessages: () => void;
  handleToggleExpand: (messageId: string) => void;
}

export const buildChatSidebarViewProps = ({
  targetUser,
  displayTargetPhotoUrl,
  targetUserPresence,
  currentChannelId,
  user,
  messages,
  loading,
  expandedMessageIds,
  interaction,
  viewport,
  composer,
  messageInputRef,
  composerContainerRef,
  chatHeaderContainerRef,
  messagesContainerRef,
  messagesEndRef,
  messageBubbleRefs,
  initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef,
  getInitials,
  getInitialsColor,
  getAttachmentFileName,
  getAttachmentFileKind,
  handleClose,
  handleDeleteSelectedMessages,
  handleToggleExpand,
}: BuildChatSidebarViewPropsOptions) => {
  const headerProps: HeaderProps = {
    targetUser,
    displayTargetPhotoUrl,
    targetUserPresence,
    currentChannelId,
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
  };

  const messagesPaneProps: MessagesPaneProps = {
    loading,
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
    maxMessageChars: MAX_MESSAGE_CHARS,
    messagesContainerRef,
    messagesEndRef,
    messageBubbleRefs,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
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
  };

  const composerPanelProps: ComposerPanelProps = {
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
    composerSyncLayoutTransition: COMPOSER_SYNC_LAYOUT_TRANSITION,
    composerBaseBorderColor: COMPOSER_BASE_BORDER_COLOR,
    composerBaseShadow: COMPOSER_BASE_SHADOW,
    composerGlowShadowPeak: COMPOSER_GLOW_SHADOW_PEAK,
    composerGlowShadowHigh: COMPOSER_GLOW_SHADOW_HIGH,
    composerGlowShadowMid: COMPOSER_GLOW_SHADOW_MID,
    composerGlowShadowFade: COMPOSER_GLOW_SHADOW_FADE,
    composerGlowShadowLow: COMPOSER_GLOW_SHADOW_LOW,
    sendSuccessGlowDuration: SEND_SUCCESS_GLOW_DURATION,
    onMessageChange: composer.setMessage,
    onKeyDown: composer.handleKeyPress,
    onPaste: composer.handleComposerPaste,
    onSendMessage: composer.handleSendMessage,
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
  };

  return {
    chatHeaderContainerRef,
    isAtTop: viewport.isAtTop,
    handleChatPortalBackgroundClick: viewport.handleChatPortalBackgroundClick,
    headerProps,
    messagesPaneProps,
    composerPanelProps,
  };
};
