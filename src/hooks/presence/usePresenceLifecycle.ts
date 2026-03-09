import { chatService } from '@/services/api/chat.service';
import { useEffect, useRef } from 'react';
import { PRESENCE_HEARTBEAT_MS } from './presenceStatus';

interface PresenceLifecycleUser {
  id: string;
}

interface UsePresenceLifecycleProps {
  user: PresenceLifecycleUser | null;
  accessToken?: string | null;
  syncUserPresenceState: (
    keepOnline: boolean,
    timestamp?: string
  ) => Promise<boolean>;
}

export const usePresenceLifecycle = ({
  user,
  accessToken,
  syncUserPresenceState,
}: UsePresenceLifecycleProps) => {
  const sessionTokenRef = useRef<string | null>(accessToken ?? null);
  const hasHandledPageExitRef = useRef(false);

  useEffect(() => {
    sessionTokenRef.current = accessToken ?? null;
  }, [accessToken]);

  useEffect(() => {
    if (!user) {
      hasHandledPageExitRef.current = false;
      return;
    }

    hasHandledPageExitRef.current = false;
    void syncUserPresenceState(true);

    const handleVisibilityChange = () => {
      if (!user || document.visibilityState !== 'visible') {
        return;
      }

      hasHandledPageExitRef.current = false;
      void syncUserPresenceState(true);
    };

    const handlePageExit = () => {
      if (!user || hasHandledPageExitRef.current) {
        return;
      }

      hasHandledPageExitRef.current = true;
      const eventTimestamp = new Date().toISOString();

      chatService.sendUserPresenceUpdateKeepalive(
        user.id,
        {
          is_online: false,
          last_seen: eventTimestamp,
          updated_at: eventTimestamp,
        },
        sessionTokenRef.current
      );

      void syncUserPresenceState(false, eventTimestamp);
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
  }, [syncUserPresenceState, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const heartbeat = setInterval(() => {
      void syncUserPresenceState(true);
    }, PRESENCE_HEARTBEAT_MS);

    return () => clearInterval(heartbeat);
  }, [syncUserPresenceState, user]);
};
