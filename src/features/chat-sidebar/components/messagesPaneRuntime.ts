import { MESSAGE_BOTTOM_GAP } from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ChatSidebarRuntimeState } from '../hooks/useChatSidebarRuntimeState';
import type { MessageRenderItem } from '../utils/message-render-items';
import { buildMessageRenderItems } from '../utils/message-render-items';

const COMPOSER_BOTTOM_OFFSET = 8;
const EMPTY_MESSAGE_IDS = new Set<string>();

export interface MessageItemRuntime {
  userId: string | undefined;
  isSelectionMode: ChatSidebarRuntimeState['interaction']['isSelectionMode'];
  selectedMessageIds: ChatSidebarRuntimeState['interaction']['selectedMessageIds'];
  handleToggleMessageSelection: ChatSidebarRuntimeState['interaction']['handleToggleMessageSelection'];
  expandedMessageIds: ChatSidebarRuntimeState['refs']['expandedMessageIds'];
  handleToggleExpand: ChatSidebarRuntimeState['refs']['handleToggleExpand'];
  flashingMessageId: ChatSidebarRuntimeState['viewport']['flashingMessageId'];
  isFlashHighlightVisible: ChatSidebarRuntimeState['viewport']['isFlashHighlightVisible'];
  openMenuMessageId: ChatSidebarRuntimeState['viewport']['openMenuMessageId'];
  menuPlacement: ChatSidebarRuntimeState['viewport']['menuPlacement'];
  menuSideAnchor: ChatSidebarRuntimeState['viewport']['menuSideAnchor'];
  shouldAnimateMenuOpen: ChatSidebarRuntimeState['viewport']['shouldAnimateMenuOpen'];
  menuTransitionSourceId: ChatSidebarRuntimeState['viewport']['menuTransitionSourceId'];
  menuOffsetX: ChatSidebarRuntimeState['viewport']['menuOffsetX'];
  toggleMessageMenu: ChatSidebarRuntimeState['actions']['toggleMessageMenu'];
  messageBubbleRefs: ChatSidebarRuntimeState['refs']['messageBubbleRefs'];
  initialMessageAnimationKeysRef: ChatSidebarRuntimeState['refs']['initialMessageAnimationKeysRef'];
  initialOpenJumpAnimationKeysRef: ChatSidebarRuntimeState['refs']['initialOpenJumpAnimationKeysRef'];
  getImageMessageUrl: ChatSidebarRuntimeState['previews']['getImageMessageUrl'];
  getPdfMessagePreview: ChatSidebarRuntimeState['previews']['getPdfMessagePreview'];
  getAttachmentFileName: ChatSidebarRuntimeState['actions']['getAttachmentFileName'];
  getAttachmentFileKind: ChatSidebarRuntimeState['actions']['getAttachmentFileKind'];
  normalizedMessageSearchQuery: ChatSidebarRuntimeState['interaction']['normalizedMessageSearchQuery'];
  openImageInPortal: ChatSidebarRuntimeState['previews']['openImageInPortal'];
  openImageGroupInPortal: ChatSidebarRuntimeState['previews']['openImageGroupInPortal'];
  openDocumentInPortal: ChatSidebarRuntimeState['previews']['openDocumentInPortal'];
  handleEditMessage: ChatSidebarRuntimeState['mutations']['handleEditMessage'];
  handleCopyMessage: ChatSidebarRuntimeState['mutations']['handleCopyMessage'];
  handleDownloadMessage: ChatSidebarRuntimeState['mutations']['handleDownloadMessage'];
  handleOpenForwardMessagePicker: ChatSidebarRuntimeState['mutations']['handleOpenForwardMessagePicker'];
  handleDeleteMessage: ChatSidebarRuntimeState['mutations']['handleDeleteMessage'];
}

