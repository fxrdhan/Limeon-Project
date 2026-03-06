import {
  SEARCH_STATES,
  type SearchState,
} from '@/components/search-bar/constants';
import type { ChatMessage } from '@/services/api/chat.service';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import type { ChatSidebarPanelTargetUser } from '../types';
import {
  getAttachmentCaptionData,
  getSearchMatchedMessageIds,
  getSelectableMessageIdSet,
  getSelectedVisibleMessages,
  serializeSelectedMessages,
} from '../utils/message-derivations';

interface UseChatInteractionModesProps {
  isOpen: boolean;
  currentChannelId: string | null;
  messages: ChatMessage[];
  user?: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  closeMessageMenu: () => void;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
}

export const useChatInteractionModes = ({
  isOpen,
  currentChannelId,
  messages,
  user,
  targetUser,
  closeMessageMenu,
  getAttachmentFileName,
}: UseChatInteractionModesProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isMessageSearchMode, setIsMessageSearchMode] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [activeSearchMessageId, setActiveSearchMessageId] = useState<
    string | null
  >(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
    () => new Set()
  );
  const [searchNavigationTick, setSearchNavigationTick] = useState(0);
  const normalizedMessageSearchQuery = messageSearchQuery.trim().toLowerCase();

  const { captionMessagesByAttachmentId, captionMessageIds } = useMemo(
    () => getAttachmentCaptionData(messages),
    [messages]
  );
  const searchMatchedMessageIds = useMemo(
    () =>
      getSearchMatchedMessageIds(messages, normalizedMessageSearchQuery, {
        captionMessagesByAttachmentId,
        captionMessageIds,
      }),
    [
      captionMessageIds,
      captionMessagesByAttachmentId,
      messages,
      normalizedMessageSearchQuery,
    ]
  );
  const searchMatchedMessageIdSet = useMemo(
    () => new Set(searchMatchedMessageIds),
    [searchMatchedMessageIds]
  );
  const activeSearchResultIndex = searchMatchedMessageIds.findIndex(
    messageId => messageId === activeSearchMessageId
  );
  const canNavigateSearchUp = activeSearchResultIndex > 0;
  const canNavigateSearchDown =
    activeSearchResultIndex >= 0 &&
    activeSearchResultIndex < searchMatchedMessageIds.length - 1;
  const messageSearchState: SearchState = !normalizedMessageSearchQuery
    ? SEARCH_STATES.IDLE
    : searchMatchedMessageIds.length > 0
      ? SEARCH_STATES.FOUND
      : SEARCH_STATES.NOT_FOUND;
  const selectableMessageIdSet = useMemo(
    () => getSelectableMessageIdSet(messages, captionMessageIds),
    [captionMessageIds, messages]
  );
  const selectedVisibleMessages = useMemo(
    () =>
      getSelectedVisibleMessages(
        messages,
        captionMessageIds,
        selectedMessageIds
      ),
    [captionMessageIds, messages, selectedMessageIds]
  );
  const canDeleteSelectedMessages = useMemo(() => {
    if (!user) return false;
    return selectedVisibleMessages.some(
      messageItem => messageItem.sender_id === user.id
    );
  }, [selectedVisibleMessages, user]);

  useEffect(() => {
    if (isOpen) return;
    setIsMessageSearchMode(false);
    setMessageSearchQuery('');
    setActiveSearchMessageId(null);
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
  }, [isOpen]);

  useEffect(() => {
    setIsMessageSearchMode(false);
    setMessageSearchQuery('');
    setActiveSearchMessageId(null);
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
  }, [currentChannelId]);

  useEffect(() => {
    setSelectedMessageIds(previousSelectedIds => {
      let changed = false;
      const nextSelectedIds = new Set<string>();
      previousSelectedIds.forEach(messageId => {
        if (selectableMessageIdSet.has(messageId)) {
          nextSelectedIds.add(messageId);
          return;
        }
        changed = true;
      });

      return changed ? nextSelectedIds : previousSelectedIds;
    });
  }, [selectableMessageIdSet]);

  useEffect(() => {
    if (!isMessageSearchMode) return;
    const rafId = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isMessageSearchMode]);

  const handleEnterMessageSearchMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
    setIsMessageSearchMode(true);
  }, []);

  const handleExitMessageSearchMode = useCallback(() => {
    setIsMessageSearchMode(false);
    setMessageSearchQuery('');
    setActiveSearchMessageId(null);
    setSearchNavigationTick(0);
  }, []);

  const handleEnterMessageSelectionMode = useCallback(() => {
    closeMessageMenu();
    setIsMessageSearchMode(false);
    setMessageSearchQuery('');
    setActiveSearchMessageId(null);
    setSearchNavigationTick(0);
    setSelectedMessageIds(new Set());
    setIsSelectionMode(true);
  }, [closeMessageMenu]);

  const handleExitMessageSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
  }, []);

  const handleToggleMessageSelection = useCallback(
    (messageId: string) => {
      if (!isSelectionMode || !selectableMessageIdSet.has(messageId)) return;
      setSelectedMessageIds(previousSelectedIds => {
        const nextSelectedIds = new Set(previousSelectedIds);
        if (nextSelectedIds.has(messageId)) {
          nextSelectedIds.delete(messageId);
        } else {
          nextSelectedIds.add(messageId);
        }
        return nextSelectedIds;
      });
    },
    [isSelectionMode, selectableMessageIdSet]
  );

  const handleFocusSearchInput = useCallback(() => {
    if (!isMessageSearchMode) return;
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [isMessageSearchMode]);

  const handleMessageSearchQueryChange = useCallback((nextQuery: string) => {
    setMessageSearchQuery(nextQuery);
  }, []);

  const navigateToSearchResult = useCallback(
    (direction: 'up' | 'down') => {
      if (searchMatchedMessageIds.length === 0) return;

      setActiveSearchMessageId(currentMessageId => {
        const currentIndex =
          currentMessageId === null
            ? -1
            : searchMatchedMessageIds.findIndex(
                messageId => messageId === currentMessageId
              );
        const fallbackIndex =
          direction === 'up' ? searchMatchedMessageIds.length - 1 : 0;
        const safeCurrentIndex =
          currentIndex >= 0 ? currentIndex : fallbackIndex;
        const nextIndex =
          direction === 'up'
            ? Math.max(0, safeCurrentIndex - 1)
            : Math.min(
                searchMatchedMessageIds.length - 1,
                safeCurrentIndex + 1
              );

        return searchMatchedMessageIds[nextIndex];
      });
      setSearchNavigationTick(previousTick => previousTick + 1);
    },
    [searchMatchedMessageIds]
  );

  const handleNavigateSearchUp = useCallback(() => {
    navigateToSearchResult('up');
  }, [navigateToSearchResult]);

  const handleNavigateSearchDown = useCallback(() => {
    navigateToSearchResult('down');
  }, [navigateToSearchResult]);

  useEffect(() => {
    if (
      !isMessageSearchMode ||
      !normalizedMessageSearchQuery ||
      searchMatchedMessageIds.length === 0
    ) {
      setActiveSearchMessageId(null);
      return;
    }

    setActiveSearchMessageId(currentMessageId => {
      if (
        currentMessageId &&
        searchMatchedMessageIds.includes(currentMessageId)
      ) {
        return currentMessageId;
      }

      return searchMatchedMessageIds[0];
    });
  }, [
    isMessageSearchMode,
    normalizedMessageSearchQuery,
    searchMatchedMessageIds,
  ]);

  const handleCopySelectedMessages = useCallback(async () => {
    if (selectedVisibleMessages.length === 0) {
      toast.error('Pilih minimal 1 pesan untuk disalin', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    const serializedMessages = serializeSelectedMessages(
      selectedVisibleMessages,
      {
        captionMessagesByAttachmentId,
        currentUser: user,
        targetUser,
        getAttachmentFileName,
      }
    );

    if (!serializedMessages) {
      toast.error('Tidak ada isi pesan untuk disalin', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(serializedMessages);
      toast.success(
        `${selectedVisibleMessages.length} pesan berhasil disalin`,
        {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        }
      );
    } catch (error) {
      console.error('Error copying selected messages:', error);
      toast.error('Gagal menyalin pesan terpilih', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
    }
  }, [
    captionMessagesByAttachmentId,
    getAttachmentFileName,
    selectedVisibleMessages,
    targetUser,
    user,
  ]);

  return {
    searchInputRef,
    isMessageSearchMode,
    messageSearchQuery,
    activeSearchMessageId,
    isSelectionMode,
    selectedMessageIds,
    searchNavigationTick,
    normalizedMessageSearchQuery,
    captionMessagesByAttachmentId,
    captionMessageIds,
    searchMatchedMessageIds,
    searchMatchedMessageIdSet,
    activeSearchResultIndex,
    canNavigateSearchUp,
    canNavigateSearchDown,
    messageSearchState,
    selectableMessageIdSet,
    selectedVisibleMessages,
    canDeleteSelectedMessages,
    setActiveSearchMessageId,
    setIsSelectionMode,
    setSelectedMessageIds,
    handleEnterMessageSearchMode,
    handleExitMessageSearchMode,
    handleEnterMessageSelectionMode,
    handleExitMessageSelectionMode,
    handleToggleMessageSelection,
    handleFocusSearchInput,
    handleMessageSearchQueryChange,
    handleNavigateSearchUp,
    handleNavigateSearchDown,
    handleCopySelectedMessages,
  };
};
