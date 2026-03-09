import type { UserDetails } from '@/types/database';
import { usePresenceStore } from '@/store/presenceStore';
import { isPresenceFresh } from '@/hooks/presence/presenceStatus';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  chatSidebarGateway,
  type UserPresence,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { useChatSessionPresenceSubscriptions } from './useChatSessionPresenceSubscriptions';

interface UseChatSessionPresenceProps {
  isOpen: boolean;
  user: UserDetails | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
}

export const useChatSessionPresence = ({
  isOpen,
  user,
  targetUser,
  currentChannelId,
}: UseChatSessionPresenceProps) => {
  const [targetUserPresence, setTargetUserPresence] =
    useState<UserPresence | null>(null);
  const [targetUserPresenceError, setTargetUserPresenceError] = useState<
    string | null
  >(null);
  const hasPresenceRosterChannel = usePresenceStore(
    state => state.channel !== null
  );
  const isTargetOnlineInRoster = usePresenceStore(state =>
    targetUser
      ? state.onlineUsersList.some(
          onlineUser => onlineUser.id === targetUser.id
        )
      : false
  );
  const targetPresenceRequestIdRef = useRef(0);
  const previousRosterOnlineRef = useRef<boolean | null>(null);

  const loadTargetUserPresenceSnapshot = useCallback(async () => {
    if (!isOpen || !user || !targetUser || !currentChannelId) {
      setTargetUserPresence(null);
      setTargetUserPresenceError(null);
      return;
    }

    const requestId = targetPresenceRequestIdRef.current + 1;
    targetPresenceRequestIdRef.current = requestId;
    setTargetUserPresenceError(null);

    try {
      const { data: presence, error } =
        await chatSidebarGateway.getUserPresence(targetUser.id);

      if (targetPresenceRequestIdRef.current !== requestId) {
        return;
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading target user presence:', error);
        setTargetUserPresenceError('Status online tidak tersedia');
        setTargetUserPresence(null);
        return;
      }

      setTargetUserPresence(presence ?? null);
    } catch (error) {
      if (targetPresenceRequestIdRef.current !== requestId) {
        return;
      }

      console.error('Caught error loading target user presence:', error);
      setTargetUserPresenceError('Status online tidak tersedia');
      setTargetUserPresence(null);
    }
  }, [currentChannelId, isOpen, targetUser, user]);

  useChatSessionPresenceSubscriptions({
    enabled: !hasPresenceRosterChannel,
    isOpen,
    user,
    targetUser,
    currentChannelId,
    setTargetUserPresence,
    setTargetUserPresenceError,
  });

  useEffect(() => {
    if (!hasPresenceRosterChannel) {
      return;
    }

    void loadTargetUserPresenceSnapshot();
  }, [hasPresenceRosterChannel, loadTargetUserPresenceSnapshot]);

  useEffect(() => {
    if (!hasPresenceRosterChannel || !isOpen || !targetUser) {
      previousRosterOnlineRef.current = isTargetOnlineInRoster;
      return;
    }

    const wasTargetOnline = previousRosterOnlineRef.current;
    previousRosterOnlineRef.current = isTargetOnlineInRoster;

    if (wasTargetOnline === true && !isTargetOnlineInRoster) {
      void loadTargetUserPresenceSnapshot();
    }
  }, [
    hasPresenceRosterChannel,
    isOpen,
    isTargetOnlineInRoster,
    loadTargetUserPresenceSnapshot,
    targetUser,
  ]);

  const isTargetOnline = useMemo(() => {
    if (!isOpen || !targetUser) {
      return false;
    }

    // Browser-active presence is the authoritative UI signal when available.
    if (hasPresenceRosterChannel) {
      return isTargetOnlineInRoster;
    }

    return (
      targetUserPresence?.is_online === true &&
      isPresenceFresh(targetUserPresence.last_seen)
    );
  }, [
    hasPresenceRosterChannel,
    isOpen,
    isTargetOnlineInRoster,
    targetUser,
    targetUserPresence,
  ]);

  return {
    isTargetOnline,
    targetUserPresence,
    targetUserPresenceError,
  };
};
