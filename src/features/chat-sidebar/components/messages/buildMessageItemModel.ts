import { MAX_MESSAGE_CHARS } from '../../constants';
import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { MessageRenderItem } from '../../utils/message-render-items';
import type { MessageItemRuntime } from '../messagesPaneRuntime';
import type { MessageItemModel } from './messageItemTypes';

interface BuildMessageItemModelOptions {
  runtime: MessageItemRuntime;
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
      userId: runtime.userId,
      isSelectionMode: runtime.isSelectionMode,
      isSelected: runtime.selectedMessageIds.has(messageItem.id),
      expandedMessageIds: runtime.expandedMessageIds,
      flashingMessageId: runtime.flashingMessageId,
      isFlashHighlightVisible: runtime.isFlashHighlightVisible,
      searchMatchedMessageIds,
      activeSearchMessageId,
      maxMessageChars: MAX_MESSAGE_CHARS,
      onToggleMessageSelection: runtime.handleToggleMessageSelection,
      handleToggleExpand: runtime.handleToggleExpand,
    },
    menu: {
      openMessageId: runtime.openMenuMessageId,
      placement: runtime.menuPlacement,
      sideAnchor: runtime.menuSideAnchor,
      shouldAnimateOpen: runtime.shouldAnimateMenuOpen,
      transitionSourceId: runtime.menuTransitionSourceId,
      offsetX: runtime.menuOffsetX,
      toggle: runtime.toggleMessageMenu,
    },
    refs: {
      messageBubbleRefs: runtime.messageBubbleRefs,
      initialMessageAnimationKeysRef: runtime.initialMessageAnimationKeysRef,
      initialOpenJumpAnimationKeysRef: runtime.initialOpenJumpAnimationKeysRef,
    },
    content: {
      resolvedMessageUrl: runtime.getImageMessageUrl(messageItem),
      captionMessage: renderItem.captionMessage,
      groupedDocumentMessages:
        renderItem.kind === 'document-group' ? renderItem.messages : undefined,
      groupedImageMessages:
        renderItem.kind === 'image-group' ? renderItem.messages : undefined,
      pdfMessagePreview: runtime.getPdfMessagePreview(
        messageItem,
        runtime.getAttachmentFileName(messageItem)
      ),
      getAttachmentFileName: runtime.getAttachmentFileName,
      getAttachmentFileKind: runtime.getAttachmentFileKind,
      getImageMessageUrl: runtime.getImageMessageUrl,
      getPdfMessagePreview: runtime.getPdfMessagePreview,
      normalizedSearchQuery: runtime.normalizedMessageSearchQuery,
      openImageInPortal: runtime.openImageInPortal,
      openImageGroupInPortal: runtime.openImageGroupInPortal,
      openDocumentInPortal: runtime.openDocumentInPortal,
    },
    actions: {
      handleEditMessage: runtime.handleEditMessage,
      handleCopyMessage: runtime.handleCopyMessage,
      handleDownloadMessage: runtime.handleDownloadMessage,
      handleOpenForwardMessagePicker: runtime.handleOpenForwardMessagePicker,
      handleDeleteMessage: runtime.handleDeleteMessage,
    },
  };
};
