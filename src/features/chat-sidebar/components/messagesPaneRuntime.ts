import { MESSAGE_BOTTOM_GAP } from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ChatSidebarRuntimeState } from '../hooks/useChatSidebarRuntimeState';
import type { MessageRenderItem } from '../utils/message-render-items';
import { buildMessageRenderItems } from '../utils/message-render-items';

const COMPOSER_BOTTOM_OFFSET = 8;
const EMPTY_MESSAGE_IDS = new Set<string>();

export interface MessageItemRuntime {
  interaction: {
    userId: string | undefined;
    isSelectionMode: ChatSidebarRuntimeState['interaction']['isSelectionMode'];
    selectedMessageIds: ChatSidebarRuntimeState['interaction']['selectedMessageIds'];
    handleToggleMessageSelection: ChatSidebarRuntimeState['interaction']['handleToggleMessageSelection'];
    expandedMessageIds: ChatSidebarRuntimeState['refs']['expandedMessageIds'];
    handleToggleExpand: ChatSidebarRuntimeState['refs']['handleToggleExpand'];
    flashingMessageId: ChatSidebarRuntimeState['viewport']['flashingMessageId'];
    isFlashHighlightVisible: ChatSidebarRuntimeState['viewport']['isFlashHighlightVisible'];
    normalizedMessageSearchQuery: ChatSidebarRuntimeState['interaction']['normalizedMessageSearchQuery'];
  };
  menu: {
    openMessageId: ChatSidebarRuntimeState['viewport']['openMenuMessageId'];
    placement: ChatSidebarRuntimeState['viewport']['menuPlacement'];
    sideAnchor: ChatSidebarRuntimeState['viewport']['menuSideAnchor'];
    shouldAnimateOpen: ChatSidebarRuntimeState['viewport']['shouldAnimateMenuOpen'];
    transitionSourceId: ChatSidebarRuntimeState['viewport']['menuTransitionSourceId'];
    offsetX: ChatSidebarRuntimeState['viewport']['menuOffsetX'];
    toggle: ChatSidebarRuntimeState['actions']['toggleMessageMenu'];
  };
  refs: {
    messageBubbleRefs: ChatSidebarRuntimeState['refs']['messageBubbleRefs'];
    initialMessageAnimationKeysRef: ChatSidebarRuntimeState['refs']['initialMessageAnimationKeysRef'];
    initialOpenJumpAnimationKeysRef: ChatSidebarRuntimeState['refs']['initialOpenJumpAnimationKeysRef'];
  };
  content: {
    getImageMessageUrl: ChatSidebarRuntimeState['previews']['getImageMessageUrl'];
    getPdfMessagePreview: ChatSidebarRuntimeState['previews']['getPdfMessagePreview'];
    getAttachmentFileName: ChatSidebarRuntimeState['actions']['getAttachmentFileName'];
    getAttachmentFileKind: ChatSidebarRuntimeState['actions']['getAttachmentFileKind'];
    openImageInPortal: ChatSidebarRuntimeState['previews']['openImageInPortal'];
    openImageGroupInPortal: ChatSidebarRuntimeState['previews']['openImageGroupInPortal'];
    openDocumentInPortal: ChatSidebarRuntimeState['previews']['openDocumentInPortal'];
  };
  actions: {
    handleEditMessage: ChatSidebarRuntimeState['mutations']['handleEditMessage'];
    handleCopyMessage: ChatSidebarRuntimeState['mutations']['handleCopyMessage'];
    handleDownloadMessage: ChatSidebarRuntimeState['mutations']['handleDownloadMessage'];
    handleOpenForwardMessagePicker: ChatSidebarRuntimeState['mutations']['handleOpenForwardMessagePicker'];
    handleDeleteMessage: ChatSidebarRuntimeState['mutations']['handleDeleteMessage'];
  };
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
  activeImageGroupPreviewMessage: ChatMessage | null;
}

export interface MessagesPaneConversationRuntime {
  messages: ChatMessage[];
  loading: ChatSidebarRuntimeState['session']['loading'];
  loadError: ChatSidebarRuntimeState['session']['loadError'];
  retryLoadMessages: ChatSidebarRuntimeState['session']['retryLoadMessages'];
  history: {
    hasOlderMessages: ChatSidebarRuntimeState['session']['hasOlderMessages'];
    isLoadingOlderMessages: ChatSidebarRuntimeState['session']['isLoadingOlderMessages'];
    olderMessagesError: ChatSidebarRuntimeState['session']['olderMessagesError'];
    loadOlderMessages: ChatSidebarRuntimeState['session']['loadOlderMessages'];
  };
  renderItems: MessageRenderItem[];
  search: {
    matchedMessageIds: Set<string>;
    activeMessageId: string | null;
  };
}

