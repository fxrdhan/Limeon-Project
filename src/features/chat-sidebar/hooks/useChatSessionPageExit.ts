import type { UserDetails } from '@/types/database';
import { useEffect, type MutableRefObject } from 'react';
import type { UserPresenceUpdateInput } from '@/services/api/chat.service';
import { chatSidebarGateway } from '../data/chatSidebarGateway';

interface UseChatSessionPageExitProps {
  user: UserDetails | null;
  accessToken?: string | null;
  performClose: () => Promise<boolean>;
  buildPresenceStatePayload: (options: {
    keepOnline: boolean;
    currentChatChannel: string | null;
    timestamp?: string;
  }) => UserPresenceUpdateInput;
  syncPresenceState: (options: {
    keepOnline: boolean;
    currentChatChannel: string | null;
    shouldBroadcast: boolean;
    timestamp?: string;
  }) => Promise<boolean>;
  hasClosedChatRef: MutableRefObject<boolean>;
  hasHandledPageExitRef: MutableRefObject<boolean>;
}

export const useChatSessionPageExit = ({
  user,
  accessToken,
  performClose,
  buildPresenceStatePayload,
  syncPresenceState,
  hasClosedChatRef,
  hasHandledPageExitRef,
}: UseChatSessionPageExitProps) => {
  useEffect(() => {
    return () => {
      if (!hasClosedChatRef.current && !hasHandledPageExitRef.current && user) {
        void performClose();
      }
    };
  }, [hasClosedChatRef, hasHandledPageExitRef, performClose, user]);

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
  }, [
    accessToken,
    buildPresenceStatePayload,
    hasClosedChatRef,
    hasHandledPageExitRef,
    syncPresenceState,
    user,
  ]);
};
