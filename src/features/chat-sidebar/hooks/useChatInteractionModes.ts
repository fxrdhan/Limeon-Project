import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { RefObject } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import {
  getSelectableMessageIdSet,
  getSelectedVisibleMessages,
  serializeSelectedMessages,
  type AttachmentCaptionData,
} from '../utils/message-derivations';
import { useChatMessageSearchMode } from './useChatMessageSearchMode';

interface UseChatInteractionModesProps {
  isOpen: boolean;
  currentChannelId: string | null;
  messages: ChatMessage[];
  mergeSearchContextMessages: (searchContextMessages: ChatMessage[]) => void;
  user?: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  captionData: AttachmentCaptionData;
  closeMessageMenu: () => void;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  getAttachmentFileName: (targetMessage: ChatMessage) => string;
}

export const useChatInteractionModes = ({
  isOpen,
  currentChannelId,
  messages,
  mergeSearchContextMessages,
  user,
  targetUser,
  captionData,
  closeMessageMenu,
  messagesContainerRef,
  getAttachmentFileName,
}: UseChatInteractionModesProps) => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
    () => new Set()
  );
  const selectionModeScrollTopRef = useRef<number | null>(null);
  const search = useChatMessageSearchMode({
    isOpen,
    currentChannelId,
    messages,
    mergeSearchContextMessages,
    user,
    targetUser,
  });

  const { captionMessagesByAttachmentId, captionMessageIds } = captionData;
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
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
    selectionModeScrollTopRef.current = null;
  }, [isOpen]);

  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
    selectionModeScrollTopRef.current = null;
  }, [currentChannelId]);

  useLayoutEffect(() => {
    if (!isSelectionMode) {
      selectionModeScrollTopRef.current = null;
      return;
    }

    const targetScrollTop = selectionModeScrollTopRef.current;
    const container = messagesContainerRef.current;
    if (targetScrollTop === null || !container) {
      return;
    }

    const rafId = requestAnimationFrame(() => {
      const activeContainer = messagesContainerRef.current;
      if (!activeContainer) return;

      activeContainer.scrollTo({
        top: targetScrollTop,
        behavior: 'auto',
      });
      selectionModeScrollTopRef.current = null;
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isSelectionMode, messagesContainerRef]);

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

  const handleEnterMessageSearchMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
    search.handleEnterMessageSearchMode();
  }, [search]);

  const handleExitMessageSearchMode = useCallback(() => {
    search.handleExitMessageSearchMode();
  }, [search]);

  const handleEnterMessageSelectionMode = useCallback(() => {
    selectionModeScrollTopRef.current =
      messagesContainerRef.current?.scrollTop ?? null;
    closeMessageMenu();
    search.handleExitMessageSearchMode();
    setSelectedMessageIds(new Set());
    setIsSelectionMode(true);
  }, [closeMessageMenu, messagesContainerRef, search]);

  const handleExitMessageSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
  }, []);

  const handleClearSelectedMessages = useCallback(() => {
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
    search.handleFocusSearchInput();
  }, [search]);

  const handleNavigateSearchUp = useCallback(() => {
    search.handleNavigateSearchUp();
  }, [search]);

  const handleNavigateSearchDown = useCallback(() => {
    search.handleNavigateSearchDown();
  }, [search]);

  const handleCopySelectedMessages = useCallback(async () => {
    if (selectedVisibleMessages.length === 0) {
      toast.error('Pilih minimal 1 pesan untuk disalin', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    const serializedMessages = await serializeSelectedMessages(
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
    isMessageSearchMode: search.isMessageSearchMode,
    messageSearchQuery: search.messageSearchQuery,
    activeSearchMessageId: search.activeSearchMessageId,
    isSelectionMode,
    selectedMessageIds,
    searchNavigationTick: search.searchNavigationTick,
    normalizedMessageSearchQuery: search.normalizedMessageSearchQuery,
    captionMessagesByAttachmentId,
    captionMessageIds,
    searchMatchedMessageIds: search.searchMatchedMessageIds,
    searchMatchedMessageIdSet: search.searchMatchedMessageIdSet,
    activeSearchResultIndex: search.activeSearchResultIndex,
    canNavigateSearchUp: search.canNavigateSearchUp,
    canNavigateSearchDown: search.canNavigateSearchDown,
    hasMoreSearchResults: search.hasMoreSearchResults,
    messageSearchState: search.messageSearchState,
    selectableMessageIdSet,
    selectedVisibleMessages,
    canDeleteSelectedMessages,
    searchInputRef: search.searchInputRef,
    setIsSelectionMode,
    setSelectedMessageIds,
    handleEnterMessageSearchMode,
    handleExitMessageSearchMode,
    handleEnterMessageSelectionMode,
    handleClearSelectedMessages,
    handleExitMessageSelectionMode,
    handleToggleMessageSelection,
    handleFocusSearchInput,
    handleMessageSearchQueryChange: search.handleMessageSearchQueryChange,
    handleNavigateSearchUp,
    handleNavigateSearchDown,
    handleCopySelectedMessages,
  };
};
