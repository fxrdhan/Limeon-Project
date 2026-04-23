import type { UserDetails } from "@/types/database";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { chatSidebarMessagesGateway, type ChatMessage } from "../data/chatSidebarGateway";
import type { ChatSidebarPanelTargetUser } from "../types";
import {
  mapConversationMessageForDisplay,
  mergeConversationContextWithExisting,
} from "../utils/conversation-sync";
import { useChatConversationCacheSync } from "./useChatConversationCacheSync";
import { useChatConversationInitialLoad } from "./useChatConversationInitialLoad";
import { useChatConversationRealtime } from "./useChatConversationRealtime";
import { useChatConversationPagination } from "./useChatConversationPagination";
import { useChatSessionEngine } from "./useChatSessionEngine";

interface UseChatSessionProps {
  isOpen: boolean;
  user: UserDetails | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
}

export interface MergeSearchContextMessagesOptions {
  hasOlderMessages?: boolean;
}

const compareMessageOrder = (
  leftMessage: Pick<ChatMessage, "created_at" | "id">,
  rightMessage: Pick<ChatMessage, "created_at" | "id">,
) => {
  const createdAtOrder = leftMessage.created_at.localeCompare(rightMessage.created_at);
  if (createdAtOrder !== 0) {
    return createdAtOrder;
  }

  return leftMessage.id.localeCompare(rightMessage.id);
};