export interface MessagesPanePreviewRuntime {
  isImagePreviewOpen: ChatSidebarRuntimeState['previews']['isImagePreviewOpen'];
  isImagePreviewVisible: ChatSidebarRuntimeState['previews']['isImagePreviewVisible'];
  closeImagePreview: ChatSidebarRuntimeState['previews']['closeImagePreview'];
  imagePreviewUrl: ChatSidebarRuntimeState['previews']['imagePreviewUrl'];
  imagePreviewBackdropUrl: ChatSidebarRuntimeState['previews']['imagePreviewBackdropUrl'];
  imagePreviewName: ChatSidebarRuntimeState['previews']['imagePreviewName'];
  imageGroupPreviewItems: ChatSidebarRuntimeState['previews']['imageGroupPreviewItems'];
  activeImageGroupPreviewId: ChatSidebarRuntimeState['previews']['activeImageGroupPreviewId'];
  isImageGroupPreviewVisible: ChatSidebarRuntimeState['previews']['isImageGroupPreviewVisible'];
  selectImageGroupPreviewItem: ChatSidebarRuntimeState['previews']['selectImageGroupPreviewItem'];
  handleDownloadMessage: ChatSidebarRuntimeState['mutations']['handleDownloadMessage'];
  handleCopyMessage: ChatSidebarRuntimeState['mutations']['handleCopyMessage'];
  handleOpenForwardMessagePicker: ChatSidebarRuntimeState['mutations']['handleOpenForwardMessagePicker'];
  closeImageGroupPreview: ChatSidebarRuntimeState['previews']['closeImageGroupPreview'];
  documentPreviewUrl: ChatSidebarRuntimeState['previews']['documentPreviewUrl'];
  documentPreviewName: ChatSidebarRuntimeState['previews']['documentPreviewName'];
  isDocumentPreviewVisible: ChatSidebarRuntimeState['previews']['isDocumentPreviewVisible'];
  closeDocumentPreview: ChatSidebarRuntimeState['previews']['closeDocumentPreview'];
}

export interface MessagesPaneRuntime {
  messages: ChatMessage[];
  loading: ChatSidebarRuntimeState['session']['loading'];
  loadError: ChatSidebarRuntimeState['session']['loadError'];
  hasOlderMessages: ChatSidebarRuntimeState['session']['hasOlderMessages'];
  isLoadingOlderMessages: ChatSidebarRuntimeState['session']['isLoadingOlderMessages'];
  olderMessagesError: ChatSidebarRuntimeState['session']['olderMessagesError'];
  loadOlderMessages: ChatSidebarRuntimeState['session']['loadOlderMessages'];
  retryLoadMessages: ChatSidebarRuntimeState['session']['retryLoadMessages'];
  renderItems: MessageRenderItem[];
  searchMatchedMessageIds: Set<string>;
  activeSearchMessageId: string | null;
  messagesContainerRef: ChatSidebarRuntimeState['refs']['messagesContainerRef'];
  messagesContentRef: ChatSidebarRuntimeState['refs']['messagesContentRef'];
  messagesEndRef: ChatSidebarRuntimeState['refs']['messagesEndRef'];
  paddingBottom: number;
  closeMessageMenu: ChatSidebarRuntimeState['viewport']['closeMessageMenu'];
  hasNewMessages: ChatSidebarRuntimeState['viewport']['hasNewMessages'];
  isAtBottom: ChatSidebarRuntimeState['viewport']['isAtBottom'];
  scrollToBottom: ChatSidebarRuntimeState['viewport']['scrollToBottom'];
  composerContainerHeight: ChatSidebarRuntimeState['viewport']['composerContainerHeight'];
  activeImageGroupPreviewMessage: ChatMessage | null;
  itemRuntime: MessageItemRuntime;
  previewRuntime: MessagesPanePreviewRuntime;
}

