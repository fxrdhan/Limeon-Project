import type { UserDetails } from '@/types/database';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import {
  chatSidebarGateway,
  type ChatMessage,
  type RealtimeChannel,
  type UserPresence,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';

interface UpdateUserChatCloseOptions {
  keepOnline: boolean;
  timestamp?: string;
}

interface UseChatSessionPresenceProps {
  isOpen: boolean;
  user: UserDetails | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  globalPresenceChannelRef: MutableRefObject<RealtimeChannel | null>;
  applyReceiptUpdate: (message: Partial<ChatMessage> & { id: string }) => void;
}

export const useChatSessionPresence = ({
  isOpen,
  user,
  targetUser,
  currentChannelId,
  globalPresenceChannelRef,
  applyReceiptUpdate,
}: UseChatSessionPresenceProps) => {
  const [targetUserPresence, setTargetUserPresence] =
    useState<UserPresence | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasClosedRef = useRef(false);
  const previousIsOpenRef = useRef(isOpen);
  const activeTargetUserIdRef = useRef<string | null>(targetUser?.id ?? null);

  useEffect(() => {
    activeTargetUserIdRef.current = targetUser?.id ?? null;
  }, [targetUser?.id]);

  const updateUserChatClose = useCallback(
    async ({ keepOnline, timestamp }: UpdateUserChatCloseOptions) => {
      if (!user) return;

      const eventTimestamp = timestamp ?? new Date().toISOString();

      try {
        const { error } = await chatSidebarGateway.updateUserPresence(user.id, {
          is_online: keepOnline,
          current_chat_channel: null,
          last_seen: eventTimestamp,
          updated_at: eventTimestamp,
        });

        if (error) {
          console.error('Error updating user chat close:', error);
        }
      } catch (error) {
        console.error('Caught error updating user chat close:', error);
      }
    },
    [user]
  );

  const performClose = useCallback(async () => {
    if (!user || hasClosedRef.current) {
      return;
    }

    const eventTimestamp = new Date().toISOString();
    hasClosedRef.current = true;

    if (globalPresenceChannelRef.current) {
      void globalPresenceChannelRef.current.send({
        type: 'broadcast',
        event: 'presence_changed',
        payload: {
          user_id: user.id,
          is_online: true,
          current_chat_channel: null,
          last_seen: eventTimestamp,
        },
      });
    }

    try {
      await updateUserChatClose({
        keepOnline: true,
        timestamp: eventTimestamp,
      });
    } catch (error) {
      console.error('Database update failed:', error);
    }
  }, [globalPresenceChannelRef, updateUserChatClose, user]);

  const updateUserChatOpen = useCallback(async () => {
    if (!user || !currentChannelId) {
      return;
    }

    try {
      const eventTimestamp = new Date().toISOString();
      const { data: updateData, error: updateError } =
        await chatSidebarGateway.updateUserPresence(user.id, {
          is_online: true,
          current_chat_channel: currentChannelId,
          last_seen: eventTimestamp,
          updated_at: eventTimestamp,
        });

      if (updateError || !updateData || updateData.length === 0) {
        const { error: insertError } =
          await chatSidebarGateway.insertUserPresence({
            user_id: user.id,
            is_online: true,
            current_chat_channel: currentChannelId,
            last_seen: eventTimestamp,
            updated_at: eventTimestamp,
          });

        if (insertError) {
          console.error('Error inserting user presence:', insertError);
        }
        return;
      }

      if (!globalPresenceChannelRef.current) {
        return;
      }

      const updatedPresence = updateData[0];
      void globalPresenceChannelRef.current.send({
        type: 'broadcast',
        event: 'presence_changed',
        payload: {
          user_id: user.id,
          is_online: true,
          current_chat_channel: currentChannelId,
          last_seen: updatedPresence.last_seen,
        },
      });
    } catch (error) {
      console.error('Caught error updating user chat open:', error);
    }
  }, [currentChannelId, globalPresenceChannelRef, user]);

  useEffect(() => {
    const previousIsOpen = previousIsOpenRef.current;
    previousIsOpenRef.current = isOpen;

    if (previousIsOpen && !isOpen && user && !hasClosedRef.current) {
      void performClose();
    }
  }, [isOpen, performClose, user]);

  useEffect(() => {
    if (!isOpen || !user || !targetUser || !currentChannelId) {
      setTargetUserPresence(null);
      return;
    }

    const loadTargetUserPresence = async () => {
      try {
        const { data: presence, error } =
          await chatSidebarGateway.getUserPresence(targetUser.id);

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading target user presence:', error);
          return;
        }

        setTargetUserPresence(presence ?? null);
      } catch (error) {
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

    hasClosedRef.current = false;
    setTargetUserPresence(null);
    void updateUserChatOpen();
    void loadTargetUserPresence();

    presenceRefreshIntervalRef.current = setInterval(() => {
      void updateUserChatOpen();
      void loadTargetUserPresence();
    }, 30000);

    return () => {
      if (presenceChannelRef.current) {
        void chatSidebarGateway.removeRealtimeChannel(
          presenceChannelRef.current
        );
        presenceChannelRef.current = null;
      }
      if (presenceRefreshIntervalRef.current) {
        clearInterval(presenceRefreshIntervalRef.current);
        presenceRefreshIntervalRef.current = null;
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
      if (!hasClosedRef.current && user) {
        void performClose();
      }
    };
  }, [performClose, user]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!hasClosedRef.current && user) {
        hasClosedRef.current = true;
        void updateUserChatClose({ keepOnline: false });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [updateUserChatClose, user]);

  return {
    targetUserPresence,
    performClose,
  };
};
