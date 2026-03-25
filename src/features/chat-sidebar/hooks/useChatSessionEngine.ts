import { useRealtimeChannelRecovery } from '@/hooks/realtime/useRealtimeChannelRecovery';
import type { UserDetails } from '@/types/database';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import {
  useChatConversationSessionState,
  type ChatConversationSessionState,
} from './useChatConversationSessionState';
import { useChatSessionPresence } from './useChatSessionPresence';
import { useChatSessionReceipts } from './useChatSessionReceipts';

interface UseChatSessionEngineProps {
  isOpen: boolean;
  user: UserDetails | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  retryInitialLoadTick: number;
  applyMessageUpdate: (
    updatedMessage: Partial<ChatMessage> & { id: string }
  ) => void;
}

export interface ChatSessionEngine {
  conversationSession: ChatConversationSessionState;
  realtimeRecoveryTick: number;
  scheduleConversationRecovery: () => boolean;
  markConversationRecoverySuccess: () => void;
  markMessageIdsAsDelivered: (
    messageIds: string[],
    sessionToken?: number
  ) => Promise<void>;
  markMessageIdsAsRead: (
    messageIds: string[],
    sessionToken?: number
  ) => Promise<void>;
  isTargetOnline: boolean;
  targetUserPresence: ReturnType<
    typeof useChatSessionPresence
  >['targetUserPresence'];
  targetUserPresenceError: ReturnType<
    typeof useChatSessionPresence
  >['targetUserPresenceError'];
}

export const useChatSessionEngine = ({
  isOpen,
  user,
  targetUser,
  currentChannelId,
  retryInitialLoadTick,
  applyMessageUpdate,
}: UseChatSessionEngineProps): ChatSessionEngine => {
  const conversationSession = useChatConversationSessionState();
  const {
    recoveryTick: realtimeRecoveryTick,
    scheduleRecovery: scheduleConversationRecovery,
    markRecoverySuccess: markConversationRecoverySuccess,
  } = useRealtimeChannelRecovery();
  const { isTargetOnline, targetUserPresence, targetUserPresenceError } =
    useChatSessionPresence({
      isOpen,
      user,
      targetUser,
      currentChannelId,
    });
  const receiptScopeResetKey =
    isOpen && user && targetUser && currentChannelId
      ? [
          user.id,
          targetUser.id,
          currentChannelId,
          retryInitialLoadTick,
          realtimeRecoveryTick,
        ].join('::')
      : null;
  const { markMessageIdsAsDelivered, markMessageIdsAsRead } =
    useChatSessionReceipts({
      applyMessageUpdate,
      currentUserId: user?.id,
      isSessionTokenActive: conversationSession.isSessionTokenActive,
      receiptScopeResetKey,
    });

  return {
    conversationSession,
    realtimeRecoveryTick,
    scheduleConversationRecovery,
    markConversationRecoverySuccess,
    markMessageIdsAsDelivered,
    markMessageIdsAsRead,
    isTargetOnline,
    targetUserPresence,
    targetUserPresenceError,
  };
};
