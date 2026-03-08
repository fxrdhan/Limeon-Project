import type { UserDetails } from '@/types/database';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  chatSidebarGateway,
  type ChatMessage,
  type RealtimeChannel,
  type UserPresence,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { useChatPresenceSync } from './useChatPresenceSync';

interface UseChatSessionPresenceProps {
  isOpen: boolean;
  user: UserDetails | null;
  accessToken?: string | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  applyReceiptUpdate: (message: Partial<ChatMessage> & { id: string }) => void;
}

export const useChatSessionPresence = ({
  isOpen,
  user,
  accessToken,
  targetUser,
  currentChannelId,
  applyReceiptUpdate,
}: UseChatSessionPresenceProps) => {
  const [targetUserPresence, setTargetUserPresence] =
    useState<UserPresence | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const globalPresenceChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceHeartbeatIntervalRef = useRef<number | null>(null);
  const hasClosedChatRef = useRef(false);
  const hasHandledPageExitRef = useRef(false);
  const isClosingRef = useRef(false);
  const previousIsOpenRef = useRef(isOpen);
  const activeTargetUserIdRef = useRef<string | null>(targetUser?.id ?? null);
  const activePresenceScopeRef = useRef<string | null>(
    targetUser?.id && currentChannelId
      ? `${targetUser.id}::${currentChannelId}`
      : null
  );

  useEffect(() => {
    activeTargetUserIdRef.current = targetUser?.id ?? null;
  }, [targetUser?.id]);

  useEffect(() => {
    activePresenceScopeRef.current =
      targetUser?.id && currentChannelId
        ? `${targetUser.id}::${currentChannelId}`
        : null;
  }, [currentChannelId, targetUser?.id]);

  const { buildPresenceStatePayload, syncPresenceState } = useChatPresenceSync({
    user,
  });

  const performClose = useCallback(async () => {
    if (!user || hasClosedChatRef.current || isClosingRef.current) {
      return false;
    }

    const eventTimestamp = new Date().toISOString();
    isClosingRef.current = true;

    try {
      const didSync = await syncPresenceState({
        keepOnline: true,
        currentChatChannel: null,
        shouldBroadcast: true,
        broadcastChannel: globalPresenceChannelRef.current,
        timestamp: eventTimestamp,
      });
      if (didSync) {
        hasClosedChatRef.current = true;
      }
      return didSync;
    } catch (error) {
      console.error('Presence close sync failed:', error);
      return false;
    } finally {
      isClosingRef.current = false;
    }
  }, [syncPresenceState, user]);

  const updateUserChatOpen = useCallback(async () => {
    if (!user || !currentChannelId) {
      return;
    }

    try {
      await syncPresenceState({
        keepOnline: true,
        currentChatChannel: currentChannelId,
        shouldBroadcast: true,
        broadcastChannel: globalPresenceChannelRef.current,
      });
    } catch (error) {
      console.error('Caught error updating user chat open:', error);
    }
  }, [currentChannelId, syncPresenceState, user]);

  const broadcastReceiptUpdate = useCallback((message: ChatMessage) => {
    if (!globalPresenceChannelRef.current) return;

    void globalPresenceChannelRef.current.send({
      type: 'broadcast',
      event: 'message_receipt_updated',
      payload: message,
    });
  }, []);

  useEffect(() => {
    const previousIsOpen = previousIsOpenRef.current;
    previousIsOpenRef.current = isOpen;

    if (previousIsOpen && !isOpen && user && !hasClosedChatRef.current) {
      void performClose();
    }
  }, [isOpen, performClose, user]);

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
  }, [currentChannelId, isOpen, targetUser, updateUserChatOpen, user]);

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
  }, [applyReceiptUpdate, globalPresenceChannelRef, isOpen, user]);

  useEffect(() => {
    return () => {
      if (!hasClosedChatRef.current && !hasHandledPageExitRef.current && user) {
        void performClose();
      }
    };
  }, [performClose, user]);

  useEffect(() => {
    const handlePageExit = () => {
      if (!hasHandledPageExitRef.current && user) {
        const eventTimestamp = new Date().toISOString();
        hasHandledPageExitRef.current = true;
        hasClosedChatRef.current = true;
        chatSidebarGateway.sendUserPresenceUpdateKeepalive(
          user.id,
          buildPresenceStatePayload({
            keepOnline: false,
            currentChatChannel: null,
            timestamp: eventTimestamp,
          }),
          accessToken
        );
        void syncPresenceState({
          keepOnline: false,
          currentChatChannel: null,
          shouldBroadcast: false,
          timestamp: eventTimestamp,
        });
      }
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) {
        return;
      }

      handlePageExit();
    };

    window.addEventListener('beforeunload', handlePageExit);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('beforeunload', handlePageExit);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [accessToken, buildPresenceStatePayload, syncPresenceState, user]);

  return {
    broadcastReceiptUpdate,
    targetUserPresence,
    performClose,
  };
};
