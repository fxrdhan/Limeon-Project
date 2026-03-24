import type { UserDetails } from '@/types/database';
import { usePresenceStore } from '@/store/presenceStore';
import {
  PRESENCE_HEARTBEAT_MS,
  getPresenceFreshnessRemainingMs,
  isPresenceFresh,
} from '@/hooks/presence/presenceStatus';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { UserPresence } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { loadTargetPresenceSnapshot } from '../utils/target-presence';

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
  const presenceSyncHealth = usePresenceStore(
    state => state.presenceSyncHealth
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
  const [, setPresenceFreshnessTick] = useState(0);

  const loadTargetUserPresenceSnapshot = useCallback(async () => {
    if (!isOpen || !user || !targetUser || !currentChannelId) {
      setTargetUserPresence(null);
      setTargetUserPresenceError(null);
      return;
    }

    const requestId = targetPresenceRequestIdRef.current + 1;
    targetPresenceRequestIdRef.current = requestId;
    setTargetUserPresenceError(null);

    if (targetPresenceRequestIdRef.current !== requestId) {
      return;
    }
    const { presence, errorMessage } = await loadTargetPresenceSnapshot(
      targetUser.id,
      'Error loading target user presence'
    );

    if (targetPresenceRequestIdRef.current !== requestId) {
      return;
    }

    setTargetUserPresence(presence);
    setTargetUserPresenceError(errorMessage);
  }, [currentChannelId, isOpen, targetUser, user]);

  useEffect(() => {
    void loadTargetUserPresenceSnapshot();
  }, [loadTargetUserPresenceSnapshot]);

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

  useEffect(() => {
    if (!isOpen || targetUserPresence?.is_online !== true) {
      return;
    }

    const remainingFreshnessMs = getPresenceFreshnessRemainingMs(
      targetUserPresence.last_seen
    );
    if (remainingFreshnessMs === null || remainingFreshnessMs <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPresenceFreshnessTick(previousTick => previousTick + 1);
    }, remainingFreshnessMs + 32);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, targetUserPresence]);

  useEffect(() => {
    const shouldPollTargetPresenceSnapshot =
      isOpen &&
      Boolean(user && targetUser && currentChannelId) &&
      (!hasPresenceRosterChannel || presenceSyncHealth.status === 'degraded');

    if (!shouldPollTargetPresenceSnapshot) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadTargetUserPresenceSnapshot();
    }, PRESENCE_HEARTBEAT_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    currentChannelId,
    hasPresenceRosterChannel,
    isOpen,
    loadTargetUserPresenceSnapshot,
    presenceSyncHealth.status,
    targetUser,
    user,
  ]);

  const isTargetOnline =
    isOpen && targetUser
      ? (() => {
          const hasFreshPresenceSnapshot =
            targetUserPresence?.is_online === true &&
            isPresenceFresh(targetUserPresence.last_seen);

          // Browser-active presence remains the primary signal, but a fresh
          // persisted snapshot covers temporary roster gaps while recovery happens.
          if (hasPresenceRosterChannel) {
            return isTargetOnlineInRoster || hasFreshPresenceSnapshot;
          }

          return hasFreshPresenceSnapshot;
        })()
      : false;

  const resolvedTargetUserPresenceError =
    targetUserPresenceError ??
    (presenceSyncHealth.status === 'degraded' &&
    !isTargetOnline &&
    !targetUserPresence?.last_seen
      ? 'Status presence mungkin terlambat'
      : null);

  return {
    isTargetOnline,
    targetUserPresence,
    targetUserPresenceError: resolvedTargetUserPresenceError,
  };
};
