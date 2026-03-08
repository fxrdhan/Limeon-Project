import type { UserDetails } from '@/types/database';
import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import {
  chatSidebarGateway,
  type ChatMessage,
  type RealtimeChannel,
  type UserPresence,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';

interface UseChatSessionPresenceSubscriptionsProps {
  isOpen: boolean;
  user: UserDetails | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  applyReceiptUpdate: (message: Partial<ChatMessage> & { id: string }) => void;
  updateUserChatOpen: () => Promise<void>;
  setTargetUserPresence: Dispatch<SetStateAction<UserPresence | null>>;
  globalPresenceChannelRef: MutableRefObject<RealtimeChannel | null>;
  activeTargetUserIdRef: MutableRefObject<string | null>;
  activePresenceScopeRef: MutableRefObject<string | null>;
  hasClosedChatRef: MutableRefObject<boolean>;
  hasHandledPageExitRef: MutableRefObject<boolean>;
  isClosingRef: MutableRefObject<boolean>;
}

export const useChatSessionPresenceSubscriptions = ({
  isOpen,
  user,
  targetUser,
  currentChannelId,
  applyReceiptUpdate,
  updateUserChatOpen,
  setTargetUserPresence,
  globalPresenceChannelRef,
  activeTargetUserIdRef,
  activePresenceScopeRef,
  hasClosedChatRef,
  hasHandledPageExitRef,
  isClosingRef,
}: UseChatSessionPresenceSubscriptionsProps) => {
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceHeartbeatIntervalRef = useRef<number | null>(null);

  const broadcastReceiptUpdate = useCallback(
    (message: ChatMessage) => {
      if (!globalPresenceChannelRef.current) return;

      void globalPresenceChannelRef.current.send({
        type: 'broadcast',
        event: 'message_receipt_updated',
        payload: message,
      });
    },
    [globalPresenceChannelRef]
  );

  useEffect(() => {
    activeTargetUserIdRef.current = targetUser?.id ?? null;
  }, [activeTargetUserIdRef, targetUser?.id]);

  useEffect(() => {
    activePresenceScopeRef.current =
      targetUser?.id && currentChannelId
        ? `${targetUser.id}::${currentChannelId}`
        : null;
  }, [activePresenceScopeRef, currentChannelId, targetUser?.id]);

  useEffect(() => {
    if (!isOpen || !user || !targetUser || !currentChannelId) {
      activePresenceScopeRef.current = null;
      setTargetUserPresence(null);
      return;
    }

    const presenceScopeKey = `${targetUser.id}::${currentChannelId}`;

    const loadTargetUserPresence = async () => {
      try {
        const { data: presence, error } =
          await chatSidebarGateway.getUserPresence(targetUser.id);

        if (activePresenceScopeRef.current !== presenceScopeKey) {
          return;
        }

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading target user presence:', error);
          return;
        }

        setTargetUserPresence(presence ?? null);
      } catch (error) {
        if (activePresenceScopeRef.current !== presenceScopeKey) {
          return;
        }

        console.error('Caught error loading target user presence:', error);
        setTargetUserPresence(null);
      }
    };

    if (presenceChannelRef.current) {
      void chatSidebarGateway.removeRealtimeChannel(presenceChannelRef.current);
    }

    const presenceChannel = chatSidebarGateway.createRealtimeChannel(
      'user_presence_changes',
      {
        config: {
          broadcast: { self: false },
        },
      }
    );

    presenceChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_presence',
        filter: `user_id=eq.${targetUser.id}`,
      },
      payload => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          setTargetUserPresence(payload.new as UserPresence);
        }
      }
    );

    presenceChannel.subscribe();
    presenceChannelRef.current = presenceChannel;

    hasClosedChatRef.current = false;
    hasHandledPageExitRef.current = false;
    isClosingRef.current = false;
    activePresenceScopeRef.current = presenceScopeKey;
    setTargetUserPresence(null);
    void updateUserChatOpen();
    void loadTargetUserPresence();

    presenceHeartbeatIntervalRef.current = window.setInterval(() => {
      void updateUserChatOpen();
    }, 30000);

    return () => {
      if (presenceChannelRef.current) {
        void chatSidebarGateway.removeRealtimeChannel(
          presenceChannelRef.current
        );
        presenceChannelRef.current = null;
      }
      if (presenceHeartbeatIntervalRef.current !== null) {
        window.clearInterval(presenceHeartbeatIntervalRef.current);
        presenceHeartbeatIntervalRef.current = null;
      }
      if (activePresenceScopeRef.current === presenceScopeKey) {
        activePresenceScopeRef.current = null;
      }
    };
  }, [
    activePresenceScopeRef,
    currentChannelId,
    hasClosedChatRef,
    hasHandledPageExitRef,
    isClosingRef,
    isOpen,
    setTargetUserPresence,
    targetUser,
    updateUserChatOpen,
    user,
  ]);

  useEffect(() => {
    if (!isOpen || !user) {
      return;
    }

    if (globalPresenceChannelRef.current) {
      void chatSidebarGateway.removeRealtimeChannel(
        globalPresenceChannelRef.current
      );
    }

    const globalPresenceChannel = chatSidebarGateway.createRealtimeChannel(
      'global_presence_updates',
      {
        config: {
          broadcast: { self: true },
        },
      }
    );

    globalPresenceChannel.on(
      'broadcast',
      { event: 'presence_changed' },
      payload => {
        const presenceUpdate = payload.payload as Partial<UserPresence>;
        if (presenceUpdate.user_id !== activeTargetUserIdRef.current) {
          return;
        }

        setTargetUserPresence(previousPresence =>
          previousPresence
            ? { ...previousPresence, ...presenceUpdate }
            : {
                user_id: presenceUpdate.user_id!,
                is_online: presenceUpdate.is_online || false,
                last_seen: presenceUpdate.last_seen || new Date().toISOString(),
                current_chat_channel:
                  presenceUpdate.current_chat_channel || null,
              }
        );
      }
    );

    globalPresenceChannel.on(
      'broadcast',
      { event: 'message_receipt_updated' },
      payload => {
        const updatedMessage = payload.payload as Partial<ChatMessage>;
        if (!updatedMessage?.id) return;
        applyReceiptUpdate(
          updatedMessage as Partial<ChatMessage> & { id: string }
        );
      }
    );

    globalPresenceChannel.subscribe();
    globalPresenceChannelRef.current = globalPresenceChannel;

    return () => {
      if (globalPresenceChannelRef.current) {
        void chatSidebarGateway.removeRealtimeChannel(
          globalPresenceChannelRef.current
        );
        globalPresenceChannelRef.current = null;
      }
    };
  }, [
    activeTargetUserIdRef,
    applyReceiptUpdate,
    globalPresenceChannelRef,
    isOpen,
    setTargetUserPresence,
    user,
  ]);

  return {
    broadcastReceiptUpdate,
  };
};
