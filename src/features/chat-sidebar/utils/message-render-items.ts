import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ComposerPendingFileKind } from '../types';

const MULTI_DOCUMENT_BUBBLE_MAX_GAP_MS = 60_000;

export type MessageRenderItem =
  | {
      kind: 'message';
      key: string;
      anchorMessage: ChatMessage;
      messages: [ChatMessage];
      captionMessage?: ChatMessage;
    }
  | {
      kind: 'document-group';
      key: string;
      anchorMessage: ChatMessage;
      messages: ChatMessage[];
      captionMessage?: ChatMessage;
    };

const isDocumentAttachmentMessage = (
  message: ChatMessage,
  getAttachmentFileKind: (targetMessage: ChatMessage) => ComposerPendingFileKind
) =>
  message.message_type === 'file' &&
  getAttachmentFileKind(message) === 'document';

const isSameCalendarDay = (left: ChatMessage, right: ChatMessage) =>
  new Date(left.created_at).toDateString() ===
  new Date(right.created_at).toDateString();

const isWithinMultiDocumentBubbleGap = (
  left: ChatMessage,
  right: ChatMessage
) => {
  const leftTimestamp = new Date(left.created_at).getTime();
  const rightTimestamp = new Date(right.created_at).getTime();

  if (!Number.isFinite(leftTimestamp) || !Number.isFinite(rightTimestamp)) {
    return false;
  }

  return (
    Math.abs(rightTimestamp - leftTimestamp) <= MULTI_DOCUMENT_BUBBLE_MAX_GAP_MS
  );
};

export const buildMessageRenderItems = ({
  messages,
  captionMessagesByAttachmentId,
  getAttachmentFileKind,
  enableDocumentBubbleGrouping,
}: {
  messages: ChatMessage[];
  captionMessagesByAttachmentId: Map<string, ChatMessage>;
  getAttachmentFileKind: (
    targetMessage: ChatMessage
  ) => ComposerPendingFileKind;
  enableDocumentBubbleGrouping: boolean;
}): MessageRenderItem[] => {
  if (!enableDocumentBubbleGrouping) {
    return messages.map(message => ({
      kind: 'message' as const,
      key: message.stableKey || message.id,
      anchorMessage: message,
      messages: [message] as [ChatMessage],
      captionMessage: captionMessagesByAttachmentId.get(message.id),
    }));
  }

  const renderItems: MessageRenderItem[] = [];

  for (let index = 0; index < messages.length; index += 1) {
    const currentMessage = messages[index];

    if (!isDocumentAttachmentMessage(currentMessage, getAttachmentFileKind)) {
      renderItems.push({
        kind: 'message',
        key: currentMessage.stableKey || currentMessage.id,
        anchorMessage: currentMessage,
        messages: [currentMessage],
        captionMessage: captionMessagesByAttachmentId.get(currentMessage.id),
      });
      continue;
    }

    const groupedMessages = [currentMessage];
    let lastGroupedMessage = currentMessage;

    while (index + groupedMessages.length < messages.length) {
      const nextMessage = messages[index + groupedMessages.length];

      if (!isDocumentAttachmentMessage(nextMessage, getAttachmentFileKind)) {
        break;
      }

      if (lastGroupedMessage.sender_id !== nextMessage.sender_id) {
        break;
      }

      if (!isSameCalendarDay(lastGroupedMessage, nextMessage)) {
        break;
      }

      if (!isWithinMultiDocumentBubbleGap(lastGroupedMessage, nextMessage)) {
        break;
      }

      if (captionMessagesByAttachmentId.has(lastGroupedMessage.id)) {
        break;
      }

      groupedMessages.push(nextMessage);
      lastGroupedMessage = nextMessage;
    }

    if (groupedMessages.length > 1) {
      const anchorMessage = groupedMessages[groupedMessages.length - 1];

      renderItems.push({
        kind: 'document-group',
        key: anchorMessage.stableKey || anchorMessage.id,
        anchorMessage,
        messages: groupedMessages,
        captionMessage: captionMessagesByAttachmentId.get(anchorMessage.id),
      });

      index += groupedMessages.length - 1;
      continue;
    }

    renderItems.push({
      kind: 'message',
      key: currentMessage.stableKey || currentMessage.id,
      anchorMessage: currentMessage,
      messages: [currentMessage],
      captionMessage: captionMessagesByAttachmentId.get(currentMessage.id),
    });
  }

  return renderItems;
};
