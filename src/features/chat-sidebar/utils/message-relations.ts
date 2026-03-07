import type {
  ChatMessage,
  ChatMessageInsertInput,
} from '../data/chatSidebarGateway';

export const ATTACHMENT_CAPTION_RELATION_KIND = 'attachment_caption' as const;

const hasSameConversationRoute = (
  message: Pick<ChatMessage, 'sender_id' | 'receiver_id' | 'channel_id'>,
  parentMessage: Pick<ChatMessage, 'sender_id' | 'receiver_id' | 'channel_id'>
) =>
  message.sender_id === parentMessage.sender_id &&
  message.receiver_id === parentMessage.receiver_id &&
  message.channel_id === parentMessage.channel_id;

export const isAttachmentCaptionMessage = (
  message: ChatMessage,
  parentMessage?: ChatMessage
) => {
  if (message.message_type !== 'text' || !message.reply_to_id) {
    return false;
  }

  if ('message_relation_kind' in message) {
    return message.message_relation_kind === ATTACHMENT_CAPTION_RELATION_KIND;
  }

  if (!parentMessage) {
    return false;
  }

  return (
    (parentMessage.message_type === 'image' ||
      parentMessage.message_type === 'file') &&
    parentMessage.id === message.reply_to_id &&
    hasSameConversationRoute(message, parentMessage)
  );
};

export const toAttachmentCaptionInsertInput = (
  payload: ChatMessageInsertInput
): ChatMessageInsertInput => ({
  ...payload,
  message_relation_kind: ATTACHMENT_CAPTION_RELATION_KIND,
});

export const markMessageAsAttachmentCaption = (
  message: ChatMessage,
  parentMessageId: string
): ChatMessage => ({
  ...message,
  reply_to_id: parentMessageId,
  message_relation_kind: ATTACHMENT_CAPTION_RELATION_KIND,
});

export const getAttachmentCaptionMessageIds = (
  messages: ChatMessage[],
  parentMessage: ChatMessage
) =>
  messages
    .filter(
      message =>
        message.reply_to_id === parentMessage.id &&
        isAttachmentCaptionMessage(message, parentMessage)
    )
    .map(message => message.id);
