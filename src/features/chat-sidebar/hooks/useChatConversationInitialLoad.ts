import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useEffect } from 'react';
import type { UserDetails } from '@/types/database';
import {
  CHAT_CONVERSATION_CACHE_MAX_MESSAGES,
  CHAT_CONVERSATION_PAGE_SIZE,
} from '../constants';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';
import {
  applyConversationSnapshot,
  mergeLatestConversationPageWithExisting,
} from '../utils/conversation-sync';
import {
  isCacheableChannelImageMessage,
  loadCachedChannelImageAssetUrl,
} from '../utils/channel-image-asset-cache';
import { mapConversationMessagesForDisplay } from '../utils/message-display';
import { resolveChatAssetUrl } from '../utils/message-file';
import { replayPendingConversationRealtimeEvents } from './useChatConversationRealtime';
import type { ChatConversationSessionState } from './useChatConversationSessionState';

const INITIAL_IMAGE_PREVIEW_PRIME_LIMIT = 12;
const INITIAL_CACHED_IMAGE_ASSET_PRIME_LIMIT = 8;
const INITIAL_CACHED_IMAGE_ASSET_PRIME_TIMEOUT_MS = 80;

interface UseChatConversationInitialLoadProps {
  isOpen: boolean;
  user: UserDetails | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  retryInitialLoadTick: number;
  realtimeRecoveryTick: number;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setLoadError: Dispatch<SetStateAction<string | null>>;
  setHasOlderMessages: Dispatch<SetStateAction<boolean>>;
  setIsLoadingOlderMessages: Dispatch<SetStateAction<boolean>>;
  setOlderMessagesError: Dispatch<SetStateAction<string | null>>;
  conversationSession: ChatConversationSessionState;
  initialMessageAnimationKeysRef: MutableRefObject<Set<string>>;
  initialOpenJumpAnimationKeysRef: MutableRefObject<Set<string>>;
  markConversationRecoverySuccess: () => void;
  markMessageIdsAsDelivered: (
    messageIds: string[],
    sessionToken?: number
  ) => Promise<void>;
  primeReplyTargetMessages: (messages: ChatMessage[]) => Promise<void>;
}

