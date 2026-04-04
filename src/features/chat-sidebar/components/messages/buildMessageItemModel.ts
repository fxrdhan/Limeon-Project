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
      userId: runtime.interaction.userId,
      isSelectionMode: runtime.interaction.isSelectionMode,
      isSelected: runtime.interaction.selectedMessageIds.has(messageItem.id),
      expandedMessageIds: runtime.interaction.expandedMessageIds,
      flashingMessageId: runtime.interaction.flashingMessageId,
      isFlashHighlightVisible: runtime.interaction.isFlashHighlightVisible,
      searchMatchedMessageIds,
      activeSearchMessageId,
      maxMessageChars: MAX_MESSAGE_CHARS,
      onToggleMessageSelection:
        runtime.interaction.handleToggleMessageSelection,
      handleToggleExpand: runtime.interaction.handleToggleExpand,
    },
    menu: {
      openMessageId: runtime.menu.openMessageId,
      placement: runtime.menu.placement,
      sideAnchor: runtime.menu.sideAnchor,
      shouldAnimateOpen: runtime.menu.shouldAnimateOpen,
      transitionSourceId: runtime.menu.transitionSourceId,
      offsetX: runtime.menu.offsetX,
      toggle: runtime.menu.toggle,
    },
    refs: {
      messageBubbleRefs: runtime.refs.messageBubbleRefs,
      initialMessageAnimationKeysRef:
        runtime.refs.initialMessageAnimationKeysRef,
      initialOpenJumpAnimationKeysRef:
        runtime.refs.initialOpenJumpAnimationKeysRef,
    },
    content: {
      resolvedMessageUrl: runtime.content.getImageMessageUrl(messageItem),
      captionMessage: renderItem.captionMessage,
      groupedDocumentMessages:
        renderItem.kind === 'document-group' ? renderItem.messages : undefined,
      groupedImageMessages:
        renderItem.kind === 'image-group' ? renderItem.messages : undefined,
      pdfMessagePreview: runtime.content.getPdfMessagePreview(
        messageItem,
        runtime.content.getAttachmentFileName(messageItem)
      ),
      getAttachmentFileName: runtime.content.getAttachmentFileName,
      getAttachmentFileKind: runtime.content.getAttachmentFileKind,
      getImageMessageUrl: runtime.content.getImageMessageUrl,
      getPdfMessagePreview: runtime.content.getPdfMessagePreview,
      normalizedSearchQuery: runtime.interaction.normalizedMessageSearchQuery,
      openImageInPortal: runtime.content.openImageInPortal,
      openImageGroupInPortal: runtime.content.openImageGroupInPortal,
      openDocumentInPortal: runtime.content.openDocumentInPortal,
    },
    actions: {
      handleEditMessage: runtime.actions.handleEditMessage,
      handleCopyMessage: runtime.actions.handleCopyMessage,
      handleDownloadMessage: runtime.actions.handleDownloadMessage,
      handleDownloadImageGroup: runtime.actions.handleDownloadImageGroup,
      handleDownloadDocumentGroup: runtime.actions.handleDownloadDocumentGroup,
      handleOpenForwardMessagePicker:
        runtime.actions.handleOpenForwardMessagePicker,
      handleDeleteMessage: runtime.actions.handleDeleteMessage,
    },
  };
};