export interface MessagesPaneViewportRuntime {
  messagesContainerRef: ChatSidebarRuntimeState['refs']['messagesContainerRef'];
  messagesContentRef: ChatSidebarRuntimeState['refs']['messagesContentRef'];
  messagesEndRef: ChatSidebarRuntimeState['refs']['messagesEndRef'];
  paddingBottom: number;
  isInitialOpenPinPending: boolean;
  closeMessageMenu: ChatSidebarRuntimeState['viewport']['closeMessageMenu'];
  hasNewMessages: ChatSidebarRuntimeState['viewport']['hasNewMessages'];
  isAtBottom: ChatSidebarRuntimeState['viewport']['isAtBottom'];
  scrollToBottom: ChatSidebarRuntimeState['viewport']['scrollToBottom'];
  composerContainerHeight: ChatSidebarRuntimeState['viewport']['composerContainerHeight'];
}

export interface MessagesPaneRuntime {
  conversation: MessagesPaneConversationRuntime;
  viewport: MessagesPaneViewportRuntime;
  item: MessageItemRuntime;
  previews: MessagesPanePreviewRuntime;
}

type MessagesPaneRuntimeSource = Pick<
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
>;

const buildMessageItemRuntime = (
  runtime: MessagesPaneRuntimeSource
): MessageItemRuntime => ({
  interaction: {
    userId: runtime.user?.id,
    isSelectionMode: runtime.interaction.isSelectionMode,
    selectedMessageIds: runtime.interaction.selectedMessageIds,
    handleToggleMessageSelection:
      runtime.interaction.handleToggleMessageSelection,
    expandedMessageIds: runtime.refs.expandedMessageIds,
    handleToggleExpand: runtime.refs.handleToggleExpand,
    flashingMessageId: runtime.viewport.flashingMessageId,
    isFlashHighlightVisible: runtime.viewport.isFlashHighlightVisible,
    normalizedMessageSearchQuery:
      runtime.interaction.normalizedMessageSearchQuery,
  },
  menu: {
    openMessageId: runtime.viewport.openMenuMessageId,
    placement: runtime.viewport.menuPlacement,
    sideAnchor: runtime.viewport.menuSideAnchor,
    shouldAnimateOpen: runtime.viewport.shouldAnimateMenuOpen,
    transitionSourceId: runtime.viewport.menuTransitionSourceId,
    offsetX: runtime.viewport.menuOffsetX,
    toggle: runtime.actions.toggleMessageMenu,
  },
  refs: {
    messageBubbleRefs: runtime.refs.messageBubbleRefs,
    initialMessageAnimationKeysRef: runtime.refs.initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef:
      runtime.refs.initialOpenJumpAnimationKeysRef,
  },
  content: {
    getImageMessageUrl: runtime.previews.getImageMessageUrl,
    getPdfMessagePreview: runtime.previews.getPdfMessagePreview,
    getAttachmentFileName: runtime.actions.getAttachmentFileName,
    getAttachmentFileKind: runtime.actions.getAttachmentFileKind,
    openImageInPortal: runtime.previews.openImageInPortal,
    openImageGroupInPortal: runtime.previews.openImageGroupInPortal,
    openDocumentInPortal: runtime.previews.openDocumentInPortal,
  },
  actions: {
    handleEditMessage: runtime.mutations.handleEditMessage,
    handleCopyMessage: runtime.mutations.handleCopyMessage,
    handleDownloadMessage: runtime.mutations.handleDownloadMessage,
    handleOpenForwardMessagePicker:
      runtime.mutations.handleOpenForwardMessagePicker,
    handleDeleteMessage: runtime.mutations.handleDeleteMessage,
  },
});

const buildMessagesPanePreviewRuntime = (
  runtime: MessagesPaneRuntimeSource,
  activeImageGroupPreviewMessage: ChatMessage | null
): MessagesPanePreviewRuntime => ({
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
  activeImageGroupPreviewMessage,
});

export const buildMessagesPaneRuntime = (
  runtime: MessagesPaneRuntimeSource
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
    conversation: {
      messages,
      loading: runtime.session.loading,
      loadError: runtime.session.loadError,
      retryLoadMessages: runtime.session.retryLoadMessages,
      history: {
        hasOlderMessages: runtime.session.hasOlderMessages,
        isLoadingOlderMessages: runtime.session.isLoadingOlderMessages,
        olderMessagesError: runtime.session.olderMessagesError,
        loadOlderMessages: runtime.session.loadOlderMessages,
      },
      renderItems,
      search: {
        matchedMessageIds: runtime.interaction.isMessageSearchMode
          ? runtime.interaction.searchMatchedMessageIdSet
          : EMPTY_MESSAGE_IDS,
        activeMessageId: runtime.interaction.isMessageSearchMode
          ? runtime.interaction.activeSearchMessageId
          : null,
      },
    },
    viewport: {
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
      isInitialOpenPinPending: runtime.viewport.isInitialOpenPinPending,
      closeMessageMenu: runtime.viewport.closeMessageMenu,
      hasNewMessages: runtime.viewport.hasNewMessages,
      isAtBottom: runtime.viewport.isAtBottom,
      scrollToBottom: runtime.viewport.scrollToBottom,
      composerContainerHeight: runtime.viewport.composerContainerHeight,
    },
    item: buildMessageItemRuntime(runtime),
    previews: buildMessagesPanePreviewRuntime(
      runtime,
      activeImageGroupPreviewMessage
    ),
  };
};