export const useChatConversationInitialLoad = ({
  isOpen,
  user,
  targetUser,
  currentChannelId,
  retryInitialLoadTick,
  realtimeRecoveryTick,
  setMessages,
  setLoading,
  setLoadError,
  setHasOlderMessages,
  setIsLoadingOlderMessages,
  setOlderMessagesError,
  conversationSession,
  initialMessageAnimationKeysRef,
  initialOpenJumpAnimationKeysRef,
  markConversationRecoverySuccess,
  markMessageIdsAsDelivered,
  primeReplyTargetMessages,
}: UseChatConversationInitialLoadProps) => {
  const {
    hasCompletedInitialOpenLoadRef,
    activeSessionTokenRef,
    oldestLoadedMessageCreatedAtRef,
    oldestLoadedMessageIdRef,
    isInitialConversationLoadPendingRef,
    pendingConversationRealtimeEventsRef,
    searchContextMessageIdsRef,
  } = conversationSession;

  useEffect(() => {
    const activeSearchContextMessageIds = searchContextMessageIdsRef.current;

    if (!isOpen || !user || !targetUser || !currentChannelId) {
      markConversationRecoverySuccess();
      hasCompletedInitialOpenLoadRef.current = false;
      isInitialConversationLoadPendingRef.current = false;
      pendingConversationRealtimeEventsRef.current = [];
      setLoading(false);
      setLoadError(null);
      setHasOlderMessages(false);
      setIsLoadingOlderMessages(false);
      setOlderMessagesError(null);
      oldestLoadedMessageCreatedAtRef.current = null;
      oldestLoadedMessageIdRef.current = null;
      activeSearchContextMessageIds.clear();
      return;
    }

    const sessionToken = activeSessionTokenRef.current + 1;
    activeSessionTokenRef.current = sessionToken;
    hasCompletedInitialOpenLoadRef.current = false;
    isInitialConversationLoadPendingRef.current = true;
    pendingConversationRealtimeEventsRef.current = [];
    activeSearchContextMessageIds.clear();
    setIsLoadingOlderMessages(false);
    setOlderMessagesError(null);
    let isCancelled = false;

    const isActiveSession = () =>
      !isCancelled && activeSessionTokenRef.current === sessionToken;

    const applyActiveConversationSnapshot = (
      snapshotMessages: ChatMessage[]
    ) => {
      if (!isActiveSession()) {
        return [];
      }

      return applyConversationSnapshot({
        snapshotMessages,
        user,
        targetUser,
        currentChannelId,
        setMessages,
        initialMessageAnimationKeysRef,
        initialOpenJumpAnimationKeysRef,
      });
    };

    const loadMessages = async () => {
      const primeRecentImagePreviewUrls = async (messages: ChatMessage[]) => {
        const recentPreviewableMessages = [...messages]
          .reverse()
          .filter(
            messageItem =>
              isCacheableChannelImageMessage(messageItem) &&
              Boolean(messageItem.file_preview_url?.trim())
          )
          .slice(0, INITIAL_IMAGE_PREVIEW_PRIME_LIMIT);

        if (recentPreviewableMessages.length === 0) {
          return;
        }

        await Promise.all(
          recentPreviewableMessages.map(messageItem =>
            resolveChatAssetUrl(
              messageItem.file_preview_url!.trim(),
              messageItem.file_preview_url!.trim()
            ).catch(() => null)
          )
        );
      };

      const primeRecentCachedImageAssets = async (messages: ChatMessage[]) => {
        const normalizedChannelId = currentChannelId?.trim() || null;
        if (!normalizedChannelId) {
          return;
        }

        const recentCacheableMessages = [...messages]
          .reverse()
          .filter(messageItem => isCacheableChannelImageMessage(messageItem))
          .slice(0, INITIAL_CACHED_IMAGE_ASSET_PRIME_LIMIT);
        if (recentCacheableMessages.length === 0) {
          return;
        }

        await Promise.race([
          Promise.all(
            recentCacheableMessages.map(messageItem =>
              loadCachedChannelImageAssetUrl(
                normalizedChannelId,
                messageItem.id,
                'full'
              ).catch(() => null)
            )
          ),
          new Promise(resolve => {
            window.setTimeout(
              resolve,
              INITIAL_CACHED_IMAGE_ASSET_PRIME_TIMEOUT_MS
            );
          }),
        ]);
      };

      const cachedConversation =
        chatRuntimeCache.conversation.getFreshEntry(currentChannelId);
      const hasCachedConversation = Boolean(cachedConversation);
      const cachedPersistedMessages = cachedConversation?.messages || [];
      const refreshPageSize = Math.max(
        CHAT_CONVERSATION_PAGE_SIZE,
        cachedPersistedMessages.length
      );
      const boundedRefreshPageSize = Math.min(
        refreshPageSize,
        CHAT_CONVERSATION_CACHE_MAX_MESSAGES
      );

      if (cachedConversation) {
        applyActiveConversationSnapshot(cachedConversation.messages);
        hasCompletedInitialOpenLoadRef.current = true;
        oldestLoadedMessageCreatedAtRef.current =
          cachedConversation.messages[0]?.created_at ?? null;
        oldestLoadedMessageIdRef.current =
          cachedConversation.messages[0]?.id ?? null;
        setHasOlderMessages(cachedConversation.hasOlderMessages);
      } else if (isActiveSession()) {
        setMessages([]);
        setHasOlderMessages(false);
      }

      if (isActiveSession()) {
        setLoading(!hasCachedConversation);
        setLoadError(null);
      }

      try {
        const { data: existingMessagesPage, error } =
          await chatSidebarMessagesGateway.fetchConversationMessages(
            targetUser.id,
            {
              limit: boundedRefreshPageSize,
            }
          );

        if (!isActiveSession()) {
          return;
        }

        if (error || !existingMessagesPage) {
          console.error('Error loading messages:', error);
          setLoadError(
            hasCachedConversation
              ? 'Gagal menyegarkan percakapan'
              : 'Gagal memuat percakapan'
          );
          return;
        }

        if (!hasCachedConversation) {
          await primeRecentCachedImageAssets(existingMessagesPage.messages);
          void primeRecentImagePreviewUrls(existingMessagesPage.messages);
        }
        await primeReplyTargetMessages(existingMessagesPage.messages);

        const transformedMessages = hasCachedConversation
          ? mapConversationMessagesForDisplay(existingMessagesPage.messages, {
              currentUserId: user.id,
              currentUserName: user.name || 'You',
              targetUserName: targetUser.name || 'Unknown',
            })
          : applyActiveConversationSnapshot(existingMessagesPage.messages);

        if (!isActiveSession()) {
          return;
        }

        const mergedPersistedMessages = hasCachedConversation
          ? mergeLatestConversationPageWithExisting({
              previousMessages: cachedPersistedMessages,
              latestMessages: transformedMessages,
              currentChannelId,
              preserveOlderPersistedMessages: false,
            }).filter(messageItem => !messageItem.id.startsWith('temp_'))
          : transformedMessages;

        if (hasCachedConversation) {
          setMessages(previousMessages =>
            mergeLatestConversationPageWithExisting({
              previousMessages,
              latestMessages: transformedMessages,
              currentChannelId,
              preserveOlderPersistedMessages: false,
            })
          );
        }

        const pendingConversationRealtimeEvents =
          pendingConversationRealtimeEventsRef.current;
        isInitialConversationLoadPendingRef.current = false;
        pendingConversationRealtimeEventsRef.current = [];

        if (pendingConversationRealtimeEvents.length > 0) {
          setMessages(previousMessages =>
            replayPendingConversationRealtimeEvents({
              previousMessages,
              pendingEvents: pendingConversationRealtimeEvents,
              currentChannelId,
            })
          );
        }

        const latestPersistedMessages =
          pendingConversationRealtimeEvents.length > 0
            ? replayPendingConversationRealtimeEvents({
                previousMessages: mergedPersistedMessages,
                pendingEvents: pendingConversationRealtimeEvents,
                currentChannelId,
              })
            : mergedPersistedMessages;
        latestPersistedMessages.forEach(messageItem => {
          activeSearchContextMessageIds.delete(messageItem.id);
        });

        const nextHasOlderMessages = existingMessagesPage.hasMore;

        chatRuntimeCache.conversation.setEntry(
          currentChannelId,
          latestPersistedMessages,
          nextHasOlderMessages
        );
        oldestLoadedMessageCreatedAtRef.current =
          latestPersistedMessages[0]?.created_at ?? null;
        oldestLoadedMessageIdRef.current =
          latestPersistedMessages[0]?.id ?? null;
        setHasOlderMessages(nextHasOlderMessages);
        setLoadError(null);

        const undeliveredIncomingMessageIds = latestPersistedMessages
          .filter(
            messageItem =>
              messageItem.sender_id === targetUser.id &&
              messageItem.receiver_id === user.id &&
              !messageItem.is_delivered
          )
          .map(messageItem => messageItem.id);

        void markMessageIdsAsDelivered(
          undeliveredIncomingMessageIds,
          sessionToken
        );
      } catch (error) {
        console.error('Error loading messages:', error);
        setLoadError(
          hasCachedConversation
            ? 'Gagal menyegarkan percakapan'
            : 'Gagal memuat percakapan'
        );
      } finally {
        if (isActiveSession()) {
          isInitialConversationLoadPendingRef.current = false;
          pendingConversationRealtimeEventsRef.current = [];
          hasCompletedInitialOpenLoadRef.current = true;
          setLoading(false);
        }
      }
    };

    void loadMessages();

    return () => {
      isCancelled = true;
      if (activeSessionTokenRef.current === sessionToken) {
        activeSessionTokenRef.current += 1;
      }
      isInitialConversationLoadPendingRef.current = false;
      pendingConversationRealtimeEventsRef.current = [];
      activeSearchContextMessageIds.clear();
    };
  }, [
    activeSessionTokenRef,
    currentChannelId,
    hasCompletedInitialOpenLoadRef,
    initialMessageAnimationKeysRef,
    initialOpenJumpAnimationKeysRef,
    isInitialConversationLoadPendingRef,
    isOpen,
    markConversationRecoverySuccess,
    markMessageIdsAsDelivered,
    oldestLoadedMessageCreatedAtRef,
    oldestLoadedMessageIdRef,
    pendingConversationRealtimeEventsRef,
    searchContextMessageIdsRef,
    realtimeRecoveryTick,
    retryInitialLoadTick,
    primeReplyTargetMessages,
    setHasOlderMessages,
    setIsLoadingOlderMessages,
    setLoadError,
    setLoading,
    setMessages,
    setOlderMessagesError,
    targetUser,
    user,
  ]);
};
