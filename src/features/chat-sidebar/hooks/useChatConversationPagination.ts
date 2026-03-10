import type { MutableRefObject } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import type { UserDetails } from '@/types/database';
import { CHAT_CONVERSATION_PAGE_SIZE } from '../constants';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { mapConversationMessageForDisplay } from '../utils/conversation-sync';

interface UseChatConversationPaginationProps {
  isOpen: boolean;
  user: UserDetails | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  getActiveSessionToken: () => number;
  isSessionTokenActive: (sessionToken: number) => boolean;
  hasOlderMessages: boolean;
  isLoadingOlderMessages: boolean;
  oldestLoadedMessageCreatedAtRef: MutableRefObject<string | null>;
  oldestLoadedMessageIdRef: MutableRefObject<string | null>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setHasOlderMessages: Dispatch<SetStateAction<boolean>>;
  setIsLoadingOlderMessages: Dispatch<SetStateAction<boolean>>;
  setOlderMessagesError: Dispatch<SetStateAction<string | null>>;
}

export const useChatConversationPagination = ({
  isOpen,
  user,
  targetUser,
  currentChannelId,
  getActiveSessionToken,
  isSessionTokenActive,
  hasOlderMessages,
  isLoadingOlderMessages,
  oldestLoadedMessageCreatedAtRef,
  oldestLoadedMessageIdRef,
  setMessages,
  setHasOlderMessages,
  setIsLoadingOlderMessages,
  setOlderMessagesError,
}: UseChatConversationPaginationProps) =>
  useCallback(async () => {
    if (
      !isOpen ||
      !user ||
      !targetUser ||
      !currentChannelId ||
      !hasOlderMessages ||
      isLoadingOlderMessages ||
      !oldestLoadedMessageCreatedAtRef.current ||
      !oldestLoadedMessageIdRef.current
    ) {
      return;
    }

    setIsLoadingOlderMessages(true);
    setOlderMessagesError(null);
    const paginationSessionToken = getActiveSessionToken();

    try {
      const { data: olderMessagesPage, error } =
        await chatSidebarGateway.fetchConversationMessages(
          user.id,
          targetUser.id,
          currentChannelId,
          {
            beforeCreatedAt: oldestLoadedMessageCreatedAtRef.current,
            beforeId: oldestLoadedMessageIdRef.current,
            limit: CHAT_CONVERSATION_PAGE_SIZE,
          }
        );

      const olderMessagesPayload = Array.isArray(olderMessagesPage)
        ? {
            messages: olderMessagesPage,
            hasMore: false,
          }
        : olderMessagesPage;

      if (!isSessionTokenActive(paginationSessionToken)) {
        return;
      }

      if (error || !olderMessagesPayload?.messages) {
        if (error) {
          console.error('Error loading older messages:', error);
        }
        setOlderMessagesError('Gagal memuat pesan lama');
        return;
      }

      const olderMessages = olderMessagesPayload.messages.map(messageItem =>
        mapConversationMessageForDisplay(
          messageItem,
          user,
          targetUser,
          messageItem.stableKey || messageItem.id
        )
      );

      if (!isSessionTokenActive(paginationSessionToken)) {
        return;
      }

      setMessages(previousMessages => {
        const seenMessageIds = new Set(previousMessages.map(({ id }) => id));
        const uniqueOlderMessages = olderMessages.filter(
          messageItem => !seenMessageIds.has(messageItem.id)
        );

        return uniqueOlderMessages.length > 0
          ? [...uniqueOlderMessages, ...previousMessages]
          : previousMessages;
      });

      oldestLoadedMessageCreatedAtRef.current =
        olderMessages[0]?.created_at ?? oldestLoadedMessageCreatedAtRef.current;
      oldestLoadedMessageIdRef.current =
        olderMessages[0]?.id ?? oldestLoadedMessageIdRef.current;
      setHasOlderMessages(olderMessagesPayload.hasMore);
      setOlderMessagesError(null);
    } catch (error) {
      if (!isSessionTokenActive(paginationSessionToken)) {
        return;
      }
      console.error('Error loading older messages:', error);
      setOlderMessagesError('Gagal memuat pesan lama');
    } finally {
      if (isSessionTokenActive(paginationSessionToken)) {
        setIsLoadingOlderMessages(false);
      }
    }
  }, [
    currentChannelId,
    getActiveSessionToken,
    hasOlderMessages,
    isLoadingOlderMessages,
    isSessionTokenActive,
    isOpen,
    oldestLoadedMessageCreatedAtRef,
    oldestLoadedMessageIdRef,
    setHasOlderMessages,
    setIsLoadingOlderMessages,
    setMessages,
    setOlderMessagesError,
    targetUser,
    user,
  ]);
