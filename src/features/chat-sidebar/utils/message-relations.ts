import type {
  ChatMessage,
  ChatMessageInsertInput,
} from '../data/chatSidebarGateway';

export const ATTACHMENT_CAPTION_RELATION_KIND = 'attachment_caption' as const;

export const isAttachmentCaptionMessage = (
  message: ChatMessage,
  _parentMessage?: ChatMessage
) => {
  if (message.message_type !== 'text' || !message.reply_to_id) {
    return false;
  }

  return message.message_relation_kind === ATTACHMENT_CAPTION_RELATION_KIND;
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