export const buildMessagesPaneRuntime = (
  runtime: Pick<
    ChatSidebarRuntimeState,
    | 'user'
    | 'session'
    | 'interaction'
    | 'composer'
    | 'viewport'
    | 'refs'
    | 'previews'
    | 'mutations'
    | 'actions'
  >
): MessagesPaneRuntime => {
  const messages = runtime.session.messages;
  const renderItems = buildMessageRenderItems({
    messages: messages.filter(
      messageItem => !runtime.previews.captionMessageIds.has(messageItem.id)
    ),
    captionMessagesByAttachmentId:
      runtime.previews.captionMessagesByAttachmentId,
    getAttachmentFileKind: runtime.actions.getAttachmentFileKind,
    enableDocumentBubbleGrouping:
      !runtime.interaction.isSelectionMode &&
      runtime.interaction.normalizedMessageSearchQuery.length === 0,
  });
  const activeImageGroupPreviewMessage = runtime.previews
    .activeImageGroupPreviewId
    ? messages.find(
        messageItem =>
          messageItem.id === runtime.previews.activeImageGroupPreviewId
      ) || null
    : null;

  return {
    messages,
    loading: runtime.session.loading,
    loadError: runtime.session.loadError,
    hasOlderMessages: runtime.session.hasOlderMessages,
    isLoadingOlderMessages: runtime.session.isLoadingOlderMessages,
    olderMessagesError: runtime.session.olderMessagesError,
    loadOlderMessages: runtime.session.loadOlderMessages,
    retryLoadMessages: runtime.session.retryLoadMessages,
    renderItems,
    searchMatchedMessageIds: runtime.interaction.isMessageSearchMode
      ? runtime.interaction.searchMatchedMessageIdSet
      : EMPTY_MESSAGE_IDS,
    activeSearchMessageId: runtime.interaction.isMessageSearchMode
      ? runtime.interaction.activeSearchMessageId
      : null,
    messagesContainerRef: runtime.refs.messagesContainerRef,
    messagesContentRef: runtime.refs.messagesContentRef,
    messagesEndRef: runtime.refs.messagesEndRef,
    paddingBottom: Math.max(
      runtime.viewport.composerContainerHeight +
        COMPOSER_BOTTOM_OFFSET +
        MESSAGE_BOTTOM_GAP,
      runtime.composer.messageInputHeight +
        84 +
        runtime.composer.composerContextualOffset
    ),
    closeMessageMenu: runtime.viewport.closeMessageMenu,
    hasNewMessages: runtime.viewport.hasNewMessages,
    isAtBottom: runtime.viewport.isAtBottom,
    scrollToBottom: runtime.viewport.scrollToBottom,
    composerContainerHeight: runtime.viewport.composerContainerHeight,
    activeImageGroupPreviewMessage,
    itemRuntime: {
      userId: runtime.user?.id,
      isSelectionMode: runtime.interaction.isSelectionMode,
      selectedMessageIds: runtime.interaction.selectedMessageIds,
      handleToggleMessageSelection:
        runtime.interaction.handleToggleMessageSelection,
      expandedMessageIds: runtime.refs.expandedMessageIds,
      handleToggleExpand: runtime.refs.handleToggleExpand,
      flashingMessageId: runtime.viewport.flashingMessageId,
      isFlashHighlightVisible: runtime.viewport.isFlashHighlightVisible,
      openMenuMessageId: runtime.viewport.openMenuMessageId,
      menuPlacement: runtime.viewport.menuPlacement,
      menuSideAnchor: runtime.viewport.menuSideAnchor,
      shouldAnimateMenuOpen: runtime.viewport.shouldAnimateMenuOpen,
      menuTransitionSourceId: runtime.viewport.menuTransitionSourceId,
      menuOffsetX: runtime.viewport.menuOffsetX,
      toggleMessageMenu: runtime.actions.toggleMessageMenu,
      messageBubbleRefs: runtime.refs.messageBubbleRefs,
      initialMessageAnimationKeysRef:
        runtime.refs.initialMessageAnimationKeysRef,
      initialOpenJumpAnimationKeysRef:
        runtime.refs.initialOpenJumpAnimationKeysRef,
      getImageMessageUrl: runtime.previews.getImageMessageUrl,
      getPdfMessagePreview: runtime.previews.getPdfMessagePreview,
      getAttachmentFileName: runtime.actions.getAttachmentFileName,
      getAttachmentFileKind: runtime.actions.getAttachmentFileKind,
      normalizedMessageSearchQuery:
        runtime.interaction.normalizedMessageSearchQuery,
      openImageInPortal: runtime.previews.openImageInPortal,
      openImageGroupInPortal: runtime.previews.openImageGroupInPortal,
      openDocumentInPortal: runtime.previews.openDocumentInPortal,
      handleEditMessage: runtime.mutations.handleEditMessage,
      handleCopyMessage: runtime.mutations.handleCopyMessage,
      handleDownloadMessage: runtime.mutations.handleDownloadMessage,
      handleOpenForwardMessagePicker:
        runtime.mutations.handleOpenForwardMessagePicker,
      handleDeleteMessage: runtime.mutations.handleDeleteMessage,
    },
    previewRuntime: {
      isImagePreviewOpen: runtime.previews.isImagePreviewOpen,
      isImagePreviewVisible: runtime.previews.isImagePreviewVisible,
      closeImagePreview: runtime.previews.closeImagePreview,
      imagePreviewUrl: runtime.previews.imagePreviewUrl,
      imagePreviewBackdropUrl: runtime.previews.imagePreviewBackdropUrl,
      imagePreviewName: runtime.previews.imagePreviewName,
      imageGroupPreviewItems: runtime.previews.imageGroupPreviewItems,
      activeImageGroupPreviewId: runtime.previews.activeImageGroupPreviewId,
      isImageGroupPreviewVisible: runtime.previews.isImageGroupPreviewVisible,
      selectImageGroupPreviewItem: runtime.previews.selectImageGroupPreviewItem,
      handleDownloadMessage: runtime.mutations.handleDownloadMessage,
      handleCopyMessage: runtime.mutations.handleCopyMessage,
      handleOpenForwardMessagePicker:
        runtime.mutations.handleOpenForwardMessagePicker,
      closeImageGroupPreview: runtime.previews.closeImageGroupPreview,
      documentPreviewUrl: runtime.previews.documentPreviewUrl,
      documentPreviewName: runtime.previews.documentPreviewName,
      isDocumentPreviewVisible: runtime.previews.isDocumentPreviewVisible,
      closeDocumentPreview: runtime.previews.closeDocumentPreview,
    },
  };
};
