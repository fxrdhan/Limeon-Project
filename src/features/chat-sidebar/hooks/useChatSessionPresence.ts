import type { UserDetails } from '@/types/database';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type ChatMessage,
  type RealtimeChannel,
  type UserPresence,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { useChatPresenceSync } from './useChatPresenceSync';
import { useChatSessionPageExit } from './useChatSessionPageExit';
import { useChatSessionPresenceSubscriptions } from './useChatSessionPresenceSubscriptions';

interface UseChatSessionPresenceProps {
  isOpen: boolean;
  user: UserDetails | null;
  accessToken?: string | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  applyReceiptUpdate: (message: Partial<ChatMessage> & { id: string }) => void;
}

export const useChatSessionPresence = ({
  isOpen,
  user,
  accessToken,
  targetUser,
  currentChannelId,
  applyReceiptUpdate,
}: UseChatSessionPresenceProps) => {
  const [targetUserPresence, setTargetUserPresence] =
    useState<UserPresence | null>(null);
  const globalPresenceChannelRef = useRef<RealtimeChannel | null>(null);
  const hasClosedChatRef = useRef(false);
  const hasHandledPageExitRef = useRef(false);
  const isClosingRef = useRef(false);
  const previousIsOpenRef = useRef(isOpen);
  const activeTargetUserIdRef = useRef<string | null>(targetUser?.id ?? null);
  const activePresenceScopeRef = useRef<string | null>(
    targetUser?.id && currentChannelId
      ? `${targetUser.id}::${currentChannelId}`
      : null
  );

  const { buildPresenceStatePayload, syncPresenceState } = useChatPresenceSync({
    user,
  });

  const performClose = useCallback(async () => {
    if (!user || hasClosedChatRef.current || isClosingRef.current) {
      return false;
    }

    const eventTimestamp = new Date().toISOString();
    isClosingRef.current = true;

    try {
      const didSync = await syncPresenceState({
        keepOnline: true,
        shouldBroadcast: true,
        broadcastChannel: globalPresenceChannelRef.current,
        timestamp: eventTimestamp,
      });
      if (didSync) {
        hasClosedChatRef.current = true;
      }
      return didSync;
    } catch (error) {
      console.error('Presence close sync failed:', error);
      return false;
    } finally {
      isClosingRef.current = false;
    }
  }, [syncPresenceState, user]);

  const updateUserChatOpen = useCallback(async () => {
    if (!user || !currentChannelId) {
      return;
    }

    try {
      await syncPresenceState({
        keepOnline: true,
        shouldBroadcast: true,
        broadcastChannel: globalPresenceChannelRef.current,
      });
    } catch (error) {
      console.error('Caught error updating user chat open:', error);
    }
  }, [currentChannelId, syncPresenceState, user]);

  const { broadcastReceiptUpdate } = useChatSessionPresenceSubscriptions({
    isOpen,
    user,
    targetUser,
    currentChannelId,
    applyReceiptUpdate,
    updateUserChatOpen,
    setTargetUserPresence,
    globalPresenceChannelRef,
    activeTargetUserIdRef,
    activePresenceScopeRef,
    hasClosedChatRef,
    hasHandledPageExitRef,
    isClosingRef,
  });

  useEffect(() => {
    const previousIsOpen = previousIsOpenRef.current;
    previousIsOpenRef.current = isOpen;

    if (previousIsOpen && !isOpen && user && !hasClosedChatRef.current) {
      void performClose();
    }
  }, [isOpen, performClose, user]);

  useChatSessionPageExit({
    user,
    accessToken,
    performClose,
    buildPresenceStatePayload,
    syncPresenceState,
    hasClosedChatRef,
    hasHandledPageExitRef,
  });

  return {
    broadcastReceiptUpdate,
    targetUserPresence,
    performClose,
  };
};
