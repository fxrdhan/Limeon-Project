import { useMemo } from 'react';
import type { ChatMessage } from '../data/chatSidebarGateway';
import { getAttachmentCaptionData } from '../utils/message-derivations';

export const useChatCaptionData = (messages: ChatMessage[]) =>
  useMemo(() => getAttachmentCaptionData(messages), [messages]);
