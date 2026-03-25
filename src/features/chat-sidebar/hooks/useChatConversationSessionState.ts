import { useCallback, useMemo, useRef, type MutableRefObject } from 'react';
import { type ChatMessage } from '../data/chatSidebarGateway';

export type PendingConversationRealtimeEvent =
  | {
      type: 'insert';
      message: ChatMessage;
    }
  | {
      type: 'update';
      message: Partial<ChatMessage> & { id: string };
    }
  | {
      type: 'delete';
      messageId: string;
    };

export interface ChatConversationSessionState {
  hasCompletedInitialOpenLoadRef: MutableRefObject<boolean>;
  activeSessionTokenRef: MutableRefObject<number>;
  oldestLoadedMessageCreatedAtRef: MutableRefObject<string | null>;
  oldestLoadedMessageIdRef: MutableRefObject<string | null>;
  isInitialConversationLoadPendingRef: MutableRefObject<boolean>;
  pendingConversationRealtimeEventsRef: MutableRefObject<
    PendingConversationRealtimeEvent[]
  >;
  searchContextMessageIdsRef: MutableRefObject<Set<string>>;
  isSessionTokenActive: (sessionToken: number) => boolean;
  getActiveSessionToken: () => number;
}

export const useChatConversationSessionState =
  (): ChatConversationSessionState => {
    const hasCompletedInitialOpenLoadRef = useRef(false);
    const activeSessionTokenRef = useRef(0);
    const oldestLoadedMessageCreatedAtRef = useRef<string | null>(null);
    const oldestLoadedMessageIdRef = useRef<string | null>(null);
    const isInitialConversationLoadPendingRef = useRef(false);
    const pendingConversationRealtimeEventsRef = useRef<
      PendingConversationRealtimeEvent[]
    >([]);
    const searchContextMessageIdsRef = useRef<Set<string>>(new Set());

    const isSessionTokenActive = useCallback(
      (sessionToken: number) => activeSessionTokenRef.current === sessionToken,
      []
    );
    const getActiveSessionToken = useCallback(
      () => activeSessionTokenRef.current,
      []
    );

    return useMemo(
      () => ({
        hasCompletedInitialOpenLoadRef,
        activeSessionTokenRef,
        oldestLoadedMessageCreatedAtRef,
        oldestLoadedMessageIdRef,
        isInitialConversationLoadPendingRef,
        pendingConversationRealtimeEventsRef,
        searchContextMessageIdsRef,
        isSessionTokenActive,
        getActiveSessionToken,
      }),
      [getActiveSessionToken, isSessionTokenActive]
    );
  };
