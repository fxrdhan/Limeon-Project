import { useCallback, useEffect, useRef } from 'react';
import { chatPresenceService } from '@/services/api/chat.service';
import { usePresenceStore } from '@/store/presenceStore';
import { PRESENCE_HEARTBEAT_MS } from './presenceStatus';

interface UsePresenceLifecycleProps {
  userId?: string | null;
  accessToken?: string | null;
}

export const usePresenceLifecycle = ({
  userId,
  accessToken,
}: UsePresenceLifecycleProps) => {
  const setPresenceSyncHealth = usePresenceStore(
    state => state.setPresenceSyncHealth
  );
  const sessionTokenRef = useRef<string | null>(accessToken ?? null);
  const hasHandledPageExitRef = useRef(false);

  const syncPresenceOnlineState = useCallback(
    async (isOnline: boolean) => {
      if (!userId) {
        return false;
      }

      const result = await chatPresenceService.syncUserPresenceOnlineState(
        userId,
        isOnline
      );
      setPresenceSyncHealth({
        status: result.ok ? 'healthy' : 'degraded',
        errorMessage: result.errorMessage,
        lastSyncedAt: result.ok ? new Date().toISOString() : null,
      });

      return result.ok;
    },
    [setPresenceSyncHealth, userId]
  );

  useEffect(() => {
    sessionTokenRef.current = accessToken ?? null;
  }, [accessToken]);

  useEffect(() => {
    if (!userId) {
      hasHandledPageExitRef.current = false;
      setPresenceSyncHealth({
        status: 'idle',
        errorMessage: null,
        lastSyncedAt: null,
      });
      return;
    }

    hasHandledPageExitRef.current = false;
    void syncPresenceOnlineState(true);

    const handleVisibilityChange = () => {
      if (!userId || document.visibilityState !== 'visible') {
        return;
      }

      hasHandledPageExitRef.current = false;
      void syncPresenceOnlineState(true);
    };

    const handlePageExit = () => {
      if (!userId || hasHandledPageExitRef.current) {
        return;
      }

      hasHandledPageExitRef.current = true;
      const eventTimestamp = new Date().toISOString();

      chatPresenceService.syncUserPresenceOnPageExit(
        userId,
        sessionTokenRef.current,
        eventTimestamp
      );
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        handlePageExit();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handlePageExit);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('unload', handlePageExit);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handlePageExit);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('unload', handlePageExit);
    };
  }, [setPresenceSyncHealth, syncPresenceOnlineState, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const heartbeat = setInterval(() => {
      void syncPresenceOnlineState(true);
    }, PRESENCE_HEARTBEAT_MS);

    return () => clearInterval(heartbeat);
  }, [syncPresenceOnlineState, userId]);
};
