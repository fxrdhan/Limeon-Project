import { useRealtimeChannelRecovery } from '@/hooks/realtime/useRealtimeChannelRecovery';
import type { UserDetails } from '@/types/database';
import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import {
  chatSidebarGateway,
  type RealtimeChannel,
  type UserPresence,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { loadTargetPresenceSnapshot } from '../utils/target-presence';

interface UseChatSessionPresenceSubscriptionsProps {
  enabled?: boolean;
  isOpen: boolean;
  user: UserDetails | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  setTargetUserPresence: Dispatch<SetStateAction<UserPresence | null>>;
  setTargetUserPresenceError: Dispatch<SetStateAction<string | null>>;
}

export const useChatSessionPresenceSubscriptions = ({
  enabled = true,
  isOpen,
  user,
  targetUser,
  currentChannelId,
  setTargetUserPresence,
  setTargetUserPresenceError,
}: UseChatSessionPresenceSubscriptionsProps) => {
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const activePresenceScopeRef = useRef<string | null>(null);
  const { recoveryTick, scheduleRecovery, markRecoverySuccess } =
    useRealtimeChannelRecovery();

  useEffect(() => {
    if (!isOpen || !user || !targetUser || !currentChannelId) {
      markRecoverySuccess();
      activePresenceScopeRef.current =
        targetUser?.id && currentChannelId
          ? `${targetUser.id}::${currentChannelId}`
          : null;
      setTargetUserPresence(null);
      setTargetUserPresenceError(null);
      return;
    }

    if (!enabled) {
      markRecoverySuccess();
      activePresenceScopeRef.current = `${targetUser.id}::${currentChannelId}`;
      setTargetUserPresenceError(null);
      return;
    }

    const presenceScopeKey = `${targetUser.id}::${currentChannelId}`;
    activePresenceScopeRef.current = presenceScopeKey;

    const loadTargetUserPresence = async () => {
      setTargetUserPresenceError(null);

      const { presence, errorMessage } = await loadTargetPresenceSnapshot(
        targetUser.id,
        'Error loading target user presence'
      );

      if (activePresenceScopeRef.current !== presenceScopeKey) {
        return;
      }

      setTargetUserPresence(presence);
      setTargetUserPresenceError(errorMessage);
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
          setTargetUserPresenceError(null);
          setTargetUserPresence(payload.new as UserPresence);
          return;
        }

        if (payload.eventType === 'DELETE') {
          setTargetUserPresenceError(null);
          setTargetUserPresence(null);
        }
      }
    );

    presenceChannel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        markRecoverySuccess();
        return;
      }

      if (status === 'CHANNEL_ERROR') {
        console.error('Failed to connect to target user presence channel');
        if (presenceChannelRef.current === presenceChannel) {
          presenceChannelRef.current = null;
          void chatSidebarGateway.removeRealtimeChannel(presenceChannel);
        }
        if (activePresenceScopeRef.current === presenceScopeKey) {
          setTargetUserPresenceError('Status online tidak tersedia');
        }
        void scheduleRecovery();
        return;
      }

      if (status === 'TIMED_OUT') {
        console.error('Timed out while connecting to target user presence');
        if (presenceChannelRef.current === presenceChannel) {
          presenceChannelRef.current = null;
          void chatSidebarGateway.removeRealtimeChannel(presenceChannel);
        }
        if (activePresenceScopeRef.current === presenceScopeKey) {
          setTargetUserPresenceError('Status online tidak tersedia');
        }
        void scheduleRecovery();
      }
    });
    presenceChannelRef.current = presenceChannel;

    setTargetUserPresence(null);
    void loadTargetUserPresence();

    return () => {
      if (presenceChannelRef.current) {
        void chatSidebarGateway.removeRealtimeChannel(
          presenceChannelRef.current
        );
        presenceChannelRef.current = null;
      }
      if (activePresenceScopeRef.current === presenceScopeKey) {
        activePresenceScopeRef.current = null;
      }
    };
  }, [
    currentChannelId,
    enabled,
    isOpen,
    markRecoverySuccess,
    recoveryTick,
    scheduleRecovery,
    setTargetUserPresenceError,
    setTargetUserPresence,
    targetUser,
    user,
  ]);
};
