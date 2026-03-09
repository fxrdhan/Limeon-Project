import type { UserDetails } from '@/types/database';
import { usePresenceStore } from '@/store/presenceStore';
import { isPresenceFresh } from '@/hooks/presence/presenceStatus';
import { useMemo, useState } from 'react';
import { type UserPresence } from '../data/chatSidebarGateway';
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

  useChatSessionPresenceSubscriptions({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    setTargetUserPresence,
    setTargetUserPresenceError,
  });

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
