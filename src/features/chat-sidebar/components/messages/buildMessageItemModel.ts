import { MAX_MESSAGE_CHARS } from '../../constants';
import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { MessageRenderItem } from '../../utils/message-render-items';
import type { MessagesPaneRuntime } from '../messagesPaneRuntime';
import type { MessageItemModel } from './messageItemTypes';

interface BuildMessageItemModelOptions {
  runtime: MessagesPaneRuntime;
  renderItem: MessageRenderItem;
  index: number;
  previousMessage: ChatMessage | null;
  nextMessage: ChatMessage | null;
  searchMatchedMessageIds: Set<string>;
  activeSearchMessageId: string | null;
}

export const buildMessageItemModel = ({
  runtime,
  renderItem,
  index,
  previousMessage,
  nextMessage,
  searchMatchedMessageIds,
  activeSearchMessageId,
}: BuildMessageItemModelOptions): MessageItemModel => {
  const messageItem = renderItem.anchorMessage;
  const currentMessageDate = new Date(messageItem.created_at).toDateString();
  const previousMessageDate = previousMessage
    ? new Date(previousMessage.created_at).toDateString()
    : null;
  const shouldRenderDateSeparator =
    index === 0 || previousMessageDate !== currentMessageDate;
  const isGroupedWithPrevious =
    previousMessage?.sender_id === messageItem.sender_id &&
    previousMessageDate === currentMessageDate;
  const isGroupedWithNext =
    nextMessage?.sender_id === messageItem.sender_id &&
    new Date(nextMessage.created_at).toDateString() === currentMessageDate;

  return {
    message: messageItem,
    layout: {
      isGroupedWithPrevious,
      isGroupedWithNext,
      isFirstVisibleMessage: index === 0,
      hasDateSeparatorBefore: shouldRenderDateSeparator,
    },
    interaction: {
      userId: runtime.user?.id,
      isSelectionMode: runtime.interaction.isSelectionMode,
      isSelected: runtime.interaction.selectedMessageIds.has(messageItem.id),
      expandedMessageIds: runtime.refs.expandedMessageIds,
      flashingMessageId: runtime.viewport.flashingMessageId,
      isFlashHighlightVisible: runtime.viewport.isFlashHighlightVisible,
      searchMatchedMessageIds,
      activeSearchMessageId,
      maxMessageChars: MAX_MESSAGE_CHARS,
      onToggleMessageSelection:
        runtime.interaction.handleToggleMessageSelection,
      handleToggleExpand: runtime.refs.handleToggleExpand,
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
      initialMessageAnimationKeysRef:
        runtime.refs.initialMessageAnimationKeysRef,
      initialOpenJumpAnimationKeysRef:
        runtime.refs.initialOpenJumpAnimationKeysRef,
    },
    content: {
      resolvedMessageUrl: runtime.previews.getImageMessageUrl(messageItem),
      captionMessage: renderItem.captionMessage,
      groupedDocumentMessages:
        renderItem.kind === 'document-group' ? renderItem.messages : undefined,
      groupedImageMessages:
        renderItem.kind === 'image-group' ? renderItem.messages : undefined,
      pdfMessagePreview: runtime.previews.getPdfMessagePreview(
        messageItem,
        runtime.actions.getAttachmentFileName(messageItem)
      ),
      getAttachmentFileName: runtime.actions.getAttachmentFileName,
      getAttachmentFileKind: runtime.actions.getAttachmentFileKind,
      getImageMessageUrl: runtime.previews.getImageMessageUrl,
      getPdfMessagePreview: runtime.previews.getPdfMessagePreview,
      normalizedSearchQuery: runtime.interaction.normalizedMessageSearchQuery,
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
  };
};
