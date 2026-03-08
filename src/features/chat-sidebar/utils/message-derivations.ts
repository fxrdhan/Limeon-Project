import type { ChatMessage } from '../data/chatSidebarGateway';
import { getAttachmentFileName } from './attachment';
import { isAttachmentCaptionMessage } from './message-relations';

export type AttachmentCaptionData = {
  captionMessagesByAttachmentId: Map<string, ChatMessage>;
  captionMessageIds: Set<string>;
};

export interface MessageActorLike {
  id?: string;
  name?: string;
}

export const getAttachmentCaptionData = (
  messages: ChatMessage[]
): AttachmentCaptionData => {
  const attachmentMessagesById = new Map<string, ChatMessage>();
  const captionMessagesByAttachmentId = new Map<string, ChatMessage>();
  const captionMessageIds = new Set<string>();

  for (const messageItem of messages) {
    if (
      messageItem.message_type === 'image' ||
      messageItem.message_type === 'file'
    ) {
      attachmentMessagesById.set(messageItem.id, messageItem);
    }
  }

  for (const messageItem of messages) {
    if (messageItem.message_type !== 'text' || !messageItem.reply_to_id) {
      continue;
    }

    const parentMessage = attachmentMessagesById.get(messageItem.reply_to_id);
    if (!parentMessage) continue;
    if (!isAttachmentCaptionMessage(messageItem, parentMessage)) continue;
    if (captionMessagesByAttachmentId.has(parentMessage.id)) continue;

    captionMessagesByAttachmentId.set(parentMessage.id, messageItem);
    captionMessageIds.add(messageItem.id);
  }

  return {
    captionMessagesByAttachmentId,
    captionMessageIds,
  };
};

export const getSearchMatchedMessageIds = (
  messages: ChatMessage[],
  normalizedQuery: string,
  captionData: AttachmentCaptionData
) => {
  if (!normalizedQuery) return [];

  const matchedIds: string[] = [];

  for (const messageItem of messages) {
    if (captionData.captionMessageIds.has(messageItem.id)) continue;

    const messageFragments: string[] = [];
    if (messageItem.message_type === 'text') {
      messageFragments.push(messageItem.message);
    } else if (
      messageItem.message_type === 'image' ||
      messageItem.message_type === 'file'
    ) {
      messageFragments.push(getAttachmentFileName(messageItem));
    }

    const attachmentCaption = captionData.captionMessagesByAttachmentId.get(
      messageItem.id
    );
    if (attachmentCaption?.message) {
      messageFragments.push(attachmentCaption.message);
    }

    if (messageFragments.length === 0) continue;

    const searchBase = messageFragments.join('\n').toLowerCase();
    if (searchBase.includes(normalizedQuery)) {
      matchedIds.push(messageItem.id);
    }
  }

  return matchedIds;
};

export const getSelectableMessageIdSet = (
  messages: ChatMessage[],
  captionMessageIds: Set<string>
) => {
  const selectableIds = new Set<string>();

  for (const messageItem of messages) {
    if (captionMessageIds.has(messageItem.id)) continue;
    selectableIds.add(messageItem.id);
  }

  return selectableIds;
};

export const getSelectedVisibleMessages = (
  messages: ChatMessage[],
  captionMessageIds: Set<string>,
  selectedMessageIds: Set<string>
) => {
  const selectedMessages: ChatMessage[] = [];

  for (const messageItem of messages) {
    if (captionMessageIds.has(messageItem.id)) continue;
    if (!selectedMessageIds.has(messageItem.id)) continue;
    selectedMessages.push(messageItem);
  }

  return selectedMessages;
};

const formatSerializedMessageTimestamp = (timestamp: string) => {
  const parsedTimestamp = new Date(timestamp);
  if (!Number.isFinite(parsedTimestamp.getTime())) return timestamp;

  const day = parsedTimestamp.getDate();
  const month = parsedTimestamp.getMonth() + 1;
  const hour = String(parsedTimestamp.getHours()).padStart(2, '0');
  const minute = String(parsedTimestamp.getMinutes()).padStart(2, '0');

  return `${day}/${month}, ${hour}.${minute}`;
};

export const serializeSelectedMessages = (
  selectedMessages: ChatMessage[],
  options: {
    captionMessagesByAttachmentId: Map<string, ChatMessage>;
    currentUser?: MessageActorLike | null;
    targetUser?: MessageActorLike;
    getAttachmentFileName: (targetMessage: ChatMessage) => string;
  }
) =>
  selectedMessages
    .map(messageItem => {
      const senderLabel =
        messageItem.sender_name ||
        (messageItem.sender_id === options.currentUser?.id
          ? options.currentUser?.name || 'You'
          : options.targetUser?.name || 'Unknown');
      const attachmentCaption = options.captionMessagesByAttachmentId
        .get(messageItem.id)
        ?.message?.trim();
      const attachmentLabel =
        messageItem.message_type === 'image'
          ? '[Gambar]'
          : `[File: ${options.getAttachmentFileName(messageItem)}]`;
      const messageBody =
        messageItem.message_type === 'text'
          ? messageItem.message
          : attachmentCaption || attachmentLabel;

      return `[${formatSerializedMessageTimestamp(messageItem.created_at)}] ${senderLabel}: ${messageBody}`;
    })
    .join('\n')
    .trim();