export const useChatSession = ({
  isOpen,
  user,
  targetUser,
  currentChannelId,
  initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef,
}: UseChatSessionProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyTargetMessagesById, setReplyTargetMessagesById] = useState<
    Record<string, ChatMessage>
  >({});
  const replyTargetMessagesByIdRef = useRef<Record<string, ChatMessage>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [olderMessagesError, setOlderMessagesError] = useState<string | null>(null);
  const [retryInitialLoadTick, setRetryInitialLoadTick] = useState(0);
  const requestedReplyTargetIdsRef = useRef<Set<string>>(new Set());

  const applyMessageUpdate = useCallback(
    (updatedMessage: Partial<ChatMessage> & { id: string }) => {
      setMessages((previousMessages) =>
        previousMessages.map((previousMessage) =>
          previousMessage.id === updatedMessage.id
            ? {
                ...previousMessage,
                ...updatedMessage,
                stableKey: previousMessage.stableKey,
              }
            : previousMessage,
        ),
      );
    },
    [],
  );

  const sessionEngine = useChatSessionEngine({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    retryInitialLoadTick,
    applyMessageUpdate,
  });
  const { conversationSession } = sessionEngine;

  useEffect(() => {
    replyTargetMessagesByIdRef.current = replyTargetMessagesById;
  }, [replyTargetMessagesById]);

  const mapMessageForActiveConversation = useCallback(
    (messageItem: ChatMessage) =>
      user && targetUser
        ? mapConversationMessageForDisplay(
            messageItem,
            user,
            targetUser,
            messageItem.stableKey || messageItem.id,
          )
        : messageItem,
    [targetUser, user],
  );

  const primeReplyTargetMessages = useCallback(
    async (candidateMessages: ChatMessage[]) => {
      if (!isOpen || !user || !targetUser || !currentChannelId) {
        return;
      }

      const loadedMessageIds = new Set(candidateMessages.map((messageItem) => messageItem.id));
      const missingReplyTargetIds = [
        ...new Set(
          candidateMessages
            .map((messageItem) => messageItem.reply_to_id?.trim() || null)
            .filter((replyToId): replyToId is string => Boolean(replyToId)),
        ),
      ].filter(
        (replyToId) =>
          !loadedMessageIds.has(replyToId) &&
          !replyTargetMessagesByIdRef.current[replyToId] &&
          !requestedReplyTargetIdsRef.current.has(replyToId),
      );

      if (missingReplyTargetIds.length === 0) {
        return;
      }

      missingReplyTargetIds.forEach((replyToId) => {
        requestedReplyTargetIdsRef.current.add(replyToId);
      });

      const replyTargetEntries = await Promise.all(
        missingReplyTargetIds.map(async (replyToId) => {
          const { data: replyTargetMessage, error } =
            await chatSidebarMessagesGateway.getMessageById(replyToId);

          if (error || !replyTargetMessage) {
            return null;
          }

          if (replyTargetMessage.channel_id && replyTargetMessage.channel_id !== currentChannelId) {
            return null;
          }

          return {
            replyToId,
            replyTargetMessage: mapMessageForActiveConversation(replyTargetMessage),
          };
        }),
      );

      const resolvedReplyTargetEntries = replyTargetEntries.filter(
        (
          replyTargetEntry,
        ): replyTargetEntry is {
          replyToId: string;
          replyTargetMessage: ChatMessage;
        } => Boolean(replyTargetEntry),
      );

      if (resolvedReplyTargetEntries.length === 0) {
        return;
      }

      setReplyTargetMessagesById((previousReplyTargetMessagesById) => {
        const nextReplyTargetMessagesById = {
          ...previousReplyTargetMessagesById,
        };

        resolvedReplyTargetEntries.forEach(({ replyToId, replyTargetMessage }) => {
          nextReplyTargetMessagesById[replyToId] = replyTargetMessage;
        });

        return nextReplyTargetMessagesById;
      });
    },
    [currentChannelId, isOpen, mapMessageForActiveConversation, targetUser, user],
  );

  useEffect(() => {
    replyTargetMessagesByIdRef.current = {};
    setReplyTargetMessagesById((previousReplyTargetMessagesById) =>
      Object.keys(previousReplyTargetMessagesById).length === 0
        ? previousReplyTargetMessagesById
        : {},
    );
    requestedReplyTargetIdsRef.current.clear();
  }, [currentChannelId, isOpen, targetUser?.id, user?.id]);

  useEffect(() => {
    if (!isOpen || !user || !targetUser || !currentChannelId) {
      return;
    }

    let isCancelled = false;

    void primeReplyTargetMessages(messages).then(() => {
      if (isCancelled) {
        return;
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [currentChannelId, isOpen, messages, primeReplyTargetMessages, targetUser, user]);

  const getReplyTargetMessage = useCallback(
    (replyToId: string | null) => {
      const normalizedReplyToId = replyToId?.trim() || null;
      if (!normalizedReplyToId) {
        return undefined;
      }

      return (
        messages.find((messageItem) => messageItem.id === normalizedReplyToId) ||
        replyTargetMessagesById[normalizedReplyToId]
      );
    },
    [messages, replyTargetMessagesById],
  );

  const mergeSearchContextMessages = useCallback(
    (searchContextMessages: ChatMessage[], options?: MergeSearchContextMessagesOptions) => {
      if (!currentChannelId || searchContextMessages.length === 0) {
        return;
      }

      const mappedContextMessages = searchContextMessages.map((messageItem) =>
        mapMessageForActiveConversation(messageItem),
      );
      const previousOldestMessage =
        conversationSession.oldestLoadedMessageCreatedAtRef.current &&
        conversationSession.oldestLoadedMessageIdRef.current
          ? {
              created_at: conversationSession.oldestLoadedMessageCreatedAtRef.current,
              id: conversationSession.oldestLoadedMessageIdRef.current,
            }
          : null;
      let injectedOlderPersistedMessage = false;

      setMessages((previousMessages) => {
        const knownPersistedMessageIds = new Set(
          previousMessages
            .filter((messageItem) => !messageItem.id.startsWith("temp_"))
            .map((messageItem) => messageItem.id),
        );
        const nextMessages = mergeConversationContextWithExisting(
          previousMessages,
          mappedContextMessages,
          currentChannelId,
        );
        const nextPersistedMessages = nextMessages.filter(
          (messageItem) => !messageItem.id.startsWith("temp_"),
        );

        mappedContextMessages.forEach((messageItem) => {
          if (knownPersistedMessageIds.has(messageItem.id)) {
            return;
          }

          conversationSession.searchContextMessageIdsRef.current.add(messageItem.id);
          if (
            previousOldestMessage &&
            compareMessageOrder(messageItem, previousOldestMessage) < 0
          ) {
            injectedOlderPersistedMessage = true;
          }
        });

        conversationSession.oldestLoadedMessageCreatedAtRef.current =
          nextPersistedMessages[0]?.created_at ?? null;
        conversationSession.oldestLoadedMessageIdRef.current = nextPersistedMessages[0]?.id ?? null;

        return nextMessages;
      });

      if (typeof options?.hasOlderMessages === "boolean") {
        setHasOlderMessages(options.hasOlderMessages);
      } else if (injectedOlderPersistedMessage) {
        setHasOlderMessages(true);
      }
    },
    [conversationSession, currentChannelId, mapMessageForActiveConversation],
  );

  const loadOlderMessages = useChatConversationPagination({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    conversationSession,
    hasOlderMessages,
    isLoadingOlderMessages,
    setMessages,
    setHasOlderMessages,
    setIsLoadingOlderMessages,
    setOlderMessagesError,
  });

  useChatConversationRealtime({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    recoveryTick: sessionEngine.realtimeRecoveryTick,
    conversationSession,
    mapMessageForActiveConversation,
    applyMessageUpdate,
    setMessages,
    setLoadError,
    markConversationRecoverySuccess: sessionEngine.markConversationRecoverySuccess,
    scheduleConversationRecovery: sessionEngine.scheduleConversationRecovery,
  });

  useChatConversationInitialLoad({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    retryInitialLoadTick,
    realtimeRecoveryTick: sessionEngine.realtimeRecoveryTick,
    setMessages,
    setLoading,
    setLoadError,
    setHasOlderMessages,
    setIsLoadingOlderMessages,
    setOlderMessagesError,
    conversationSession,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
    markConversationRecoverySuccess: sessionEngine.markConversationRecoverySuccess,
    markMessageIdsAsDelivered: sessionEngine.markMessageIdsAsDelivered,
    primeReplyTargetMessages,
  });

  useChatConversationCacheSync({
    isOpen,
    currentChannelId,
    messages,
    hasOlderMessages,
    hasCompletedInitialOpenLoadRef: conversationSession.hasCompletedInitialOpenLoadRef,
    excludedMessageIdsRef: conversationSession.searchContextMessageIdsRef,
  });

  const retryLoadMessages = useCallback(() => {
    setLoadError(null);
    setRetryInitialLoadTick((previousTick) => previousTick + 1);
  }, []);

  return {
    messages,
    getReplyTargetMessage,
    setMessages,
    loading,
    loadError,
    hasOlderMessages,
    isLoadingOlderMessages,
    olderMessagesError,
    loadOlderMessages,
    retryLoadMessages,
    isTargetOnline: sessionEngine.isTargetOnline,
    targetUserPresence: sessionEngine.targetUserPresence,
    targetUserPresenceError: sessionEngine.targetUserPresenceError,
    markMessageIdsAsRead: sessionEngine.markMessageIdsAsRead,
    mergeSearchContextMessages,
    primeReplyTargetMessages,
  };
};
