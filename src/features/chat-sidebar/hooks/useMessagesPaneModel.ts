import type { MessagesPaneModel } from '../models';
import type { ChatSidebarRefs } from './useChatSidebarRefs';
import type { ChatSidebarRuntimeState } from './useChatSidebarRuntimeState';

const buildMessagesPaneStateModel = (
  runtime: ChatSidebarRuntimeState
): MessagesPaneModel['state'] => ({
  loading: runtime.session.loading,
  loadError: runtime.session.loadError,
  messages: runtime.session.messages,
  user: runtime.user,
  normalizedSearchQuery: runtime.interaction.normalizedMessageSearchQuery,
  messageInputHeight: runtime.composer.messageInputHeight,
  composerContextualOffset: runtime.composer.composerContextualOffset,
  composerContainerHeight: runtime.viewport.composerContainerHeight,
  showScrollToBottom:
    runtime.viewport.hasNewMessages || !runtime.viewport.isAtBottom,
  hasOlderMessages: runtime.session.hasOlderMessages,
  isLoadingOlderMessages: runtime.session.isLoadingOlderMessages,
  olderMessagesError: runtime.session.olderMessagesError,
});

const buildMessagesPaneMenuModel = (
  runtime: ChatSidebarRuntimeState
): MessagesPaneModel['menu'] => ({
  openMessageId: runtime.viewport.openMenuMessageId,
  placement: runtime.viewport.menuPlacement,
  sideAnchor: runtime.viewport.menuSideAnchor,
  shouldAnimateOpen: runtime.viewport.shouldAnimateMenuOpen,
  transitionSourceId: runtime.viewport.menuTransitionSourceId,
  offsetX: runtime.viewport.menuOffsetX,
  close: runtime.viewport.closeMessageMenu,
  toggle: runtime.actions.toggleMessageMenu,
});

const buildMessagesPaneInteractionModel = (
  runtime: ChatSidebarRuntimeState,
  refs: ChatSidebarRefs
): MessagesPaneModel['interaction'] => ({
  isSelectionMode: runtime.interaction.isSelectionMode,
  selectedMessageIds: runtime.interaction.selectedMessageIds,
  searchMatchedMessageIds: runtime.interaction.isMessageSearchMode
    ? runtime.interaction.searchMatchedMessageIdSet
    : new Set<string>(),
  activeSearchMessageId: runtime.interaction.isMessageSearchMode
    ? runtime.interaction.activeSearchMessageId
    : null,
  expandedMessageIds: refs.expandedMessageIds,
  flashingMessageId: runtime.viewport.flashingMessageId,
  isFlashHighlightVisible: runtime.viewport.isFlashHighlightVisible,
  onToggleMessageSelection: runtime.interaction.handleToggleMessageSelection,
  onToggleExpand: refs.handleToggleExpand,
});

const buildMessagesPaneRefsModel = (
  refs: ChatSidebarRefs
): MessagesPaneModel['refs'] => ({
  messagesContainerRef: refs.messagesContainerRef,
  messagesContentRef: refs.messagesContentRef,
  messagesEndRef: refs.messagesEndRef,
  messageBubbleRefs: refs.messageBubbleRefs,
  initialMessageAnimationKeysRef: refs.initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef: refs.initialOpenJumpAnimationKeysRef,
});

