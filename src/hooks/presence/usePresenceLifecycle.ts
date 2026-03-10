import { useEffect, useRef } from 'react';
import { chatPresenceService } from '@/services/api/chat.service';
import { PRESENCE_HEARTBEAT_MS } from './presenceStatus';

interface UsePresenceLifecycleProps {
  userId?: string | null;
  accessToken?: string | null;
}

export const usePresenceLifecycle = ({
  userId,
  accessToken,
}: UsePresenceLifecycleProps) => {
  const sessionTokenRef = useRef<string | null>(accessToken ?? null);
  const hasHandledPageExitRef = useRef(false);

  useEffect(() => {
    sessionTokenRef.current = accessToken ?? null;
  }, [accessToken]);

  useEffect(() => {
    if (!userId) {
      hasHandledPageExitRef.current = false;
      return;
    }

    hasHandledPageExitRef.current = false;
    void chatPresenceService.syncUserPresenceOnlineState(userId, true);

    const handleVisibilityChange = () => {
      if (!userId || document.visibilityState !== 'visible') {
        return;
      }

      hasHandledPageExitRef.current = false;
      void chatPresenceService.syncUserPresenceOnlineState(userId, true);
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
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const heartbeat = setInterval(() => {
      void chatPresenceService.syncUserPresenceOnlineState(userId, true);
    }, PRESENCE_HEARTBEAT_MS);

    return () => clearInterval(heartbeat);
  }, [userId]);
};
