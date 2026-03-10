import type { MutableRefObject } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import type { UserDetails } from '@/types/database';
import { CHAT_CONVERSATION_PAGE_SIZE } from '../constants';
import {
  chatSidebarMessagesGateway,
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
  searchContextMessageIdsRef: MutableRefObject<Set<string>>;
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
  searchContextMessageIdsRef,
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
        await chatSidebarMessagesGateway.fetchConversationMessages(
          targetUser.id,
          {
            beforeCreatedAt: oldestLoadedMessageCreatedAtRef.current,
            beforeId: oldestLoadedMessageIdRef.current,
            limit: CHAT_CONVERSATION_PAGE_SIZE,
          }
        );

      if (!isSessionTokenActive(paginationSessionToken)) {
        return;
      }

      if (error || !olderMessagesPage) {
        if (error) {
          console.error('Error loading older messages:', error);
        }
        setOlderMessagesError('Gagal memuat pesan lama');
        return;
      }

      const olderMessages = olderMessagesPage.messages.map(messageItem =>
        mapConversationMessageForDisplay(
          messageItem,
          user,
          targetUser,
          messageItem.stableKey || messageItem.id
        )
      );
      olderMessages.forEach(messageItem => {
        searchContextMessageIdsRef.current.delete(messageItem.id);
      });

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
      setHasOlderMessages(olderMessagesPage.hasMore);
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
    searchContextMessageIdsRef,
    setHasOlderMessages,
    setIsLoadingOlderMessages,
    setMessages,
    setOlderMessagesError,
    targetUser,
    user,
  ]);
