import { MAX_MESSAGE_CHARS } from "../../constants";
import type { ChatMessage } from "../../data/chatSidebarGateway";
import type { MessageRenderItem } from "../../utils/message-render-items";
import type { MessageItemRuntime } from "../messagesPaneRuntime";
import type { MessageItemModel } from "./messageItemTypes";

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
  const shouldRenderDateSeparator = index === 0 || previousMessageDate !== currentMessageDate;
  const isGroupedWithPrevious =
    previousMessage?.sender_id === messageItem.sender_id &&
    previousMessageDate === currentMessageDate;
  const isGroupedWithNext =
    nextMessage?.sender_id === messageItem.sender_id &&
    new Date(nextMessage.created_at).toDateString() === currentMessageDate;
  const selectionTargetMessageIds = renderItem.messages.map((targetMessage) => targetMessage.id);

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
      isSelected: selectionTargetMessageIds.every((targetMessageId) =>
        runtime.interaction.selectedMessageIds.has(targetMessageId),
      ),
      selectionTargetMessageIds,
      expandedMessageIds: runtime.interaction.expandedMessageIds,
      flashingMessageId: runtime.interaction.flashingMessageId,
      isFlashHighlightVisible: runtime.interaction.isFlashHighlightVisible,
      searchMatchedMessageIds,
      activeSearchMessageId,
      maxMessageChars: MAX_MESSAGE_CHARS,
      onToggleMessageSelection: runtime.interaction.handleToggleMessageSelection,
      handleToggleExpand: runtime.interaction.handleToggleExpand,
    },
    menu: {
      openMessageId: runtime.menu.openMessageId,
      placement: runtime.menu.placement,
      sideAnchor: runtime.menu.sideAnchor,
      verticalAnchor: runtime.menu.verticalAnchor,
      shouldAnimateOpen: runtime.menu.shouldAnimateOpen,
      transitionSourceId: runtime.menu.transitionSourceId,
      offsetX: runtime.menu.offsetX,
      toggle: runtime.menu.toggle,
    },
    refs: {
      messageBubbleRefs: runtime.refs.messageBubbleRefs,
      initialMessageAnimationKeysRef: runtime.refs.initialMessageAnimationKeysRef,
      initialOpenJumpAnimationKeysRef: runtime.refs.initialOpenJumpAnimationKeysRef,
    },
    content: {
      resolvedMessageUrl: runtime.content.getImageMessageUrl(messageItem),
      captionMessage: renderItem.captionMessage,
      replyTargetMessage: runtime.content.getReplyTargetMessage(messageItem.reply_to_id),
      groupedDocumentMessages:
        renderItem.kind === "document-group" ? renderItem.messages : undefined,
      groupedImageMessages: renderItem.kind === "image-group" ? renderItem.messages : undefined,
      pdfMessagePreview: runtime.content.getPdfMessagePreview(
        messageItem,
        runtime.content.getAttachmentFileName(messageItem),
      ),
      getAttachmentFileName: runtime.content.getAttachmentFileName,
      getAttachmentFileKind: runtime.content.getAttachmentFileKind,
      getImageMessageUrl: runtime.content.getImageMessageUrl,
      getPdfMessagePreview: runtime.content.getPdfMessagePreview,
      normalizedSearchQuery: runtime.interaction.normalizedMessageSearchQuery,
      openImageInPortal: runtime.content.openImageInPortal,
      openImageGroupInPortal: runtime.content.openImageGroupInPortal,
      openDocumentInPortal: runtime.content.openDocumentInPortal,
      focusReplyTargetMessage: runtime.content.focusReplyTargetMessage,
    },
    actions: {
      handleEditMessage: runtime.actions.handleEditMessage,
      handleReplyMessage: runtime.actions.handleReplyMessage,
      handleCopyMessage: runtime.actions.handleCopyMessage,
      handleDownloadMessage: runtime.actions.handleDownloadMessage,
      handleDownloadImageGroup: runtime.actions.handleDownloadImageGroup,
      handleDownloadDocumentGroup: runtime.actions.handleDownloadDocumentGroup,
      handleDeleteMessages: runtime.actions.handleDeleteMessages,
      handleOpenForwardMessagePicker: runtime.actions.handleOpenForwardMessagePicker,
      handleDeleteMessage: runtime.actions.handleDeleteMessage,
    },
  };
};
