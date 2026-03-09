import type { UserDetails } from '@/types/database';
import { useState } from 'react';
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

  useChatSessionPresenceSubscriptions({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    setTargetUserPresence,
    setTargetUserPresenceError,
  });

  return {
    targetUserPresence,
    targetUserPresenceError,
  };
};