const buildMessagesPanePreviewsModel = (
  runtime: ChatSidebarRuntimeState
): MessagesPaneModel['previews'] => ({
  captionMessagesByAttachmentId: runtime.previews.captionMessagesByAttachmentId,
  captionMessageIds: runtime.previews.captionMessageIds,
  getAttachmentFileName: runtime.actions.getAttachmentFileName,
  getAttachmentFileKind: runtime.actions.getAttachmentFileKind,
  getImageMessageUrl: runtime.previews.getImageMessageUrl,
  getPdfMessagePreview: runtime.previews.getPdfMessagePreview,
  documentPreviewUrl: runtime.previews.documentPreviewUrl,
  documentPreviewName: runtime.previews.documentPreviewName,
  isDocumentPreviewVisible: runtime.previews.isDocumentPreviewVisible,
  closeDocumentPreview: runtime.previews.closeDocumentPreview,
  isImagePreviewOpen: runtime.previews.isImagePreviewOpen,
  imagePreviewUrl: runtime.previews.imagePreviewUrl,
  imagePreviewBackdropUrl: runtime.previews.imagePreviewBackdropUrl,
  imagePreviewName: runtime.previews.imagePreviewName,
  isImagePreviewVisible: runtime.previews.isImagePreviewVisible,
  closeImagePreview: runtime.previews.closeImagePreview,
  imageGroupPreviewItems: runtime.previews.imageGroupPreviewItems,
  activeImageGroupPreviewId: runtime.previews.activeImageGroupPreviewId,
  isImageGroupPreviewVisible: runtime.previews.isImageGroupPreviewVisible,
  closeImageGroupPreview: runtime.previews.closeImageGroupPreview,
  selectImageGroupPreviewItem: runtime.previews.selectImageGroupPreviewItem,
  openImageInPortal: runtime.previews.openImageInPortal,
  openImageGroupInPortal: runtime.previews.openImageGroupInPortal,
  openDocumentInPortal: runtime.previews.openDocumentInPortal,
});

const buildMessagesPaneActionsModel = (
  runtime: ChatSidebarRuntimeState
): MessagesPaneModel['actions'] => ({
  handleEditMessage: runtime.mutations.handleEditMessage,
  handleCopyMessage: runtime.mutations.handleCopyMessage,
  handleDownloadMessage: runtime.mutations.handleDownloadMessage,
  handleOpenForwardMessagePicker:
    runtime.mutations.handleOpenForwardMessagePicker,
  handleDeleteMessage: runtime.mutations.handleDeleteMessage,
  onScrollToBottom: runtime.viewport.scrollToBottom,
  onLoadOlderMessages: runtime.session.loadOlderMessages,
  onRetryLoadMessages: runtime.session.retryLoadMessages,
});

const buildMessagesPaneForwardingModel = (
  runtime: ChatSidebarRuntimeState
): MessagesPaneModel['forwarding'] => ({
  isOpen: runtime.mutations.isForwardPickerOpen,
  targetMessage: runtime.mutations.forwardTargetMessage,
  captionMessage: runtime.mutations.forwardCaptionMessage,
  availableUsers: runtime.mutations.availableForwardRecipients,
  selectedRecipientIds: runtime.mutations.selectedForwardRecipientIds,
  isDirectoryLoading: runtime.mutations.isForwardDirectoryLoading,
  directoryError: runtime.mutations.forwardDirectoryError,
  hasMoreDirectoryUsers: runtime.mutations.hasMoreForwardDirectoryUsers,
  isSubmitting: runtime.mutations.isSubmittingForwardMessage,
  onClose: runtime.mutations.handleCloseForwardMessagePicker,
  onToggleRecipient: runtime.mutations.handleToggleForwardRecipient,
  onRetryLoadDirectory: runtime.mutations.handleRetryLoadForwardDirectory,
  onLoadMoreDirectoryUsers:
    runtime.mutations.handleLoadMoreForwardDirectoryUsers,
  onSubmit: runtime.mutations.handleSubmitForwardMessage,
});

export const useMessagesPaneModel = (
  runtime: ChatSidebarRuntimeState,
  refs: ChatSidebarRefs
): MessagesPaneModel => ({
  state: buildMessagesPaneStateModel(runtime),
  menu: buildMessagesPaneMenuModel(runtime),
  interaction: buildMessagesPaneInteractionModel(runtime, refs),
  refs: buildMessagesPaneRefsModel(refs),
  previews: buildMessagesPanePreviewsModel(runtime),
  actions: buildMessagesPaneActionsModel(runtime),
  forwarding: buildMessagesPaneForwardingModel(runtime),
});
