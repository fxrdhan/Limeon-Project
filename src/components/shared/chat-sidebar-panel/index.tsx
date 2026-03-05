import { useAuthStore } from '@/store/authStore';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { motion } from 'motion/react';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  SEARCH_STATES,
  type SearchState,
} from '@/components/search-bar/constants';
import ChatHeader from './components/ChatHeader';
import ComposerPanel from './components/ComposerPanel';
import MessagesPane from './components/MessagesPane';
import { StorageService } from '@/services/api/storage.service';
import {
  cacheImageBlob,
  getCachedImageBlobUrl,
  setCachedImage,
} from '@/utils/imageCache';
import {
  chatService,
  type ChatMessage,
  type UserPresence,
} from '@/services/api/chat.service';
import { realtimeService } from '@/services/realtime/realtime.service';
import {
  CHAT_SIDEBAR_TOASTER_ID,
  COMPOSER_BASE_BORDER_COLOR,
  COMPOSER_BASE_SHADOW,
  COMPOSER_GLOW_SHADOW_FADE,
  COMPOSER_GLOW_SHADOW_HIGH,
  COMPOSER_GLOW_SHADOW_LOW,
  COMPOSER_GLOW_SHADOW_MID,
  COMPOSER_GLOW_SHADOW_PEAK,
  COMPOSER_IMAGE_PREVIEW_EXIT_DURATION,
  COMPOSER_IMAGE_PREVIEW_OFFSET,
  COMPOSER_SYNC_LAYOUT_TRANSITION,
  EDIT_TARGET_FLASH_PHASE_DURATION,
  EDIT_TARGET_FOCUS_PADDING,
  EDITING_COMPOSER_OFFSET,
  MAX_PENDING_COMPOSER_ATTACHMENTS,
  MAX_MESSAGE_CHARS,
  MENU_GAP,
  MENU_HEIGHT,
  MENU_WIDTH,
  MESSAGE_BOTTOM_GAP,
  MESSAGE_INPUT_MAX_HEIGHT,
  MESSAGE_INPUT_MIN_HEIGHT,
  SEND_SUCCESS_GLOW_DURATION,
  SEND_SUCCESS_GLOW_RESET_BUFFER,
  CHAT_IMAGE_BUCKET,
} from './constants';
import type {
  ChatSidebarPanelProps,
  PendingComposerAttachment,
  ComposerPendingFileKind,
  MenuPlacement,
  MenuSideAnchor,
  PendingComposerFile,
} from './types';
import {
  buildChatFilePath,
  buildChatImagePath,
  getAttachmentFileKind,
  getAttachmentFileName,
} from './utils/attachment';
import { getInitials, getInitialsColor } from './utils/avatar';
import { getClipboardImagePayload } from './utils/clipboard';
import { generateChannelId } from './utils/channel';

type ConversationCacheEntry = {
  messages: ChatMessage[];
  cachedAt: number;
};

type GeneratedPdfPreview = {
  coverBlob: Blob;
  pageCount: number;
};

const isPdfDocumentFile = (fileName: string, mimeType: string) =>
  mimeType.toLowerCase().includes('pdf') ||
  fileName.toLowerCase().endsWith('.pdf');

const buildPdfPreviewStoragePath = (filePath: string) => {
  const normalizedPath = filePath.replace(/^documents\//, 'previews/');
  if (/\.[^./]+$/.test(normalizedPath)) {
    return normalizedPath.replace(/\.[^./]+$/, '.png');
  }

  return `${normalizedPath}.png`;
};

const ChatSidebarPanel = memo(
  ({ isOpen, onClose, targetUser }: ChatSidebarPanelProps) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [isAtTop, setIsAtTop] = useState(true);
    const [hasNewMessages, setHasNewMessages] = useState(false);
    const [loading, setLoading] = useState(false);
    const [openMenuMessageId, setOpenMenuMessageId] = useState<string | null>(
      null
    );
    const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>('up');
    const [menuSideAnchor, setMenuSideAnchor] =
      useState<MenuSideAnchor>('middle');
    const [shouldAnimateMenuOpen, setShouldAnimateMenuOpen] = useState(true);
    const [menuTransitionSourceId, setMenuTransitionSourceId] = useState<
      string | null
    >(null);
    const [menuOffsetX, setMenuOffsetX] = useState(0);
    const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(
      () => new Set()
    );
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
      null
    );
    const [targetUserPresence, setTargetUserPresence] =
      useState<UserPresence | null>(null);
    const { user } = useAuthStore();
    const messageInputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const composerContainerRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const presenceChannelRef = useRef<RealtimeChannel | null>(null);
    const globalPresenceChannelRef = useRef<RealtimeChannel | null>(null);
    const incomingMessagesChannelRef = useRef<RealtimeChannel | null>(null);
    const presenceRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasClosedRef = useRef(false);
    const previousIsOpenRef = useRef(isOpen);
    /* c8 ignore next */
    const currentChannelId =
      user && targetUser ? generateChannelId(user.id, targetUser.id) : null;
    const userProfilePhotoUrl = user?.profilephoto ?? null;
    const targetProfilePhotoUrl = targetUser?.profilephoto ?? null;
    const userCacheKey = user?.id ? `profile:${user.id}` : null;
    const targetCacheKey = targetUser?.id ? `profile:${targetUser.id}` : null;
    const [displayUserPhotoUrl, setDisplayUserPhotoUrl] = useState<
      string | null
    >(null);
    const [displayTargetPhotoUrl, setDisplayTargetPhotoUrl] = useState<
      string | null
    >(null);
    const [messageInputHeight, setMessageInputHeight] = useState(
      MESSAGE_INPUT_MIN_HEIGHT
    );
    const [composerLayoutMode, setComposerLayoutMode] = useState<
      'inline' | 'multiline'
    >('inline');
    const [isSendSuccessGlowVisible, setIsSendSuccessGlowVisible] =
      useState(false);
    const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
    const [pendingComposerAttachments, setPendingComposerAttachments] =
      useState<PendingComposerAttachment[]>([]);
    const [
      composerImagePreviewAttachmentId,
      setComposerImagePreviewAttachmentId,
    ] = useState<string | null>(null);
    const [isComposerImageExpanded, setIsComposerImageExpanded] =
      useState(false);
    const [isComposerImageExpandedVisible, setIsComposerImageExpandedVisible] =
      useState(false);
    const [flashingMessageId, setFlashingMessageId] = useState<string | null>(
      null
    );
    const [isFlashHighlightVisible, setIsFlashHighlightVisible] =
      useState(false);
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
    const messageInputHeightRafRef = useRef<number | null>(null);
    const sendSuccessGlowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const flashMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingSearchFlashRafRef = useRef<number | null>(null);
    const composerImagePreviewCloseTimerRef = useRef<number | null>(null);
    const menuTransitionSourceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const chatHeaderContainerRef = useRef<HTMLDivElement>(null);
    const attachButtonRef = useRef<HTMLButtonElement>(null);
    const attachModalRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const documentInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const replaceComposerImageAttachmentIdRef = useRef<string | null>(null);
    const replaceComposerDocumentAttachmentIdRef = useRef<string | null>(null);
    const pendingComposerAttachmentsRef = useRef<PendingComposerAttachment[]>(
      []
    );
    const messageBubbleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());
    const initialMessageAnimationKeysRef = useRef<Set<string>>(new Set());
    const initialOpenJumpAnimationKeysRef = useRef<Set<string>>(new Set());
    const shouldPinToBottomOnOpenRef = useRef(false);
    const hasCompletedInitialOpenLoadRef = useRef(false);
    const atTopVisibilityRef = useRef(true);
    const conversationCacheRef = useRef<Map<string, ConversationCacheEntry>>(
      new Map()
    );
    const pendingDeliveredReceiptMessageIdsRef = useRef<Set<string>>(new Set());
    const pendingReadReceiptMessageIdsRef = useRef<Set<string>>(new Set());
    const inlineOverflowThresholdRef = useRef<number | null>(null);
    const isHoldingMultilineByInlineOverflow =
      inlineOverflowThresholdRef.current !== null &&
      message.length >= inlineOverflowThresholdRef.current;
    const isTargetMultiline =
      messageInputHeight > MESSAGE_INPUT_MIN_HEIGHT + 2 ||
      isHoldingMultilineByInlineOverflow;
    const isMessageInputMultiline = composerLayoutMode === 'multiline';
    const editingMessagePreview =
      editingMessageId === null
        ? null
        : (messages.find(candidate => candidate.id === editingMessageId)
            ?.message ?? null);
    const previewComposerImageAttachment = pendingComposerAttachments.find(
      attachment =>
        attachment.id === composerImagePreviewAttachmentId &&
        attachment.fileKind === 'image'
    );
    const composerContextualOffset =
      (editingMessagePreview ? EDITING_COMPOSER_OFFSET : 0) +
      (pendingComposerAttachments.length > 0
        ? COMPOSER_IMAGE_PREVIEW_OFFSET
        : 0);
    const normalizedMessageSearchQuery = messageSearchQuery
      .trim()
      .toLowerCase();
    const { captionMessagesByAttachmentId, captionMessageIds } = useMemo(() => {
      const attachmentMessagesById = new Map<string, ChatMessage>();
      const captionMap = new Map<string, ChatMessage>();
      const captionIds = new Set<string>();

      for (const messageItem of messages) {
        if (
          messageItem.message_type === 'image' ||
          messageItem.message_type === 'file'
        ) {
          attachmentMessagesById.set(messageItem.id, messageItem);
        }
      }

      for (const messageItem of messages) {
        if (messageItem.message_type !== 'text' || !messageItem.reply_to_id) {
          continue;
        }

        const parentMessage = attachmentMessagesById.get(
          messageItem.reply_to_id
        );
        if (!parentMessage) continue;
        if (parentMessage.sender_id !== messageItem.sender_id) continue;
        if (parentMessage.receiver_id !== messageItem.receiver_id) continue;
        if (parentMessage.channel_id !== messageItem.channel_id) continue;
        if (captionMap.has(parentMessage.id)) continue;

        captionMap.set(parentMessage.id, messageItem);
        captionIds.add(messageItem.id);
      }

      return {
        captionMessagesByAttachmentId: captionMap,
        captionMessageIds: captionIds,
      };
    }, [messages]);
    const searchMatchedMessageIds = useMemo(() => {
      if (!normalizedMessageSearchQuery) return [];

      const matchedIds: string[] = [];

      for (const messageItem of messages) {
        if (captionMessageIds.has(messageItem.id)) continue;

        const messageFragments: string[] = [];
        if (messageItem.message_type === 'text') {
          messageFragments.push(messageItem.message);
        }

        const attachmentCaption = captionMessagesByAttachmentId.get(
          messageItem.id
        );
        if (attachmentCaption?.message) {
          messageFragments.push(attachmentCaption.message);
        }

        if (messageFragments.length === 0) continue;

        const searchBase = messageFragments.join('\n').toLowerCase();
        if (searchBase.includes(normalizedMessageSearchQuery)) {
          matchedIds.push(messageItem.id);
        }
      }

      return matchedIds;
    }, [
      captionMessageIds,
      captionMessagesByAttachmentId,
      messages,
      normalizedMessageSearchQuery,
    ]);
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
    const selectableMessageIdSet = useMemo(() => {
      const selectableIds = new Set<string>();
      for (const messageItem of messages) {
        if (captionMessageIds.has(messageItem.id)) continue;
        selectableIds.add(messageItem.id);
      }

      return selectableIds;
    }, [captionMessageIds, messages]);
    const selectedVisibleMessages = useMemo(() => {
      const selectedMessages: ChatMessage[] = [];
      for (const messageItem of messages) {
        if (captionMessageIds.has(messageItem.id)) continue;
        if (!selectedMessageIds.has(messageItem.id)) continue;
        selectedMessages.push(messageItem);
      }

      return selectedMessages;
    }, [captionMessageIds, messages, selectedMessageIds]);
    const canDeleteSelectedMessages = useMemo(() => {
      if (!user) return false;
      return selectedVisibleMessages.some(
        messageItem => messageItem.sender_id === user.id
      );
    }, [selectedVisibleMessages, user]);

    useEffect(() => {
      pendingComposerAttachmentsRef.current = pendingComposerAttachments;
    }, [pendingComposerAttachments]);

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
      if (
        !isOpen ||
        !currentChannelId ||
        !hasCompletedInitialOpenLoadRef.current
      )
        return;

      const persistedMessages = messages
        .filter(messageItem => !messageItem.id.startsWith('temp_'))
        .map(messageItem => ({ ...messageItem }));

      conversationCacheRef.current.set(currentChannelId, {
        messages: persistedMessages,
        cachedAt: Date.now(),
      });
    }, [isOpen, currentChannelId, messages]);

    const getVisibleMessagesBounds = useCallback(() => {
      const containerRect =
        messagesContainerRef.current?.getBoundingClientRect() ?? null;
      if (!containerRect) return null;

      const composerTop =
        composerContainerRef.current?.getBoundingClientRect().top;
      const hasValidComposerTop =
        typeof composerTop === 'number' &&
        Number.isFinite(composerTop) &&
        composerTop > containerRect.top &&
        composerTop < containerRect.bottom;
      const visibleBottom = hasValidComposerTop
        ? composerTop
        : containerRect.bottom;

      return {
        containerRect,
        visibleBottom,
      };
    }, []);

    const scrollMessagesToBottom = useCallback(
      (behavior: ScrollBehavior) => {
        const container = messagesContainerRef.current;
        const endMarker = messagesEndRef.current;
        const bounds = getVisibleMessagesBounds();
        if (!container || !endMarker || !bounds) return;

        const hiddenBottom = Math.max(
          0,
          bounds.containerRect.bottom - bounds.visibleBottom
        );
        const visibleHeight = container.clientHeight - hiddenBottom;
        if (visibleHeight <= 0) return;

        const endTopInContent =
          endMarker.getBoundingClientRect().top -
          bounds.containerRect.top +
          container.scrollTop;
        const targetScrollTop =
          endTopInContent - Math.max(visibleHeight - MESSAGE_BOTTOM_GAP, 0);
        const maxScrollTop = Math.max(
          0,
          container.scrollHeight - container.clientHeight
        );

        container.scrollTo({
          top: Math.min(Math.max(targetScrollTop, 0), maxScrollTop),
          behavior,
        });
      },
      [getVisibleMessagesBounds]
    );

    const scheduleScrollMessagesToBottom = useCallback(() => {
      requestAnimationFrame(() => {
        scrollMessagesToBottom('auto');
      });
    }, [scrollMessagesToBottom]);

    const getMenuLayout = useCallback(
      (
        anchorRect: DOMRect,
        preferredSide: 'left' | 'right'
      ): {
        placement: MenuPlacement;
        sideAnchor: MenuSideAnchor;
      } => {
        const bounds = getVisibleMessagesBounds();
        if (!bounds) {
          return { placement: 'up', sideAnchor: 'middle' };
        }

        const { containerRect, visibleBottom } = bounds;
        const spaceLeft = anchorRect.left - containerRect.left;
        const spaceRight = containerRect.right - anchorRect.right;
        const spaceAbove = anchorRect.top - containerRect.top;
        const spaceBelow = visibleBottom - anchorRect.bottom;
        const hasTopAnchoredSideRoom =
          spaceBelow >= MENU_HEIGHT - anchorRect.height + MENU_GAP;
        const hasBottomAnchoredSideRoom =
          spaceAbove >= MENU_HEIGHT - anchorRect.height + MENU_GAP;
        const hasCenteredSideRoom =
          spaceAbove >= MENU_HEIGHT / 2 && spaceBelow >= MENU_HEIGHT / 2;
        const hasSideVerticalRoom =
          hasTopAnchoredSideRoom ||
          hasBottomAnchoredSideRoom ||
          hasCenteredSideRoom;
        const sideAnchor: MenuSideAnchor = hasCenteredSideRoom
          ? 'middle'
          : hasBottomAnchoredSideRoom
            ? 'bottom'
            : hasTopAnchoredSideRoom
              ? 'top'
              : spaceAbove >= spaceBelow
                ? 'bottom'
                : 'top';
        const canFitLeft =
          spaceLeft >= MENU_WIDTH + MENU_GAP && hasSideVerticalRoom;
        const canFitRight =
          spaceRight >= MENU_WIDTH + MENU_GAP && hasSideVerticalRoom;

        if (preferredSide === 'left' && canFitLeft) {
          return { placement: 'left', sideAnchor };
        }
        if (preferredSide === 'right' && canFitRight) {
          return { placement: 'right', sideAnchor };
        }
        if (canFitLeft) {
          return { placement: 'left', sideAnchor };
        }
        if (canFitRight) {
          return { placement: 'right', sideAnchor };
        }

        if (spaceBelow >= MENU_HEIGHT + MENU_GAP) {
          return { placement: 'up', sideAnchor };
        }
        if (spaceAbove >= MENU_HEIGHT + MENU_GAP) {
          return { placement: 'down', sideAnchor };
        }

        return {
          placement: spaceBelow >= spaceAbove ? 'up' : 'down',
          sideAnchor,
        };
      },
      [getVisibleMessagesBounds]
    );

    const closeMessageMenu = useCallback(() => {
      if (menuTransitionSourceTimeoutRef.current) {
        clearTimeout(menuTransitionSourceTimeoutRef.current);
        menuTransitionSourceTimeoutRef.current = null;
      }
      setOpenMenuMessageId(null);
      setMenuTransitionSourceId(null);
      setMenuOffsetX(0);
      setShouldAnimateMenuOpen(true);
    }, []);

    const toggleMessageMenu = useCallback(
      (
        anchor: HTMLElement,
        messageId: string,
        preferredSide: 'left' | 'right'
      ) => {
        if (openMenuMessageId === messageId) {
          closeMessageMenu();
          return;
        }

        const anchorRect = anchor.getBoundingClientRect();
        const nextMenuLayout = getMenuLayout(anchorRect, preferredSide);
        const isSwitchingMenuMessage =
          openMenuMessageId !== null && openMenuMessageId !== messageId;

        if (menuTransitionSourceTimeoutRef.current) {
          clearTimeout(menuTransitionSourceTimeoutRef.current);
          menuTransitionSourceTimeoutRef.current = null;
        }

        setIsAttachModalOpen(false);
        setMenuOffsetX(0);
        setMenuPlacement(nextMenuLayout.placement);
        setMenuSideAnchor(nextMenuLayout.sideAnchor);

        if (isSwitchingMenuMessage) {
          setMenuTransitionSourceId(openMenuMessageId);
          menuTransitionSourceTimeoutRef.current = setTimeout(() => {
            setMenuTransitionSourceId(null);
            menuTransitionSourceTimeoutRef.current = null;
          }, 220);
        } else {
          setMenuTransitionSourceId(null);
        }

        setShouldAnimateMenuOpen(!isSwitchingMenuMessage);
        setOpenMenuMessageId(messageId);
      },
      [closeMessageMenu, getMenuLayout, openMenuMessageId]
    );

    const handleToggleExpand = useCallback((messageId: string) => {
      setExpandedMessageIds(prev => {
        const next = new Set(prev);
        if (next.has(messageId)) {
          next.delete(messageId);
        } else {
          next.add(messageId);
        }
        return next;
      });
    }, []);

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

    useEffect(() => {
      if (!isMessageSearchMode) return;
      const rafId = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      return () => {
        cancelAnimationFrame(rafId);
      };
    }, [isMessageSearchMode]);

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

          return searchMatchedMessageIds[nextIndex] ?? currentMessageId;
        });
        setSearchNavigationTick(currentTick => currentTick + 1);
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

        return (
          searchMatchedMessageIds[searchMatchedMessageIds.length - 1] ?? null
        );
      });
    }, [
      isMessageSearchMode,
      normalizedMessageSearchQuery,
      searchMatchedMessageIds,
    ]);

    const ensureMenuFullyVisible = useCallback(
      (messageId: string) => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const menuElement = container.querySelector<HTMLElement>(
          `[data-chat-menu-id="${messageId}"]`
        );

        if (!menuElement) return;

        const bounds = getVisibleMessagesBounds();
        if (!bounds) return;

        const { containerRect, visibleBottom } = bounds;
        const menuRect = menuElement.getBoundingClientRect();

        let scrollOffset = 0;
        /* c8 ignore next 2 */
        if (menuRect.top < containerRect.top) {
          scrollOffset = menuRect.top - containerRect.top - MENU_GAP;
        } else if (menuRect.bottom > visibleBottom) {
          scrollOffset = menuRect.bottom - visibleBottom + MENU_GAP;
        }

        if (scrollOffset !== 0) {
          container.scrollTo({
            top: container.scrollTop + scrollOffset,
            behavior: 'auto',
          });
        }

        const minMenuLeft = containerRect.left + MENU_GAP;
        const maxMenuRight = containerRect.right - MENU_GAP;
        const shiftMin = minMenuLeft - menuRect.left;
        const shiftMax = maxMenuRight - menuRect.right;
        const nextOffsetX =
          shiftMin > shiftMax
            ? shiftMin
            : Math.min(Math.max(0, shiftMin), shiftMax);

        setMenuOffsetX(prevOffset =>
          Math.abs(prevOffset - nextOffsetX) < 0.5 ? prevOffset : nextOffsetX
        );
      },
      [getVisibleMessagesBounds]
    );

    useLayoutEffect(() => {
      if (!openMenuMessageId) return;

      ensureMenuFullyVisible(openMenuMessageId);
    }, [
      openMenuMessageId,
      menuPlacement,
      menuSideAnchor,
      ensureMenuFullyVisible,
    ]);

    // Update user last seen when chat closes
    const updateUserChatClose = useCallback(async () => {
      if (!user) return;

      try {
        const { error } = await chatService.updateUserPresence(user.id, {
          is_online: false,
          current_chat_channel: null,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) {
          console.error('❌ Error updating user chat close:', error);
        }
      } catch (error) {
        console.error('❌ Caught error updating user chat close:', error);
      }
    }, [user]);

    useEffect(() => {
      if (!userCacheKey || !userProfilePhotoUrl) return;
      if (userProfilePhotoUrl.startsWith('http')) {
        setCachedImage(userCacheKey, userProfilePhotoUrl);
      }
    }, [userCacheKey, userProfilePhotoUrl]);

    useEffect(() => {
      if (!targetCacheKey || !targetProfilePhotoUrl) return;
      if (targetProfilePhotoUrl.startsWith('http')) {
        setCachedImage(targetCacheKey, targetProfilePhotoUrl);
      }
    }, [targetCacheKey, targetProfilePhotoUrl]);

    useEffect(() => {
      let isActive = true;

      const resolveImage = async () => {
        if (!userProfilePhotoUrl) {
          if (isActive) setDisplayUserPhotoUrl(null);
          return;
        }

        if (!userProfilePhotoUrl.startsWith('http')) {
          if (isActive) setDisplayUserPhotoUrl(userProfilePhotoUrl);
          return;
        }

        const cachedBlobUrl = await getCachedImageBlobUrl(userProfilePhotoUrl);
        if (cachedBlobUrl) {
          if (isActive) setDisplayUserPhotoUrl(cachedBlobUrl);
          return;
        }

        const blobUrl = await cacheImageBlob(userProfilePhotoUrl);
        if (isActive) {
          setDisplayUserPhotoUrl(blobUrl || userProfilePhotoUrl);
        }
      };

      void resolveImage();

      return () => {
        isActive = false;
      };
    }, [userProfilePhotoUrl]);

    useEffect(() => {
      let isActive = true;

      const resolveImage = async () => {
        if (!targetProfilePhotoUrl) {
          if (isActive) setDisplayTargetPhotoUrl(null);
          return;
        }

        if (!targetProfilePhotoUrl.startsWith('http')) {
          if (isActive) setDisplayTargetPhotoUrl(targetProfilePhotoUrl);
          return;
        }

        const cachedBlobUrl = await getCachedImageBlobUrl(
          targetProfilePhotoUrl
        );
        if (cachedBlobUrl) {
          if (isActive) setDisplayTargetPhotoUrl(cachedBlobUrl);
          return;
        }

        const blobUrl = await cacheImageBlob(targetProfilePhotoUrl);
        if (isActive) {
          setDisplayTargetPhotoUrl(blobUrl || targetProfilePhotoUrl);
        }
      };

      void resolveImage();

      return () => {
        isActive = false;
      };
    }, [targetProfilePhotoUrl]);

    const triggerSendSuccessGlow = useCallback(() => {
      if (sendSuccessGlowTimeoutRef.current) {
        clearTimeout(sendSuccessGlowTimeoutRef.current);
      }
      setIsSendSuccessGlowVisible(false);
      requestAnimationFrame(() => {
        setIsSendSuccessGlowVisible(true);
      });
      sendSuccessGlowTimeoutRef.current = setTimeout(() => {
        setIsSendSuccessGlowVisible(false);
        sendSuccessGlowTimeoutRef.current = null;
      }, SEND_SUCCESS_GLOW_DURATION + SEND_SUCCESS_GLOW_RESET_BUFFER);
    }, []);

    // Centralized close logic (used by close button AND external triggers)
    const performClose = useCallback(async () => {
      if (hasClosedRef.current || !user) {
        return;
      }

      // Step 1: Broadcast close presence
      if (globalPresenceChannelRef.current) {
        const broadcastPayload = {
          user_id: user.id,
          is_online: false,
          current_chat_channel: null,
          last_seen: new Date().toISOString(),
        };

        hasClosedRef.current = true; // Mark as closed

        void globalPresenceChannelRef.current.send({
          type: 'broadcast',
          event: 'presence_changed',
          payload: broadcastPayload,
        });
      }

      // Step 2: Update database
      try {
        await updateUserChatClose();
      } catch (error) {
        /* c8 ignore next */
        console.error('❌ Database update failed:', error);
      }

      // Step 3: Small delay for broadcast delivery
      await new Promise(resolve => setTimeout(resolve, 100));
    }, [user, updateUserChatClose]);

    // Update user presence when chat opens
    const updateUserChatOpen = useCallback(async () => {
      /* c8 ignore next 3 */
      if (!user || !currentChannelId) {
        return;
      }

      try {
        // First try to update existing record
        const { data: updateData, error: updateError } =
          await chatService.updateUserPresence(user.id, {
            is_online: true,
            current_chat_channel: currentChannelId,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (updateError || !updateData || updateData.length === 0) {
          // If update failed or no rows affected, try insert

          const { error: insertError } = await chatService.insertUserPresence({
            user_id: user.id,
            is_online: true,
            current_chat_channel: currentChannelId,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (insertError) {
            console.error('❌ Error inserting user presence:', insertError);
          }
        } else {
          // Broadcast presence change to GLOBAL presence channel
          if (
            globalPresenceChannelRef.current &&
            updateData &&
            updateData.length > 0
          ) {
            const updatedPresence = updateData[0];
            const broadcastPayload = {
              user_id: user.id,
              is_online: true,
              current_chat_channel: currentChannelId,
              last_seen: updatedPresence.last_seen,
            };

            void globalPresenceChannelRef.current.send({
              type: 'broadcast',
              event: 'presence_changed',
              payload: broadcastPayload,
            });
          }
        }
      } catch (error) {
        console.error('❌ Caught error updating user chat open:', error);
      }
    }, [user, currentChannelId]);

    // Load target user presence
    const loadTargetUserPresence = useCallback(async () => {
      if (!targetUser) return;

      try {
        const { data: presence, error } = await chatService.getUserPresence(
          targetUser.id
        );

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows returned
          console.error('❌ Error loading target user presence:', error);
          return;
        }

        if (presence) {
          setTargetUserPresence(presence);
        }
      } catch (error) {
        console.error('❌ Caught error loading target user presence:', error);
      }
    }, [targetUser]);

    const mergeAndBroadcastMessageUpdates = useCallback(
      (updatedMessages: ChatMessage[]) => {
        if (updatedMessages.length === 0) return;

        const updatedMessagesById = new Map(
          updatedMessages.map(updatedMessage => [
            updatedMessage.id,
            updatedMessage,
          ])
        );

        setMessages(previousMessages =>
          previousMessages.map(previousMessage => {
            const nextUpdatedMessage = updatedMessagesById.get(
              previousMessage.id
            );
            if (!nextUpdatedMessage) return previousMessage;
            return {
              ...previousMessage,
              ...nextUpdatedMessage,
              stableKey: previousMessage.stableKey,
            };
          })
        );

        if (channelRef.current) {
          updatedMessages.forEach(updatedMessage => {
            void channelRef.current?.send({
              type: 'broadcast',
              event: 'update_message',
              payload: updatedMessage,
            });
          });
        }

        if (globalPresenceChannelRef.current) {
          updatedMessages.forEach(updatedMessage => {
            void globalPresenceChannelRef.current?.send({
              type: 'broadcast',
              event: 'message_receipt_updated',
              payload: updatedMessage,
            });
          });
        }
      },
      []
    );

    const markMessageIdsAsDelivered = useCallback(
      async (messageIds: string[]) => {
        if (messageIds.length === 0) return;

        const targetIds = messageIds.filter(messageId => {
          if (!messageId) return false;
          if (pendingDeliveredReceiptMessageIdsRef.current.has(messageId)) {
            return false;
          }
          pendingDeliveredReceiptMessageIdsRef.current.add(messageId);
          return true;
        });
        if (targetIds.length === 0) return;

        try {
          const { data: deliveredMessages, error } =
            await chatService.markMessageIdsAsDelivered(targetIds);
          if (error || !deliveredMessages || deliveredMessages.length === 0) {
            return;
          }

          mergeAndBroadcastMessageUpdates(deliveredMessages);
        } catch (error) {
          console.error('Error marking messages as delivered:', error);
        } finally {
          targetIds.forEach(messageId => {
            pendingDeliveredReceiptMessageIdsRef.current.delete(messageId);
          });
        }
      },
      [mergeAndBroadcastMessageUpdates]
    );

    const markMessageIdsAsRead = useCallback(
      async (messageIds: string[]) => {
        if (messageIds.length === 0) return;

        const targetIds = messageIds.filter(messageId => {
          if (!messageId) return false;
          if (pendingReadReceiptMessageIdsRef.current.has(messageId)) {
            return false;
          }
          pendingReadReceiptMessageIdsRef.current.add(messageId);
          return true;
        });
        if (targetIds.length === 0) return;

        try {
          const { data: readMessages, error } =
            await chatService.markMessageIdsAsRead(targetIds);
          if (error || !readMessages || readMessages.length === 0) return;
          mergeAndBroadcastMessageUpdates(readMessages);
        } catch (error) {
          console.error('Error marking messages as read:', error);
        } finally {
          targetIds.forEach(messageId => {
            pendingReadReceiptMessageIdsRef.current.delete(messageId);
          });
        }
      },
      [mergeAndBroadcastMessageUpdates]
    );

    const markVisibleIncomingMessagesAsRead = useCallback(async () => {
      if (!user || !targetUser) return;

      const bounds = getVisibleMessagesBounds();
      if (!bounds) return;

      const visibleUnreadIncomingMessageIds = messages
        .filter(
          messageItem =>
            messageItem.sender_id === targetUser.id &&
            messageItem.receiver_id === user.id &&
            !messageItem.is_read
        )
        .map(messageItem => {
          const bubbleElement = messageBubbleRefs.current.get(messageItem.id);
          if (!bubbleElement) return null;

          const bubbleRect = bubbleElement.getBoundingClientRect();
          const isVisible =
            bubbleRect.bottom > bounds.containerRect.top &&
            bubbleRect.top < bounds.visibleBottom;
          return isVisible ? messageItem.id : null;
        })
        .filter((messageId): messageId is string => Boolean(messageId));

      if (visibleUnreadIncomingMessageIds.length === 0) return;
      await markMessageIdsAsRead(visibleUnreadIncomingMessageIds);
    }, [
      getVisibleMessagesBounds,
      markMessageIdsAsRead,
      messages,
      targetUser,
      user,
    ]);

    // PRIORITY 1: Simulate close button click when isOpen changes to false
    useEffect(() => {
      const previousIsOpen = previousIsOpenRef.current;

      // Update previous ref for next comparison
      previousIsOpenRef.current = isOpen;

      // SMART: When close detected from ANY source → use same close logic as close button
      if (previousIsOpen && !isOpen && user && !hasClosedRef.current) {
        // Call the centralized close function
        void performClose();
      }
    }, [isOpen, user, targetUser, performClose]);

    // Load messages and setup realtime subscription
    useEffect(() => {
      if (!isOpen || !user || !targetUser || !currentChannelId) {
        return;
      }

      const loadMessages = async () => {
        const applyConversationSnapshot = (snapshotMessages: ChatMessage[]) => {
          const transformedMessages: ChatMessage[] = snapshotMessages.map(
            messageItem => ({
              ...messageItem,
              sender_name:
                messageItem.sender_id === user.id
                  ? user.name || 'You'
                  : targetUser.name || 'Unknown',
              receiver_name:
                messageItem.receiver_id === user.id
                  ? user.name || 'You'
                  : targetUser.name || 'Unknown',
            })
          );

          const initialMessageAnimationKeys = new Set(
            transformedMessages.map(
              messageItem => messageItem.stableKey || messageItem.id
            )
          );
          initialMessageAnimationKeysRef.current = initialMessageAnimationKeys;
          initialOpenJumpAnimationKeysRef.current = new Set(
            initialMessageAnimationKeys
          );

          setMessages(previousMessages => {
            if (previousMessages.length === 0) {
              return transformedMessages;
            }

            const transformedIds = new Set(
              transformedMessages.map(messageItem => messageItem.id)
            );
            const pendingMessages = previousMessages.filter(
              messageItem =>
                !transformedIds.has(messageItem.id) &&
                messageItem.id.startsWith('temp_')
            );

            return [...transformedMessages, ...pendingMessages];
          });

          return transformedMessages;
        };

        const cachedConversation =
          conversationCacheRef.current.get(currentChannelId);
        const hasCachedConversation = Boolean(cachedConversation);

        if (hasCachedConversation && cachedConversation) {
          applyConversationSnapshot(cachedConversation.messages);
          hasCompletedInitialOpenLoadRef.current = true;
        } else {
          setMessages([]);
        }

        setLoading(!hasCachedConversation);
        try {
          // Fetch existing messages (simplified query without JOIN)
          const { data: existingMessages, error } =
            await chatService.fetchMessagesBetweenUsers(user.id, targetUser.id);

          if (error) {
            console.error('Error loading messages:', error);
            return;
          }
          const transformedMessages = applyConversationSnapshot(
            existingMessages || []
          );
          conversationCacheRef.current.set(currentChannelId, {
            messages: transformedMessages,
            cachedAt: Date.now(),
          });
          const undeliveredIncomingMessageIds = transformedMessages
            .filter(
              messageItem =>
                messageItem.sender_id === targetUser.id &&
                messageItem.receiver_id === user.id &&
                !messageItem.is_delivered
            )
            .map(messageItem => messageItem.id);
          await markMessageIdsAsDelivered(undeliveredIncomingMessageIds);
        } catch (error) {
          console.error('Error loading messages:', error);
        } finally {
          hasCompletedInitialOpenLoadRef.current = true;
          setLoading(false);
        }
      };

      // Setup realtime subscription
      const setupRealtimeSubscription = () => {
        // Clean up existing channel if any
        /* c8 ignore next 4 */
        if (channelRef.current) {
          void realtimeService.removeChannel(channelRef.current);
        }

        // Create new channel for this conversation
        const channel = realtimeService.createChannel(
          `chat_${currentChannelId}`,
          {
            config: {
              broadcast: { self: true },
            },
          }
        );

        // Subscribe to broadcast events
        channel.on('broadcast', { event: 'new_message' }, payload => {
          const newMessage = payload.payload as ChatMessage;
          setMessages(prev => {
            // Prevent duplicate messages
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
          if (
            newMessage.sender_id === targetUser.id &&
            newMessage.receiver_id === user.id &&
            !newMessage.is_delivered
          ) {
            void markMessageIdsAsDelivered([newMessage.id]);
          }
        });

        channel.on('broadcast', { event: 'update_message' }, payload => {
          const updatedMessage = payload.payload as ChatMessage;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
            )
          );
        });

        channel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
            filter: `channel_id=eq.${currentChannelId}`,
          },
          payload => {
            const updatedMessage = payload.new as ChatMessage;
            if (!updatedMessage?.id) return;

            setMessages(prev =>
              prev.map(messageItem =>
                messageItem.id === updatedMessage.id
                  ? {
                      ...messageItem,
                      ...updatedMessage,
                      stableKey: messageItem.stableKey,
                    }
                  : messageItem
              )
            );
          }
        );

        channel.on('broadcast', { event: 'delete_message' }, payload => {
          const deletedMessage = payload.payload as { id: string };
          setMessages(prev =>
            prev.filter(messageItem => messageItem.id !== deletedMessage.id)
          );
        });

        // Note: Presence changes now handled by global presence channel

        // Subscribe to presence (optional - for typing indicators)
        channel.on('broadcast', { event: 'typing' }, () => {
          // Handle typing indicators if needed
        });

        // Subscribe and store reference
        channel.subscribe(status => {
          if (status === 'CHANNEL_ERROR') {
            console.error('Failed to connect to chat channel');
          }
        });

        channelRef.current = channel;
      };

      // Setup presence subscription for target user
      const setupPresenceSubscription = () => {
        // Clean up existing presence channel if any
        /* c8 ignore next 4 */
        if (presenceChannelRef.current) {
          void realtimeService.removeChannel(presenceChannelRef.current);
        }

        // Create presence channel
        const presenceChannel = realtimeService.createChannel(
          'user_presence_changes',
          {
            config: {
              broadcast: { self: false },
            },
          }
        );

        // Subscribe to presence changes
        presenceChannel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_presence',
            filter: `user_id=eq.${targetUser.id}`,
          },
          payload => {
            if (
              payload.eventType === 'UPDATE' ||
              payload.eventType === 'INSERT'
            ) {
              setTargetUserPresence(payload.new as UserPresence);
            }
          }
        );

        // Subscribe and store reference
        presenceChannel.subscribe();

        presenceChannelRef.current = presenceChannel;
      };

      // Setup GLOBAL presence subscription for all users
      const setupGlobalPresenceSubscription = () => {
        // Clean up existing global presence channel if any
        /* c8 ignore next 4 */
        if (globalPresenceChannelRef.current) {
          void realtimeService.removeChannel(globalPresenceChannelRef.current);
        }

        // Create GLOBAL presence channel that ALL users subscribe to
        const globalPresenceChannel = realtimeService.createChannel(
          'global_presence_updates',
          {
            config: {
              broadcast: { self: true },
            },
          }
        );

        // Subscribe to GLOBAL presence changes
        globalPresenceChannel.on(
          'broadcast',
          { event: 'presence_changed' },
          payload => {
            const presenceUpdate = payload.payload as Partial<UserPresence>;
            // Only update if it's about the target user we're chatting with
            if (presenceUpdate.user_id === targetUser.id) {
              setTargetUserPresence(prev => {
                const newPresence = prev
                  ? { ...prev, ...presenceUpdate }
                  : {
                      user_id: presenceUpdate.user_id!,
                      is_online: presenceUpdate.is_online || false,
                      last_seen:
                        presenceUpdate.last_seen || new Date().toISOString(),
                      current_chat_channel:
                        presenceUpdate.current_chat_channel || null,
                    };

                return newPresence;
              });
            }
          }
        );

        globalPresenceChannel.on(
          'broadcast',
          { event: 'message_receipt_updated' },
          payload => {
            const updatedMessage = payload.payload as Partial<ChatMessage>;
            if (!updatedMessage?.id) return;

            setMessages(prev =>
              prev.map(messageItem =>
                messageItem.id === updatedMessage.id
                  ? {
                      ...messageItem,
                      ...updatedMessage,
                      stableKey: messageItem.stableKey,
                    }
                  : messageItem
              )
            );
          }
        );

        // Subscribe and store reference
        globalPresenceChannel.subscribe();

        globalPresenceChannelRef.current = globalPresenceChannel;
      };

      const setupIncomingMessagesDeliveredSubscription = () => {
        /* c8 ignore next 4 */
        if (incomingMessagesChannelRef.current) {
          void realtimeService.removeChannel(
            incomingMessagesChannelRef.current
          );
        }

        const incomingMessagesChannel = realtimeService.createChannel(
          `incoming_messages_${user.id}`
        );

        incomingMessagesChannel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `receiver_id=eq.${user.id}`,
          },
          payload => {
            const incomingMessage = payload.new as ChatMessage | undefined;
            if (!incomingMessage?.id) return;
            if (incomingMessage.is_delivered) return;
            void markMessageIdsAsDelivered([incomingMessage.id]);
          }
        );

        incomingMessagesChannel.subscribe();
        incomingMessagesChannelRef.current = incomingMessagesChannel;
      };

      setupRealtimeSubscription();
      void loadMessages();
      setupPresenceSubscription();
      setupGlobalPresenceSubscription();
      setupIncomingMessagesDeliveredSubscription();

      // Reset close flag when opening chat
      hasClosedRef.current = false;

      // Update user presence and load target user presence
      void updateUserChatOpen();
      void loadTargetUserPresence();

      // Setup periodic presence refresh as backup (every 30 seconds)
      presenceRefreshIntervalRef.current = setInterval(() => {
        void updateUserChatOpen();
        void loadTargetUserPresence();
      }, 30000);

      // Cleanup function
      return () => {
        if (channelRef.current) {
          void realtimeService.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        if (presenceChannelRef.current) {
          void realtimeService.removeChannel(presenceChannelRef.current);
          presenceChannelRef.current = null;
        }
        if (globalPresenceChannelRef.current) {
          void realtimeService.removeChannel(globalPresenceChannelRef.current);
          globalPresenceChannelRef.current = null;
        }
        if (incomingMessagesChannelRef.current) {
          void realtimeService.removeChannel(
            incomingMessagesChannelRef.current
          );
          incomingMessagesChannelRef.current = null;
        }
        if (presenceRefreshIntervalRef.current) {
          clearInterval(presenceRefreshIntervalRef.current);
          presenceRefreshIntervalRef.current = null;
        }
      };
    }, [
      isOpen,
      user,
      targetUser,
      currentChannelId,
      updateUserChatOpen,
      loadTargetUserPresence,
      markMessageIdsAsDelivered,
      scrollMessagesToBottom,
    ]);

    // Cleanup presence on component unmount
    useEffect(() => {
      return () => {
        // Perform close if not already closed
        if (!hasClosedRef.current && user) {
          void performClose();
        }

        // Clean up interval on unmount
        /* c8 ignore next 4 */
        if (presenceRefreshIntervalRef.current) {
          clearInterval(presenceRefreshIntervalRef.current);
          presenceRefreshIntervalRef.current = null;
        }

        // Clean up global presence channel LAST (after broadcast)
        setTimeout(() => {
          /* c8 ignore next 4 */
          if (globalPresenceChannelRef.current) {
            void realtimeService.removeChannel(
              globalPresenceChannelRef.current
            );
            globalPresenceChannelRef.current = null;
          }
        }, 200);
      };
    }, [user, performClose]);

    useEffect(() => {
      const pendingImagePreviewUrls = pendingImagePreviewUrlsRef.current;
      const pendingDeliveredReceiptMessageIds =
        pendingDeliveredReceiptMessageIdsRef.current;
      const pendingReadReceiptMessageIds =
        pendingReadReceiptMessageIdsRef.current;
      const pendingComposerAttachments = pendingComposerAttachmentsRef.current;

      return () => {
        if (menuTransitionSourceTimeoutRef.current) {
          clearTimeout(menuTransitionSourceTimeoutRef.current);
          menuTransitionSourceTimeoutRef.current = null;
        }

        if (composerImagePreviewCloseTimerRef.current) {
          window.clearTimeout(composerImagePreviewCloseTimerRef.current);
          composerImagePreviewCloseTimerRef.current = null;
        }

        if (sendSuccessGlowTimeoutRef.current) {
          clearTimeout(sendSuccessGlowTimeoutRef.current);
          sendSuccessGlowTimeoutRef.current = null;
        }

        if (flashMessageTimeoutRef.current) {
          clearTimeout(flashMessageTimeoutRef.current);
          flashMessageTimeoutRef.current = null;
        }

        if (pendingSearchFlashRafRef.current !== null) {
          cancelAnimationFrame(pendingSearchFlashRafRef.current);
          pendingSearchFlashRafRef.current = null;
        }

        pendingImagePreviewUrls.forEach(previewUrl => {
          URL.revokeObjectURL(previewUrl);
        });
        pendingImagePreviewUrls.clear();
        pendingDeliveredReceiptMessageIds.clear();
        pendingReadReceiptMessageIds.clear();

        pendingComposerAttachments.forEach(attachment => {
          if (attachment.previewUrl) {
            URL.revokeObjectURL(attachment.previewUrl);
          }
        });
        pendingComposerAttachmentsRef.current = [];
      };
    }, []);

    useEffect(() => {
      let isCancelled = false;
      const pendingPdfAttachments = pendingComposerAttachments.filter(
        attachment =>
          attachment.fileKind === 'document' &&
          attachment.pdfCoverUrl === null &&
          (attachment.mimeType === 'application/pdf' ||
            attachment.fileName.toLowerCase().endsWith('.pdf'))
      );
      if (pendingPdfAttachments.length === 0) return;

      const renderPdfCovers = async () => {
        try {
          const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
          const pdfWorkerModule =
            await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url');
          pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerModule.default;

          for (const pendingAttachment of pendingPdfAttachments) {
            if (isCancelled) return;

            const fileBuffer = await pendingAttachment.file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument(
              new Uint8Array(fileBuffer)
            );
            const pdfDocument = await loadingTask.promise;
            const firstPage = await pdfDocument.getPage(1);
            const baseViewport = firstPage.getViewport({ scale: 1 });
            const targetWidth = 44;
            const scale = targetWidth / Math.max(baseViewport.width, 1);
            const viewport = firstPage.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
              void pdfDocument.cleanup();
              void pdfDocument.destroy();
              continue;
            }

            canvas.width = Math.max(1, Math.round(viewport.width));
            canvas.height = Math.max(1, Math.round(viewport.height));

            await firstPage.render({
              canvas,
              canvasContext: context,
              viewport,
              background: 'rgb(255, 255, 255)',
            }).promise;

            void pdfDocument.cleanup();
            void pdfDocument.destroy();
            if (isCancelled) return;

            const coverDataUrl = canvas.toDataURL('image/png');
            setPendingComposerAttachments(prev =>
              prev.map(attachment =>
                attachment.id === pendingAttachment.id
                  ? { ...attachment, pdfCoverUrl: coverDataUrl }
                  : attachment
              )
            );
          }
        } catch (error) {
          console.error('Error rendering PDF cover preview:', error);
        }
      };

      void renderPdfCovers();

      return () => {
        isCancelled = true;
      };
    }, [pendingComposerAttachments]);

    useEffect(() => {
      if (previewComposerImageAttachment || !isComposerImageExpanded) return;
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }
      setIsComposerImageExpandedVisible(false);
      setIsComposerImageExpanded(false);
      setComposerImagePreviewAttachmentId(null);
    }, [isComposerImageExpanded, previewComposerImageAttachment]);

    useEffect(() => {
      if (!isComposerImageExpanded) return;

      const handleEscapeKey = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        setIsComposerImageExpandedVisible(false);
        if (composerImagePreviewCloseTimerRef.current) {
          window.clearTimeout(composerImagePreviewCloseTimerRef.current);
          composerImagePreviewCloseTimerRef.current = null;
        }
        composerImagePreviewCloseTimerRef.current = window.setTimeout(() => {
          setIsComposerImageExpanded(false);
          setComposerImagePreviewAttachmentId(null);
          composerImagePreviewCloseTimerRef.current = null;
        }, COMPOSER_IMAGE_PREVIEW_EXIT_DURATION);
      };

      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }, [isComposerImageExpanded]);

    const triggerMessageFlash = useCallback((messageId: string) => {
      if (flashMessageTimeoutRef.current) {
        clearTimeout(flashMessageTimeoutRef.current);
        flashMessageTimeoutRef.current = null;
      }

      setFlashingMessageId(messageId);
      setIsFlashHighlightVisible(true);

      flashMessageTimeoutRef.current = setTimeout(() => {
        setIsFlashHighlightVisible(false);
        setFlashingMessageId(currentId =>
          currentId === messageId ? null : currentId
        );
        flashMessageTimeoutRef.current = null;
      }, EDIT_TARGET_FLASH_PHASE_DURATION * 2);
    }, []);

    const clearPendingSearchFlash = useCallback(() => {
      if (pendingSearchFlashRafRef.current === null) return;
      cancelAnimationFrame(pendingSearchFlashRafRef.current);
      pendingSearchFlashRafRef.current = null;
    }, []);

    const triggerMessageFlashWhenScrollSettled = useCallback(
      (messageId: string) => {
        clearPendingSearchFlash();
        const waitStart = Date.now();
        const maxWaitMs = 900;
        const scrollSettleDelayMs = 24;
        let previousScrollTop: number | null = null;
        let lastScrollMovementAt = Date.now();

        const verifyVisibilityAndFlash = () => {
          const bubble = messageBubbleRefs.current.get(messageId);
          const container = messagesContainerRef.current;
          const bounds = getVisibleMessagesBounds();
          if (!bubble || !container || !bounds) {
            if (Date.now() - waitStart < maxWaitMs) {
              pendingSearchFlashRafRef.current = requestAnimationFrame(
                verifyVisibilityAndFlash
              );
            } else {
              pendingSearchFlashRafRef.current = null;
            }
            return;
          }

          const headerBottom =
            chatHeaderContainerRef.current?.getBoundingClientRect().bottom;
          const hasValidHeaderBottom =
            typeof headerBottom === 'number' &&
            Number.isFinite(headerBottom) &&
            headerBottom > bounds.containerRect.top &&
            headerBottom < bounds.containerRect.bottom;
          const minVisibleTop = hasValidHeaderBottom
            ? headerBottom + EDIT_TARGET_FOCUS_PADDING
            : bounds.containerRect.top + EDIT_TARGET_FOCUS_PADDING;
          const maxVisibleBottom =
            bounds.visibleBottom - EDIT_TARGET_FOCUS_PADDING;
          const bubbleRect = bubble.getBoundingClientRect();
          const isVisibleToUser =
            bubbleRect.bottom > minVisibleTop &&
            bubbleRect.top < maxVisibleBottom;

          const currentScrollTop = container.scrollTop;
          const scrollDelta =
            previousScrollTop === null
              ? 0
              : Math.abs(currentScrollTop - previousScrollTop);
          if (previousScrollTop === null || scrollDelta > 0.1) {
            lastScrollMovementAt = Date.now();
          }
          previousScrollTop = currentScrollTop;
          const isScrollSettled =
            Date.now() - lastScrollMovementAt >= scrollSettleDelayMs;

          if (isVisibleToUser && isScrollSettled) {
            pendingSearchFlashRafRef.current = null;
            triggerMessageFlash(messageId);
            return;
          }

          if (Date.now() - waitStart >= maxWaitMs) {
            pendingSearchFlashRafRef.current = null;
            triggerMessageFlash(messageId);
            return;
          }

          pendingSearchFlashRafRef.current = requestAnimationFrame(
            verifyVisibilityAndFlash
          );
        };

        pendingSearchFlashRafRef.current = requestAnimationFrame(
          verifyVisibilityAndFlash
        );
      },
      [clearPendingSearchFlash, getVisibleMessagesBounds, triggerMessageFlash]
    );

    const focusSearchTargetMessage = useCallback(
      (messageId: string) => {
        const bubble = messageBubbleRefs.current.get(messageId);
        const container = messagesContainerRef.current;
        const bounds = getVisibleMessagesBounds();
        if (!bubble || !container || !bounds) return;

        closeMessageMenu();
        const headerBottom =
          chatHeaderContainerRef.current?.getBoundingClientRect().bottom;
        const hasValidHeaderBottom =
          typeof headerBottom === 'number' &&
          Number.isFinite(headerBottom) &&
          headerBottom > bounds.containerRect.top &&
          headerBottom < bounds.containerRect.bottom;
        const minVisibleTop = hasValidHeaderBottom
          ? headerBottom + EDIT_TARGET_FOCUS_PADDING
          : bounds.containerRect.top + EDIT_TARGET_FOCUS_PADDING;
        const maxVisibleBottom =
          bounds.visibleBottom - EDIT_TARGET_FOCUS_PADDING;
        const bubbleRect = bubble.getBoundingClientRect();
        const isFullyVisible =
          bubbleRect.top >= minVisibleTop &&
          bubbleRect.bottom <= maxVisibleBottom;

        if (!isFullyVisible) {
          let scrollOffset = 0;
          if (bubbleRect.top < minVisibleTop) {
            scrollOffset = bubbleRect.top - minVisibleTop;
          } else if (bubbleRect.bottom > maxVisibleBottom) {
            scrollOffset = bubbleRect.bottom - maxVisibleBottom;
          }

          if (scrollOffset !== 0) {
            container.scrollTo({
              top: container.scrollTop + scrollOffset,
              behavior: 'auto',
            });
          }
        }
        triggerMessageFlashWhenScrollSettled(messageId);
      },
      [
        closeMessageMenu,
        getVisibleMessagesBounds,
        triggerMessageFlashWhenScrollSettled,
      ]
    );

    useEffect(() => {
      if (
        !isOpen ||
        !isMessageSearchMode ||
        !normalizedMessageSearchQuery ||
        !activeSearchMessageId
      ) {
        return;
      }

      const rafId = requestAnimationFrame(() => {
        focusSearchTargetMessage(activeSearchMessageId);
      });

      return () => {
        cancelAnimationFrame(rafId);
      };
    }, [
      activeSearchMessageId,
      focusSearchTargetMessage,
      isMessageSearchMode,
      isOpen,
      normalizedMessageSearchQuery,
      searchNavigationTick,
    ]);

    const focusEditingTargetMessage = useCallback(() => {
      if (!editingMessageId) return;
      closeMessageMenu();

      const bubble = messageBubbleRefs.current.get(editingMessageId);
      const container = messagesContainerRef.current;
      const bounds = getVisibleMessagesBounds();
      if (!bubble || !container || !bounds) {
        triggerMessageFlashWhenScrollSettled(editingMessageId);
        return;
      }

      const headerBottom =
        chatHeaderContainerRef.current?.getBoundingClientRect().bottom;
      const hasValidHeaderBottom =
        typeof headerBottom === 'number' &&
        Number.isFinite(headerBottom) &&
        headerBottom > bounds.containerRect.top &&
        headerBottom < bounds.containerRect.bottom;
      const minVisibleTop = hasValidHeaderBottom
        ? headerBottom + EDIT_TARGET_FOCUS_PADDING
        : bounds.containerRect.top + EDIT_TARGET_FOCUS_PADDING;
      const maxVisibleBottom = bounds.visibleBottom - EDIT_TARGET_FOCUS_PADDING;
      const bubbleRect = bubble.getBoundingClientRect();
      const isFullyVisible =
        bubbleRect.top >= minVisibleTop &&
        bubbleRect.bottom <= maxVisibleBottom;

      if (!isFullyVisible) {
        let scrollOffset = 0;
        if (bubbleRect.top < minVisibleTop) {
          scrollOffset = bubbleRect.top - minVisibleTop;
        } else if (bubbleRect.bottom > maxVisibleBottom) {
          scrollOffset = bubbleRect.bottom - maxVisibleBottom;
        }

        if (scrollOffset !== 0) {
          container.scrollTo({
            top: container.scrollTop + scrollOffset,
            behavior: 'smooth',
          });
        }
      }

      triggerMessageFlashWhenScrollSettled(editingMessageId);
    }, [
      closeMessageMenu,
      editingMessageId,
      getVisibleMessagesBounds,
      triggerMessageFlashWhenScrollSettled,
    ]);

    const closeAttachModal = useCallback(() => {
      setIsAttachModalOpen(false);
    }, []);

    const handleAttachButtonClick = useCallback(() => {
      if (isAttachModalOpen) {
        closeAttachModal();
        return;
      }

      closeMessageMenu();
      setIsAttachModalOpen(true);
    }, [isAttachModalOpen, closeAttachModal, closeMessageMenu]);

    const handleSendImageMessage = useCallback(
      async (file: File, captionText?: string): Promise<string | null> => {
        if (!user || !targetUser || !currentChannelId) return null;

        if (!file.type.startsWith('image/')) {
          toast.error('File harus berupa gambar', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
          return null;
        }

        if (editingMessageId) {
          toast.error('Selesaikan edit pesan terlebih dahulu', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
          return null;
        }

        const tempId = `temp_image_${Date.now()}`;
        const stableKey = `${user.id}-${Date.now()}-image`;
        const normalizedCaptionText = captionText?.trim() ?? '';
        const hasAttachmentCaption = normalizedCaptionText.length > 0;
        const captionTempId = hasAttachmentCaption
          ? `temp_caption_${Date.now()}`
          : null;
        const captionStableKey = hasAttachmentCaption
          ? `${stableKey}-caption`
          : null;
        const localPreviewUrl = URL.createObjectURL(file);
        pendingImagePreviewUrlsRef.current.set(tempId, localPreviewUrl);

        const optimisticMessage: ChatMessage = {
          id: tempId,
          sender_id: user.id,
          receiver_id: targetUser.id,
          channel_id: currentChannelId,
          message: localPreviewUrl,
          message_type: 'image',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_read: false,
          reply_to_id: null,
          sender_name: user.name || 'You',
          receiver_name: targetUser.name || 'Unknown',
          stableKey,
        };

        const optimisticCaptionMessage: ChatMessage | null =
          hasAttachmentCaption
            ? {
                id: captionTempId!,
                sender_id: user.id,
                receiver_id: targetUser.id,
                channel_id: currentChannelId,
                message: normalizedCaptionText,
                message_type: 'text',
                created_at: optimisticMessage.created_at,
                updated_at: optimisticMessage.updated_at,
                is_read: false,
                reply_to_id: tempId,
                sender_name: user.name || 'You',
                receiver_name: targetUser.name || 'Unknown',
                stableKey: captionStableKey!,
              }
            : null;

        setMessages(prev =>
          optimisticCaptionMessage
            ? [...prev, optimisticMessage, optimisticCaptionMessage]
            : [...prev, optimisticMessage]
        );
        setIsAtBottom(true);
        setHasNewMessages(false);
        triggerSendSuccessGlow();
        scheduleScrollMessagesToBottom();

        try {
          const imagePath = buildChatImagePath(currentChannelId, user.id, file);
          const { publicUrl } = await StorageService.uploadFile(
            CHAT_IMAGE_BUCKET,
            file,
            imagePath
          );

          const { data: newMessage, error } = await chatService.insertMessage({
            sender_id: user.id,
            receiver_id: targetUser.id,
            channel_id: currentChannelId,
            message: publicUrl,
            message_type: 'image',
          });

          if (error || !newMessage) {
            setMessages(prev =>
              prev.filter(
                msg =>
                  msg.id !== tempId &&
                  (!captionTempId || msg.id !== captionTempId)
              )
            );
            toast.error('Gagal mengirim gambar', {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
            return null;
          }

          const realMessage: ChatMessage = {
            ...newMessage,
            sender_name: user.name || 'You',
            receiver_name: targetUser.name || 'Unknown',
            stableKey,
          };

          setMessages(prev =>
            prev.map(msg => (msg.id === tempId ? realMessage : msg))
          );

          if (channelRef.current) {
            void channelRef.current.send({
              type: 'broadcast',
              event: 'new_message',
              payload: realMessage,
            });
          }

          if (hasAttachmentCaption && captionTempId) {
            const { data: captionMessage, error: captionError } =
              await chatService.insertMessage({
                sender_id: user.id,
                receiver_id: targetUser.id,
                channel_id: currentChannelId,
                message: normalizedCaptionText,
                message_type: 'text',
                reply_to_id: realMessage.id,
              });

            if (!captionError && captionMessage) {
              const mappedCaptionMessage: ChatMessage = {
                ...captionMessage,
                sender_name: user.name || 'You',
                receiver_name: targetUser.name || 'Unknown',
                stableKey: captionStableKey!,
              };

              setMessages(prev =>
                prev.map(msg =>
                  msg.id === captionTempId ? mappedCaptionMessage : msg
                )
              );

              if (channelRef.current) {
                void channelRef.current.send({
                  type: 'broadcast',
                  event: 'new_message',
                  payload: mappedCaptionMessage,
                });
              }
            } else {
              setMessages(prev => prev.filter(msg => msg.id !== captionTempId));
              toast.error('Gagal mengirim deskripsi lampiran', {
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              });
            }
          }

          return realMessage.id;
        } catch (error) {
          console.error('Error sending image message:', error);
          setMessages(prev =>
            prev.filter(
              msg =>
                msg.id !== tempId &&
                (!captionTempId || msg.id !== captionTempId)
            )
          );
          toast.error('Gagal mengirim gambar', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
          return null;
        } finally {
          const previewUrl = pendingImagePreviewUrlsRef.current.get(tempId);
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            pendingImagePreviewUrlsRef.current.delete(tempId);
          }
        }
      },
      [
        user,
        targetUser,
        currentChannelId,
        editingMessageId,
        triggerSendSuccessGlow,
        scheduleScrollMessagesToBottom,
      ]
    );

    const generatePdfPreviewFromFile = useCallback(
      async (file: File): Promise<GeneratedPdfPreview | null> => {
        let pdfDocument: {
          numPages: number;
          getPage: (pageNumber: number) => Promise<any>;
          cleanup: () => void;
          destroy: () => void;
        } | null = null;

        try {
          const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
          const pdfWorkerModule =
            await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url');
          pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerModule.default;

          const fileBuffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument(new Uint8Array(fileBuffer));
          const loadedPdfDocument = await loadingTask.promise;
          pdfDocument = loadedPdfDocument;

          const firstPage = await loadedPdfDocument.getPage(1);
          const baseViewport = firstPage.getViewport({ scale: 1 });
          const targetWidth = 260;
          const scale = targetWidth / Math.max(baseViewport.width, 1);
          const viewport = firstPage.getViewport({ scale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) return null;

          canvas.width = Math.max(1, Math.round(viewport.width));
          canvas.height = Math.max(1, Math.round(viewport.height));

          await firstPage.render({
            canvas,
            canvasContext: context,
            viewport,
            background: 'rgb(255, 255, 255)',
          }).promise;

          const coverBlob = await new Promise<Blob | null>(resolve => {
            canvas.toBlob(blob => {
              resolve(blob);
            }, 'image/png');
          });
          if (!coverBlob) return null;

          return {
            coverBlob,
            pageCount: Math.max(loadedPdfDocument.numPages ?? 1, 1),
          };
        } catch (error) {
          console.error('Error generating PDF preview from file:', error);
          return null;
        } finally {
          pdfDocument?.cleanup();
          pdfDocument?.destroy();
        }
      },
      []
    );

    const handleSendFileMessage = useCallback(
      async (
        pendingFile: PendingComposerFile,
        captionText?: string
      ): Promise<string | null> => {
        if (!user || !targetUser || !currentChannelId) return null;

        if (editingMessageId) {
          toast.error('Selesaikan edit pesan terlebih dahulu', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
          return null;
        }

        const tempId = `temp_file_${Date.now()}`;
        const stableKey = `${user.id}-${Date.now()}-file`;
        const normalizedCaptionText = captionText?.trim() ?? '';
        const hasAttachmentCaption = normalizedCaptionText.length > 0;
        const captionTempId = hasAttachmentCaption
          ? `temp_caption_${Date.now()}`
          : null;
        const captionStableKey = hasAttachmentCaption
          ? `${stableKey}-caption`
          : null;
        const filePath = buildChatFilePath(
          currentChannelId,
          user.id,
          pendingFile.file,
          pendingFile.fileKind
        );
        const isPdfDocument =
          pendingFile.fileKind === 'document' &&
          isPdfDocumentFile(pendingFile.fileName, pendingFile.mimeType);
        const localPreviewUrl = URL.createObjectURL(pendingFile.file);
        pendingImagePreviewUrlsRef.current.set(tempId, localPreviewUrl);

        const optimisticMessage: ChatMessage = {
          id: tempId,
          sender_id: user.id,
          receiver_id: targetUser.id,
          channel_id: currentChannelId,
          message: localPreviewUrl,
          message_type: 'file',
          file_name: pendingFile.fileName,
          file_kind: pendingFile.fileKind,
          file_mime_type: pendingFile.mimeType,
          file_size: pendingFile.file.size,
          file_storage_path: filePath,
          file_preview_status: isPdfDocument ? 'pending' : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_read: false,
          reply_to_id: null,
          sender_name: user.name || 'You',
          receiver_name: targetUser.name || 'Unknown',
          stableKey,
        };

        const optimisticCaptionMessage: ChatMessage | null =
          hasAttachmentCaption
            ? {
                id: captionTempId!,
                sender_id: user.id,
                receiver_id: targetUser.id,
                channel_id: currentChannelId,
                message: normalizedCaptionText,
                message_type: 'text',
                created_at: optimisticMessage.created_at,
                updated_at: optimisticMessage.updated_at,
                is_read: false,
                reply_to_id: tempId,
                sender_name: user.name || 'You',
                receiver_name: targetUser.name || 'Unknown',
                stableKey: captionStableKey!,
              }
            : null;

        setMessages(prev =>
          optimisticCaptionMessage
            ? [...prev, optimisticMessage, optimisticCaptionMessage]
            : [...prev, optimisticMessage]
        );
        setIsAtBottom(true);
        setHasNewMessages(false);
        triggerSendSuccessGlow();
        scheduleScrollMessagesToBottom();

        try {
          const { publicUrl } = await StorageService.uploadRawFile(
            CHAT_IMAGE_BUCKET,
            pendingFile.file,
            filePath,
            pendingFile.mimeType || undefined
          );

          const { data: newMessage, error } = await chatService.insertMessage({
            sender_id: user.id,
            receiver_id: targetUser.id,
            channel_id: currentChannelId,
            message: publicUrl,
            message_type: 'file',
            file_name: pendingFile.fileName,
            file_kind: pendingFile.fileKind,
            file_mime_type: pendingFile.mimeType,
            file_size: pendingFile.file.size,
            file_storage_path: filePath,
            file_preview_status: isPdfDocument ? 'pending' : null,
          });

          if (error || !newMessage) {
            setMessages(prev =>
              prev.filter(
                msg =>
                  msg.id !== tempId &&
                  (!captionTempId || msg.id !== captionTempId)
              )
            );
            toast.error(
              pendingFile.fileKind === 'audio'
                ? 'Gagal mengirim audio'
                : 'Gagal mengirim dokumen',
              {
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              }
            );
            return null;
          }

          const realMessage: ChatMessage = {
            ...newMessage,
            file_name: pendingFile.fileName,
            file_kind: pendingFile.fileKind,
            file_mime_type: pendingFile.mimeType,
            file_size: pendingFile.file.size,
            file_storage_path: filePath,
            file_preview_status: isPdfDocument ? 'pending' : null,
            sender_name: user.name || 'You',
            receiver_name: targetUser.name || 'Unknown',
            stableKey,
          };

          setMessages(prev =>
            prev.map(msg => (msg.id === tempId ? realMessage : msg))
          );

          if (channelRef.current) {
            void channelRef.current.send({
              type: 'broadcast',
              event: 'new_message',
              payload: realMessage,
            });
          }

          if (isPdfDocument) {
            void (async () => {
              const mergeAndBroadcastPreviewUpdate = (payload: ChatMessage) => {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === payload.id ? { ...msg, ...payload } : msg
                  )
                );
                if (channelRef.current) {
                  void channelRef.current.send({
                    type: 'broadcast',
                    event: 'update_message',
                    payload,
                  });
                }
              };

              const applyPreviewFailedState = async (
                errorMessage: string
              ): Promise<void> => {
                const {
                  data: failedPreviewMessage,
                  error: failedPreviewError,
                } = await chatService.updateMessage(realMessage.id, {
                  file_preview_status: 'failed',
                  file_preview_error: errorMessage,
                });
                if (failedPreviewError || !failedPreviewMessage) return;

                const mappedFailedPreviewMessage: ChatMessage = {
                  ...failedPreviewMessage,
                  sender_name: user.name || 'You',
                  receiver_name: targetUser.name || 'Unknown',
                  stableKey,
                };
                mergeAndBroadcastPreviewUpdate(mappedFailedPreviewMessage);
              };

              try {
                const generatedPreview = await generatePdfPreviewFromFile(
                  pendingFile.file
                );
                if (!generatedPreview) {
                  await applyPreviewFailedState('Gagal membuat preview PDF');
                  return;
                }

                const previewPath = buildPdfPreviewStoragePath(filePath);
                const previewFileNameBase =
                  pendingFile.fileName.replace(/\.[^./]+$/, '') || 'preview';
                const previewFile = new File(
                  [generatedPreview.coverBlob],
                  `${previewFileNameBase}.png`,
                  { type: 'image/png' }
                );

                const { publicUrl: previewUrl } =
                  await StorageService.uploadRawFile(
                    CHAT_IMAGE_BUCKET,
                    previewFile,
                    previewPath,
                    'image/png'
                  );

                const { data: previewReadyMessage, error: previewReadyError } =
                  await chatService.updateMessage(realMessage.id, {
                    file_preview_url: previewUrl,
                    file_preview_page_count: generatedPreview.pageCount,
                    file_preview_status: 'ready',
                    file_preview_error: null,
                  });
                if (previewReadyError || !previewReadyMessage) return;

                const mappedPreviewReadyMessage: ChatMessage = {
                  ...previewReadyMessage,
                  sender_name: user.name || 'You',
                  receiver_name: targetUser.name || 'Unknown',
                  stableKey,
                };
                mergeAndBroadcastPreviewUpdate(mappedPreviewReadyMessage);
              } catch (error) {
                console.error('Error processing PDF preview metadata:', error);
                await applyPreviewFailedState('Gagal memproses preview PDF');
              }
            })();
          }

          if (hasAttachmentCaption && captionTempId) {
            const { data: captionMessage, error: captionError } =
              await chatService.insertMessage({
                sender_id: user.id,
                receiver_id: targetUser.id,
                channel_id: currentChannelId,
                message: normalizedCaptionText,
                message_type: 'text',
                reply_to_id: realMessage.id,
              });

            if (!captionError && captionMessage) {
              const mappedCaptionMessage: ChatMessage = {
                ...captionMessage,
                sender_name: user.name || 'You',
                receiver_name: targetUser.name || 'Unknown',
                stableKey: captionStableKey!,
              };

              setMessages(prev =>
                prev.map(msg =>
                  msg.id === captionTempId ? mappedCaptionMessage : msg
                )
              );

              if (channelRef.current) {
                void channelRef.current.send({
                  type: 'broadcast',
                  event: 'new_message',
                  payload: mappedCaptionMessage,
                });
              }
            } else {
              setMessages(prev => prev.filter(msg => msg.id !== captionTempId));
              toast.error('Gagal mengirim deskripsi lampiran', {
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              });
            }
          }

          return realMessage.id;
        } catch (error) {
          console.error('Error sending file message:', error);
          setMessages(prev =>
            prev.filter(
              msg =>
                msg.id !== tempId &&
                (!captionTempId || msg.id !== captionTempId)
            )
          );
          toast.error(
            pendingFile.fileKind === 'audio'
              ? 'Gagal mengirim audio'
              : 'Gagal mengirim dokumen',
            {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            }
          );
          return null;
        } finally {
          const previewUrl = pendingImagePreviewUrlsRef.current.get(tempId);
          if (previewUrl) {
            if (isPdfDocument) {
              window.setTimeout(() => {
                URL.revokeObjectURL(previewUrl);
              }, 30_000);
            } else {
              URL.revokeObjectURL(previewUrl);
            }
            pendingImagePreviewUrlsRef.current.delete(tempId);
          }
        }
      },
      [
        user,
        targetUser,
        currentChannelId,
        editingMessageId,
        generatePdfPreviewFromFile,
        triggerSendSuccessGlow,
        scheduleScrollMessagesToBottom,
      ]
    );

    const removePendingComposerAttachment = useCallback(
      (attachmentId: string) => {
        setPendingComposerAttachments(prevAttachments => {
          const targetAttachment = prevAttachments.find(
            attachment => attachment.id === attachmentId
          );
          if (targetAttachment?.previewUrl) {
            URL.revokeObjectURL(targetAttachment.previewUrl);
          }
          return prevAttachments.filter(
            attachment => attachment.id !== attachmentId
          );
        });
        setComposerImagePreviewAttachmentId(currentId =>
          currentId === attachmentId ? null : currentId
        );
        replaceComposerImageAttachmentIdRef.current =
          replaceComposerImageAttachmentIdRef.current === attachmentId
            ? null
            : replaceComposerImageAttachmentIdRef.current;
        replaceComposerDocumentAttachmentIdRef.current =
          replaceComposerDocumentAttachmentIdRef.current === attachmentId
            ? null
            : replaceComposerDocumentAttachmentIdRef.current;
      },
      []
    );

    const clearPendingComposerAttachments = useCallback(() => {
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }
      setIsComposerImageExpandedVisible(false);
      setIsComposerImageExpanded(false);
      setComposerImagePreviewAttachmentId(null);
      replaceComposerImageAttachmentIdRef.current = null;
      replaceComposerDocumentAttachmentIdRef.current = null;
      setPendingComposerAttachments(prevAttachments => {
        prevAttachments.forEach(attachment => {
          if (attachment.previewUrl) {
            URL.revokeObjectURL(attachment.previewUrl);
          }
        });
        return [];
      });
    }, []);

    const closeComposerImagePreview = useCallback(() => {
      setIsComposerImageExpandedVisible(false);
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }
      composerImagePreviewCloseTimerRef.current = window.setTimeout(() => {
        setIsComposerImageExpanded(false);
        setComposerImagePreviewAttachmentId(null);
        composerImagePreviewCloseTimerRef.current = null;
      }, COMPOSER_IMAGE_PREVIEW_EXIT_DURATION);
    }, []);

    const openComposerImagePreview = useCallback(
      (attachmentId: string) => {
        const targetAttachment = pendingComposerAttachments.find(
          attachment =>
            attachment.id === attachmentId && attachment.fileKind === 'image'
        );
        if (!targetAttachment) return;

        closeAttachModal();
        closeMessageMenu();
        if (composerImagePreviewCloseTimerRef.current) {
          window.clearTimeout(composerImagePreviewCloseTimerRef.current);
          composerImagePreviewCloseTimerRef.current = null;
        }
        setComposerImagePreviewAttachmentId(attachmentId);
        setIsComposerImageExpanded(true);
        window.requestAnimationFrame(() => {
          setIsComposerImageExpandedVisible(true);
        });
      },
      [closeAttachModal, closeMessageMenu, pendingComposerAttachments]
    );

    const queueComposerImage = useCallback(
      (file: File, replaceAttachmentId?: string) => {
        if (!file.type.startsWith('image/')) {
          toast.error('File harus berupa gambar', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
          return false;
        }

        if (editingMessageId) {
          toast.error('Selesaikan edit pesan terlebih dahulu', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
          return false;
        }

        const mimeSubtype = file.type.split('/')[1];
        const extensionFromName = file.name.split('.').pop();
        const fileTypeLabel = (
          mimeSubtype ||
          extensionFromName ||
          'image'
        ).toUpperCase();
        const nextAttachment: PendingComposerAttachment = {
          id: `pending_image_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          fileName: file.name || 'Gambar',
          fileTypeLabel,
          fileKind: 'image',
          mimeType: file.type,
          pdfCoverUrl: null,
        };
        let exceededAttachmentLimit = false;

        setPendingComposerAttachments(prevAttachments => {
          if (replaceAttachmentId) {
            const replaceIndex = prevAttachments.findIndex(
              attachment =>
                attachment.id === replaceAttachmentId &&
                attachment.fileKind === 'image'
            );
            if (replaceIndex !== -1) {
              const targetAttachment = prevAttachments[replaceIndex];
              if (targetAttachment.previewUrl) {
                URL.revokeObjectURL(targetAttachment.previewUrl);
              }
              const nextAttachments = [...prevAttachments];
              nextAttachments[replaceIndex] = nextAttachment;
              return nextAttachments;
            }
          }

          if (prevAttachments.length >= MAX_PENDING_COMPOSER_ATTACHMENTS) {
            exceededAttachmentLimit = true;
            return prevAttachments;
          }

          return [...prevAttachments, nextAttachment];
        });

        if (exceededAttachmentLimit) {
          if (nextAttachment.previewUrl) {
            URL.revokeObjectURL(nextAttachment.previewUrl);
          }
          toast.error(
            `Maksimal ${MAX_PENDING_COMPOSER_ATTACHMENTS} lampiran dalam satu kirim`,
            {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            }
          );
          return false;
        }

        requestAnimationFrame(() => {
          const textarea = messageInputRef.current;
          if (!textarea) return;

          textarea.focus();
          const cursorPosition = textarea.value.length;
          textarea.setSelectionRange(cursorPosition, cursorPosition);
        });

        return true;
      },
      [editingMessageId]
    );

    const queueComposerFile = useCallback(
      (
        file: File,
        fileKind: ComposerPendingFileKind,
        replaceAttachmentId?: string
      ) => {
        const isAudioFile = file.type.startsWith('audio/');
        if (fileKind === 'audio' && !isAudioFile) {
          toast.error('File harus berupa audio', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
          return false;
        }

        if (editingMessageId) {
          toast.error('Selesaikan edit pesan terlebih dahulu', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
          return false;
        }

        const mimeSubtype = file.type.split('/')[1];
        const extensionFromName = file.name.split('.').pop();
        const fileTypeLabel = (
          mimeSubtype ||
          extensionFromName ||
          (fileKind === 'audio' ? 'audio' : 'document')
        ).toUpperCase();
        const nextAttachment: PendingComposerAttachment = {
          id: `pending_file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          file,
          fileName: file.name || (fileKind === 'audio' ? 'Audio' : 'Dokumen'),
          fileTypeLabel,
          fileKind,
          mimeType: file.type,
          previewUrl: null,
          pdfCoverUrl: null,
        };
        let exceededAttachmentLimit = false;

        setPendingComposerAttachments(prevAttachments => {
          if (replaceAttachmentId) {
            const replaceIndex = prevAttachments.findIndex(
              attachment =>
                attachment.id === replaceAttachmentId &&
                attachment.fileKind === fileKind
            );
            if (replaceIndex !== -1) {
              const targetAttachment = prevAttachments[replaceIndex];
              if (targetAttachment.previewUrl) {
                URL.revokeObjectURL(targetAttachment.previewUrl);
              }
              const nextAttachments = [...prevAttachments];
              nextAttachments[replaceIndex] = nextAttachment;
              return nextAttachments;
            }
          }

          if (prevAttachments.length >= MAX_PENDING_COMPOSER_ATTACHMENTS) {
            exceededAttachmentLimit = true;
            return prevAttachments;
          }
          return [...prevAttachments, nextAttachment];
        });

        if (exceededAttachmentLimit) {
          toast.error(
            `Maksimal ${MAX_PENDING_COMPOSER_ATTACHMENTS} lampiran dalam satu kirim`,
            {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            }
          );
          return false;
        }

        requestAnimationFrame(() => {
          const textarea = messageInputRef.current;
          if (!textarea) return;

          textarea.focus();
          const cursorPosition = textarea.value.length;
          textarea.setSelectionRange(cursorPosition, cursorPosition);
        });

        return true;
      },
      [editingMessageId]
    );

    const handleAttachImageClick = useCallback(
      (replaceAttachmentId?: string) => {
        replaceComposerImageAttachmentIdRef.current =
          replaceAttachmentId ?? null;
        replaceComposerDocumentAttachmentIdRef.current = null;
        closeAttachModal();
        imageInputRef.current?.click();
      },
      [closeAttachModal]
    );

    const handleAttachDocumentClick = useCallback(
      (replaceAttachmentId?: string) => {
        replaceComposerImageAttachmentIdRef.current = null;
        replaceComposerDocumentAttachmentIdRef.current =
          replaceAttachmentId ?? null;
        closeAttachModal();
        documentInputRef.current?.click();
      },
      [closeAttachModal]
    );

    const handleAttachAudioClick = useCallback(() => {
      closeAttachModal();
      replaceComposerImageAttachmentIdRef.current = null;
      replaceComposerDocumentAttachmentIdRef.current = null;
      audioInputRef.current?.click();
    }, [closeAttachModal]);

    const handleImageFileChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (selectedFiles.length === 0) return;

        const replaceAttachmentId = replaceComposerImageAttachmentIdRef.current;
        replaceComposerImageAttachmentIdRef.current = null;
        replaceComposerDocumentAttachmentIdRef.current = null;

        for (const [fileIndex, selectedFile] of selectedFiles.entries()) {
          const didQueue = queueComposerImage(
            selectedFile,
            fileIndex === 0 ? (replaceAttachmentId ?? undefined) : undefined
          );
          if (!didQueue) break;
        }
      },
      [queueComposerImage]
    );

    const handleDocumentFileChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (selectedFiles.length === 0) return;

        const replaceAttachmentId =
          replaceComposerDocumentAttachmentIdRef.current;
        replaceComposerDocumentAttachmentIdRef.current = null;

        for (const [fileIndex, selectedFile] of selectedFiles.entries()) {
          const didQueue = queueComposerFile(
            selectedFile,
            'document',
            fileIndex === 0 ? (replaceAttachmentId ?? undefined) : undefined
          );
          if (!didQueue) break;
        }
      },
      [queueComposerFile]
    );

    const handleAudioFileChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (selectedFiles.length === 0) return;
        replaceComposerDocumentAttachmentIdRef.current = null;
        for (const selectedFile of selectedFiles) {
          const didQueue = queueComposerFile(selectedFile, 'audio');
          if (!didQueue) break;
        }
      },
      [queueComposerFile]
    );

    const handleComposerPaste = useCallback(
      (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const imageItem = Array.from(event.clipboardData.items).find(item =>
          item.type.startsWith('image/')
        );
        if (!imageItem) return;

        const imageFile = imageItem.getAsFile();
        if (!imageFile) return;

        event.preventDefault();
        closeAttachModal();
        closeMessageMenu();
        queueComposerImage(imageFile);
      },
      [closeAttachModal, closeMessageMenu, queueComposerImage]
    );

    useEffect(() => {
      if (!isAttachModalOpen) return;

      const handleMouseDown = (event: MouseEvent) => {
        const eventTarget = event.target;
        if (!(eventTarget instanceof Node)) return;
        if (eventTarget instanceof Element) {
          const profileLayer = eventTarget.closest(
            '[data-profile-trigger="true"], [data-profile-portal="true"]'
          );
          if (profileLayer) return;
        }

        if (attachModalRef.current?.contains(eventTarget)) return;
        if (attachButtonRef.current?.contains(eventTarget)) return;

        closeAttachModal();
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          closeAttachModal();
        }
      };

      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isAttachModalOpen, closeAttachModal]);

    // Handle browser tab close/refresh
    useEffect(() => {
      const handleBeforeUnload = () => {
        if (!hasClosedRef.current && user) {
          // Perform synchronous close operations for page unload
          hasClosedRef.current = true;
          void updateUserChatClose();
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () =>
        window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [user, updateUserChatClose]);

    // Note: isOpen change detection moved to priority effect above

    // Check if user is at bottom of chat
    const checkIfAtBottom = useCallback(() => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } =
          messagesContainerRef.current;
        const threshold = 100; // pixels from bottom - increased for better detection
        const isAtBottom =
          Math.abs(scrollHeight - scrollTop - clientHeight) <= threshold;
        return isAtBottom;
      }
      /* c8 ignore next */
      return true;
    }, []);

    const checkIfAtTop = useCallback(() => {
      if (messagesContainerRef.current) {
        const { scrollTop } = messagesContainerRef.current;
        // Hysteresis avoids flicker near the top boundary.
        if (atTopVisibilityRef.current) {
          return scrollTop <= 14;
        }
        return scrollTop <= 2;
      }
      /* c8 ignore next */
      return true;
    }, []);

    // Handle scroll events
    const handleScroll = useCallback(() => {
      // Use requestAnimationFrame to ensure the check happens after the scroll event
      /* c8 ignore next 7 */
      requestAnimationFrame(() => {
        const atBottom = checkIfAtBottom();
        const atTop = checkIfAtTop();
        atTopVisibilityRef.current = atTop;
        setIsAtBottom(atBottom);
        setIsAtTop(atTop);
        void markVisibleIncomingMessagesAsRead();
        if (atBottom) {
          setHasNewMessages(false);
        }
      });
    }, [checkIfAtBottom, checkIfAtTop, markVisibleIncomingMessagesAsRead]);

    useEffect(() => {
      if (!isOpen) return;

      const rafId = requestAnimationFrame(() => {
        void markVisibleIncomingMessagesAsRead();
      });

      return () => {
        cancelAnimationFrame(rafId);
      };
    }, [
      isOpen,
      messageInputHeight,
      composerContextualOffset,
      markVisibleIncomingMessagesAsRead,
      messages,
    ]);

    // Auto-scroll to bottom only if user is at bottom
    useEffect(() => {
      if (
        shouldPinToBottomOnOpenRef.current ||
        !hasCompletedInitialOpenLoadRef.current
      )
        return;

      if (messages.length > 0) {
        if (isAtBottom) {
          // User was at bottom, auto-scroll and don't show arrow
          scheduleScrollMessagesToBottom();
          setHasNewMessages(false);
        } else {
          // User was not at bottom, show arrow
          /* c8 ignore next */
          setHasNewMessages(true);
        }
      }
    }, [messages, isAtBottom, scheduleScrollMessagesToBottom]);

    useLayoutEffect(() => {
      if (!isOpen || !shouldPinToBottomOnOpenRef.current) return;

      scrollMessagesToBottom('auto');
      setIsAtBottom(true);
      const atTop = checkIfAtTop();
      atTopVisibilityRef.current = atTop;
      setIsAtTop(atTop);
      setHasNewMessages(false);

      if (hasCompletedInitialOpenLoadRef.current && !loading) {
        shouldPinToBottomOnOpenRef.current = false;
      }
    }, [
      checkIfAtTop,
      isOpen,
      loading,
      messages,
      messageInputHeight,
      scrollMessagesToBottom,
    ]);

    // Add scroll event listener
    useEffect(() => {
      const container = messagesContainerRef.current;
      if (container) {
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
      }
    }, [handleScroll]);

    const focusMessageComposer = useCallback(() => {
      const textarea = messageInputRef.current;
      if (!textarea) return;

      textarea.focus();
      const cursorPosition = textarea.value.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    }, []);

    const handleChatPortalBackgroundClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement;
        if (!target) return;

        if (
          target.closest(
            'button, [role="button"], a, input, textarea, select, [contenteditable="true"]'
          )
        ) {
          return;
        }

        focusMessageComposer();
      },
      [focusMessageComposer]
    );

    // Initialize scroll pinning when chat opens or active conversation changes
    useEffect(() => {
      if (!isOpen || !currentChannelId) return;

      shouldPinToBottomOnOpenRef.current = true;
      hasCompletedInitialOpenLoadRef.current = false;
      setIsAtBottom(true);
      setHasNewMessages(false);
    }, [isOpen, currentChannelId]);

    useEffect(() => {
      if (!isOpen) return;

      const rafId = requestAnimationFrame(focusMessageComposer);
      const timeoutId = setTimeout(focusMessageComposer, 120);

      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timeoutId);
      };
    }, [isOpen, focusMessageComposer]);

    // Scroll to bottom function
    /* c8 ignore next 5 */
    const scrollToBottom = () => {
      scrollMessagesToBottom('smooth');
      setHasNewMessages(false);
      setIsAtBottom(true);
    };

    const handleUpdateMessage = async () => {
      if (
        !message.trim() ||
        !user ||
        !targetUser ||
        !currentChannelId ||
        !editingMessageId
      )
        return;

      const messageId = editingMessageId;
      const updatedText = message.trim();
      const updatedAt = new Date().toISOString();
      const existingMessage = messages.find(msg => msg.id === messageId);

      setMessage('');
      setEditingMessageId(null);
      closeMessageMenu();

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, message: updatedText, updated_at: updatedAt }
            : msg
        )
      );

      if (messageId.startsWith('temp_')) return;

      try {
        const { data: updatedMessage, error } = await chatService.updateMessage(
          messageId,
          {
            message: updatedText,
            updated_at: updatedAt,
          }
        );

        if (error) {
          console.error('Error updating message:', error);
          return;
        }

        const mappedMessage: ChatMessage = {
          ...(updatedMessage as ChatMessage),
          sender_name: existingMessage?.sender_name || user.name || 'You',
          receiver_name:
            existingMessage?.receiver_name || targetUser.name || 'Unknown',
          stableKey: existingMessage?.stableKey,
        };

        setMessages(prev =>
          prev.map(msg => (msg.id === messageId ? mappedMessage : msg))
        );

        if (channelRef.current) {
          void channelRef.current.send({
            type: 'broadcast',
            event: 'update_message',
            payload: mappedMessage,
          });
        }
      } catch (error) {
        console.error('Error updating message:', error);
      }
    };

    const handleDeleteMessage = async (targetMessage: ChatMessage) => {
      if (!user || !targetUser || !currentChannelId) return;

      closeMessageMenu();
      const linkedCaptionMessageIds = messages
        .filter(
          message =>
            message.message_type === 'text' &&
            message.reply_to_id === targetMessage.id &&
            message.sender_id === targetMessage.sender_id &&
            message.receiver_id === targetMessage.receiver_id &&
            message.channel_id === targetMessage.channel_id
        )
        .map(message => message.id);
      const messageIdsToDelete = [targetMessage.id, ...linkedCaptionMessageIds];

      setMessages(prev =>
        prev.filter(message => !messageIdsToDelete.includes(message.id))
      );

      if (editingMessageId && messageIdsToDelete.includes(editingMessageId)) {
        setEditingMessageId(null);
        setMessage('');
      }

      const persistedMessageIds = messageIdsToDelete.filter(
        messageId => !messageId.startsWith('temp_')
      );
      if (persistedMessageIds.length === 0) return;

      try {
        for (const messageId of persistedMessageIds) {
          const { error } = await chatService.deleteMessage(messageId);
          if (error) {
            console.error('Error deleting message:', error);
            return;
          }
        }

        if (channelRef.current) {
          persistedMessageIds.forEach(messageId => {
            void channelRef.current?.send({
              type: 'broadcast',
              event: 'delete_message',
              payload: { id: messageId },
            });
          });
        }
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    };

    const handleEditMessage = (targetMessage: ChatMessage) => {
      clearPendingComposerAttachments();
      setEditingMessageId(targetMessage.id);
      setMessage(targetMessage.message);
      closeMessageMenu();
      requestAnimationFrame(focusMessageComposer);
      setTimeout(focusMessageComposer, 60);
    };

    const handleCancelEditMessage = useCallback(() => {
      setEditingMessageId(null);
      setMessage('');
      closeMessageMenu();
      requestAnimationFrame(focusMessageComposer);
    }, [closeMessageMenu, focusMessageComposer]);

    const handleCopyMessage = useCallback(
      async (targetMessage: ChatMessage) => {
        try {
          if (targetMessage.message_type === 'image') {
            const clipboardWithWrite = navigator.clipboard as Clipboard & {
              write?: (items: ClipboardItem[]) => Promise<void>;
            };
            const writeImageToClipboard = clipboardWithWrite.write?.bind(
              navigator.clipboard
            );
            const canCopyBinaryImage =
              typeof ClipboardItem !== 'undefined' &&
              typeof writeImageToClipboard === 'function';

            if (!canCopyBinaryImage) {
              throw new Error('Clipboard image write is not supported');
            }

            const response = await fetch(targetMessage.message);
            if (!response.ok) {
              throw new Error('Failed to fetch image for clipboard');
            }

            const imageBlob = await response.blob();
            const clipboardPayload = await getClipboardImagePayload(imageBlob);
            await writeImageToClipboard([
              new ClipboardItem({
                [clipboardPayload.mimeType]: clipboardPayload.blob,
              }),
            ]);

            toast.success('Gambar berhasil disalin', {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
            return;
          }

          await navigator.clipboard.writeText(targetMessage.message);
          toast.success('Pesan berhasil disalin', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
        } catch (error) {
          console.error('Error copying message:', error);
          toast.error(
            targetMessage.message_type === 'image'
              ? 'Gagal menyalin gambar ke clipboard'
              : 'Gagal menyalin pesan',
            {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            }
          );
        } finally {
          closeMessageMenu();
        }
      },
      [closeMessageMenu]
    );

    const handleCopySelectedMessages = useCallback(async () => {
      if (selectedVisibleMessages.length === 0) {
        toast.error('Pilih minimal 1 pesan untuk disalin', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return;
      }

      const formatTimestamp = (timestamp: string) => {
        const parsedTimestamp = new Date(timestamp);
        if (!Number.isFinite(parsedTimestamp.getTime())) return timestamp;

        return parsedTimestamp.toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      };

      const serializedMessages = selectedVisibleMessages
        .map(messageItem => {
          const senderLabel =
            messageItem.sender_name ||
            (messageItem.sender_id === user?.id
              ? user?.name || 'You'
              : targetUser?.name || 'Unknown');
          const timestamp = formatTimestamp(messageItem.created_at);
          const fragments: string[] = [];

          if (messageItem.message_type === 'text') {
            fragments.push(messageItem.message);
          } else if (messageItem.message_type === 'image') {
            fragments.push(`[Gambar] ${messageItem.message}`);
          } else if (messageItem.message_type === 'file') {
            fragments.push(
              `[File: ${getAttachmentFileName(messageItem)}] ${messageItem.message}`
            );
          }

          const attachmentCaption = captionMessagesByAttachmentId
            .get(messageItem.id)
            ?.message?.trim();
          if (attachmentCaption) {
            fragments.push(`Caption: ${attachmentCaption}`);
          }

          return `${senderLabel} | ${timestamp}\n${fragments.join('\n')}`;
        })
        .join('\n\n')
        .trim();

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
      selectedVisibleMessages,
      targetUser?.name,
      user?.id,
      user?.name,
    ]);

    const handleDeleteSelectedMessages = async () => {
      if (!user) return;

      const deletableMessages = selectedVisibleMessages.filter(
        messageItem => messageItem.sender_id === user.id
      );

      if (deletableMessages.length === 0) {
        toast.error('Pilih minimal 1 pesan Anda untuk dihapus', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return;
      }

      for (const messageItem of deletableMessages) {
        await handleDeleteMessage(messageItem);
      }

      const deletedMessageIds = new Set(
        deletableMessages.map(messageItem => messageItem.id)
      );
      setSelectedMessageIds(previousSelectedIds => {
        const nextSelectedIds = new Set<string>();
        previousSelectedIds.forEach(messageId => {
          if (!deletedMessageIds.has(messageId)) {
            nextSelectedIds.add(messageId);
          }
        });
        return nextSelectedIds;
      });

      toast.success(`${deletableMessages.length} pesan berhasil dihapus`, {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
    };

    const handleDownloadMessage = useCallback(
      async (targetMessage: ChatMessage) => {
        const fileUrl = targetMessage.message;
        const fileName = getAttachmentFileName(targetMessage);

        if (!fileUrl) {
          toast.error('File tidak tersedia untuk diunduh', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
          closeMessageMenu();
          return;
        }

        try {
          await toast.promise(
            (async () => {
              const response = await fetch(fileUrl);
              if (!response.ok) {
                throw new Error('Failed to fetch file for download');
              }

              const fileBlob = await response.blob();
              const objectUrl = URL.createObjectURL(fileBlob);
              const link = document.createElement('a');

              link.href = objectUrl;
              link.download = fileName;
              link.rel = 'noreferrer';
              document.body.append(link);
              link.click();
              link.remove();

              window.setTimeout(() => {
                URL.revokeObjectURL(objectUrl);
              }, 1500);
            })(),
            {
              loading: 'Menyiapkan unduhan...',
              success: 'Unduhan dimulai',
              error: 'Gagal mengunduh file',
            },
            {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            }
          );
        } catch (error) {
          console.error('Error downloading file:', error);
        } finally {
          closeMessageMenu();
        }
      },
      [closeMessageMenu]
    );

    const resizeMessageInput = useCallback(
      (value: string) => {
        const textarea = messageInputRef.current;
        if (!textarea) return;

        if (messageInputHeightRafRef.current !== null) {
          cancelAnimationFrame(messageInputHeightRafRef.current);
          messageInputHeightRafRef.current = null;
        }

        const currentHeight =
          textarea.getBoundingClientRect().height || MESSAGE_INPUT_MIN_HEIGHT;
        textarea.style.height = 'auto';

        const hasValue = value.length > 0;
        const isOverflowingCurrentLayout =
          hasValue && textarea.scrollHeight > MESSAGE_INPUT_MIN_HEIGHT + 2;
        const currentThreshold = inlineOverflowThresholdRef.current;

        if (!hasValue) {
          inlineOverflowThresholdRef.current = null;
        } else if (
          composerLayoutMode === 'inline' &&
          isOverflowingCurrentLayout
        ) {
          if (currentThreshold === null || value.length < currentThreshold) {
            inlineOverflowThresholdRef.current = value.length;
          }
        } else if (
          currentThreshold !== null &&
          value.length < currentThreshold
        ) {
          inlineOverflowThresholdRef.current = null;
        }

        const contentHeight = hasValue
          ? textarea.scrollHeight
          : MESSAGE_INPUT_MIN_HEIGHT;
        const nextHeight = Math.min(
          Math.max(contentHeight, MESSAGE_INPUT_MIN_HEIGHT),
          MESSAGE_INPUT_MAX_HEIGHT
        );

        const isOverflowingMaxHeight = contentHeight > MESSAGE_INPUT_MAX_HEIGHT;
        textarea.style.overflowY = isOverflowingMaxHeight ? 'auto' : 'hidden';
        if (!isOverflowingMaxHeight) {
          textarea.scrollTop = 0;
        }

        const shouldAnimateHeight =
          Math.abs(nextHeight - currentHeight) > 0.5 &&
          messageInputHeight !== nextHeight;
        if (shouldAnimateHeight) {
          textarea.style.height = `${currentHeight}px`;
          messageInputHeightRafRef.current = requestAnimationFrame(() => {
            const currentTextarea = messageInputRef.current;
            if (currentTextarea) {
              currentTextarea.style.height = `${nextHeight}px`;
            }
            messageInputHeightRafRef.current = null;
          });
        } else {
          textarea.style.height = `${nextHeight}px`;
        }

        setMessageInputHeight(prevHeight =>
          prevHeight === nextHeight ? prevHeight : nextHeight
        );
      },
      [composerLayoutMode, messageInputHeight]
    );

    useLayoutEffect(() => {
      if (!isOpen) return;
      resizeMessageInput(message);
    }, [isOpen, message, resizeMessageInput]);

    useEffect(() => {
      return () => {
        if (messageInputHeightRafRef.current !== null) {
          cancelAnimationFrame(messageInputHeightRafRef.current);
          messageInputHeightRafRef.current = null;
        }
      };
    }, []);

    useLayoutEffect(() => {
      const nextMode = isTargetMultiline ? 'multiline' : 'inline';
      setComposerLayoutMode(prevMode =>
        prevMode === nextMode ? prevMode : nextMode
      );
    }, [isTargetMultiline]);

    const sendTextMessage = useCallback(
      async (messageText: string, replyToId?: string | null) => {
        if (!user || !targetUser || !currentChannelId) return false;

        if (!messageText.trim()) return false;

        const normalizedMessageText = messageText.trim();
        setMessage(''); // Clear input immediately for better UX

        const tempId = `temp_${Date.now()}`;
        const stableKey = `${user.id}-${Date.now()}-${normalizedMessageText.slice(0, 10)}`;

        // Optimistic update - show message immediately
        const optimisticMessage: ChatMessage = {
          id: tempId,
          sender_id: user.id,
          receiver_id: targetUser.id,
          channel_id: currentChannelId,
          message: normalizedMessageText,
          message_type: 'text',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_read: false,
          reply_to_id: replyToId ?? null,
          sender_name: user.name || 'You',
          receiver_name: targetUser.name || 'Unknown',
          // Add stable key for consistent animation
          stableKey,
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setIsAtBottom(true);
        setHasNewMessages(false);
        triggerSendSuccessGlow();
        scheduleScrollMessagesToBottom();

        try {
          // Insert message into database (simplified query)
          const { data: newMessage, error } = await chatService.insertMessage({
            sender_id: user.id,
            receiver_id: targetUser.id,
            channel_id: currentChannelId,
            message: normalizedMessageText,
            message_type: 'text',
            ...(replyToId ? { reply_to_id: replyToId } : {}),
          });

          if (error) {
            console.error('Error sending message:', error);
            // Remove optimistic message and restore input
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            setMessage(normalizedMessageText);
            return false;
          }

          if (!newMessage) {
            console.error('Error sending message: missing response data');
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            setMessage(normalizedMessageText);
            return false;
          }

          // Replace optimistic message with real message (keep same stableKey)
          const realMessage: ChatMessage = {
            ...newMessage,
            sender_name: user.name || 'You',
            receiver_name: targetUser.name || 'Unknown',
            stableKey, // Keep same stable key to prevent re-animation
          };

          setMessages(prev =>
            prev.map(msg => (msg.id === tempId ? realMessage : msg))
          );

          // Broadcast to all subscribers in this channel
          if (channelRef.current) {
            void channelRef.current.send({
              type: 'broadcast',
              event: 'new_message',
              payload: realMessage,
            });
          }

          return true;
        } catch (error) {
          console.error('Error sending message:', error);
          // Remove optimistic message and restore input
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
          setMessage(normalizedMessageText);
          return false;
        }
      },
      [
        user,
        targetUser,
        currentChannelId,
        triggerSendSuccessGlow,
        scheduleScrollMessagesToBottom,
      ]
    );

    const handleSendMessage = async () => {
      if (editingMessageId) {
        await handleUpdateMessage();
        return;
      }

      const hasPendingAttachments = pendingComposerAttachments.length > 0;
      const attachmentsToSend = [...pendingComposerAttachments];
      const messageText = message.trim();

      if (!hasPendingAttachments && !messageText) return;
      const shouldAttachCaption =
        hasPendingAttachments && messageText.length > 0;
      if (shouldAttachCaption) {
        setMessage('');
      }
      if (hasPendingAttachments) {
        clearPendingComposerAttachments();
      }

      let lastAttachmentMessageId: string | null = null;
      const lastAttachmentIndex = attachmentsToSend.length - 1;
      for (const [
        attachmentIndex,
        pendingAttachment,
      ] of attachmentsToSend.entries()) {
        const captionForAttachment =
          shouldAttachCaption && attachmentIndex === lastAttachmentIndex
            ? messageText
            : undefined;
        const sentAttachmentMessageId =
          pendingAttachment.fileKind === 'image'
            ? await handleSendImageMessage(
                pendingAttachment.file,
                captionForAttachment
              )
            : await handleSendFileMessage(
                {
                  file: pendingAttachment.file,
                  fileName: pendingAttachment.fileName,
                  fileTypeLabel: pendingAttachment.fileTypeLabel,
                  fileKind: pendingAttachment.fileKind,
                  mimeType: pendingAttachment.mimeType,
                },
                captionForAttachment
              );

        if (!sentAttachmentMessageId) {
          if (shouldAttachCaption) {
            setMessage(messageText);
          }
          return;
        }

        lastAttachmentMessageId = sentAttachmentMessageId;
      }

      if (messageText && !shouldAttachCaption) {
        await sendTextMessage(
          messageText,
          hasPendingAttachments ? lastAttachmentMessageId : null
        );
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSendMessage();
      }
    };

    // Handle close with last seen update
    const handleClose = useCallback(async () => {
      // Use centralized close logic
      await performClose();

      // Call parent onClose
      onClose();
    }, [performClose, onClose]);

    if (!isOpen) {
      return null;
    }

    return (
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 16 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative h-full w-full select-none"
        onClickCapture={handleChatPortalBackgroundClick}
      >
        <Toaster
          toasterId={CHAT_SIDEBAR_TOASTER_ID}
          position="top-right"
          containerStyle={{
            position: 'absolute',
            top: 8,
            right: 8,
          }}
          toastOptions={{
            style: {
              boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.35)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(226, 232, 240, 1)',
              color: '#0f172a',
            },
            success: {
              style: {
                backgroundColor: 'oklch(26.2% 0.051 172.552 / 0.9)',
                color: 'white',
                border: '1px solid oklch(26.2% 0.051 172.552 / 0.3)',
              },
            },
            error: {
              style: {
                backgroundColor: 'oklch(27.1% 0.105 12.094 / 0.9)',
                color: 'white',
                border: '1px solid oklch(27.1% 0.105 12.094 / 0.3)',
              },
            },
          }}
        />

        {/* Chat Content */}
        <div className="relative h-full flex flex-col">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-32 bg-gradient-to-b from-white via-white/92 via-white/72 to-transparent transition-opacity duration-300 ease-in-out ${
                isAtTop ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <div
              ref={chatHeaderContainerRef}
              className="pointer-events-auto relative z-10"
            >
              <ChatHeader
                targetUser={targetUser}
                displayTargetPhotoUrl={displayTargetPhotoUrl}
                targetUserPresence={targetUserPresence}
                currentChannelId={currentChannelId}
                isSearchMode={isMessageSearchMode}
                searchQuery={messageSearchQuery}
                searchState={messageSearchState}
                searchResultCount={searchMatchedMessageIds.length}
                activeSearchResultIndex={Math.max(activeSearchResultIndex, 0)}
                canNavigateSearchUp={canNavigateSearchUp}
                canNavigateSearchDown={canNavigateSearchDown}
                isSelectionMode={isSelectionMode}
                selectedMessageCount={selectedVisibleMessages.length}
                canDeleteSelectedMessages={canDeleteSelectedMessages}
                searchInputRef={searchInputRef}
                onEnterSearchMode={handleEnterMessageSearchMode}
                onExitSearchMode={handleExitMessageSearchMode}
                onEnterSelectionMode={handleEnterMessageSelectionMode}
                onExitSelectionMode={handleExitMessageSelectionMode}
                onSearchQueryChange={handleMessageSearchQueryChange}
                onNavigateSearchUp={handleNavigateSearchUp}
                onNavigateSearchDown={handleNavigateSearchDown}
                onFocusSearchInput={handleFocusSearchInput}
                onCopySelectedMessages={handleCopySelectedMessages}
                onDeleteSelectedMessages={handleDeleteSelectedMessages}
                onClose={handleClose}
                getInitials={getInitials}
                getInitialsColor={getInitialsColor}
              />
            </div>
          </div>

          <div className="min-h-0 flex flex-1 flex-col">
            <MessagesPane
              loading={loading}
              messages={messages}
              user={user}
              targetUser={targetUser}
              displayUserPhotoUrl={displayUserPhotoUrl}
              displayTargetPhotoUrl={displayTargetPhotoUrl}
              messageInputHeight={messageInputHeight}
              composerContextualOffset={composerContextualOffset}
              openMenuMessageId={openMenuMessageId}
              menuPlacement={menuPlacement}
              menuSideAnchor={menuSideAnchor}
              shouldAnimateMenuOpen={shouldAnimateMenuOpen}
              menuTransitionSourceId={menuTransitionSourceId}
              menuOffsetX={menuOffsetX}
              expandedMessageIds={expandedMessageIds}
              flashingMessageId={flashingMessageId}
              isFlashHighlightVisible={isFlashHighlightVisible}
              isSelectionMode={isSelectionMode}
              selectedMessageIds={selectedMessageIds}
              searchMatchedMessageIds={
                isMessageSearchMode ? searchMatchedMessageIdSet : new Set()
              }
              activeSearchMessageId={
                isMessageSearchMode ? activeSearchMessageId : null
              }
              showScrollToBottom={hasNewMessages || !isAtBottom}
              maxMessageChars={MAX_MESSAGE_CHARS}
              messagesContainerRef={messagesContainerRef}
              messagesEndRef={messagesEndRef}
              messageBubbleRefs={messageBubbleRefs}
              initialMessageAnimationKeysRef={initialMessageAnimationKeysRef}
              initialOpenJumpAnimationKeysRef={initialOpenJumpAnimationKeysRef}
              closeMessageMenu={closeMessageMenu}
              toggleMessageMenu={toggleMessageMenu}
              handleToggleExpand={handleToggleExpand}
              handleEditMessage={handleEditMessage}
              handleCopyMessage={handleCopyMessage}
              handleDownloadMessage={handleDownloadMessage}
              handleDeleteMessage={handleDeleteMessage}
              onToggleMessageSelection={handleToggleMessageSelection}
              getAttachmentFileName={getAttachmentFileName}
              getAttachmentFileKind={getAttachmentFileKind}
              getInitials={getInitials}
              getInitialsColor={getInitialsColor}
              onScrollToBottom={scrollToBottom}
            />
          </div>

          <ComposerPanel
            message={message}
            editingMessagePreview={editingMessagePreview}
            messageInputHeight={messageInputHeight}
            isMessageInputMultiline={isMessageInputMultiline}
            isSendSuccessGlowVisible={isSendSuccessGlowVisible}
            isAttachModalOpen={isAttachModalOpen}
            pendingComposerAttachments={pendingComposerAttachments}
            previewComposerImageAttachment={previewComposerImageAttachment}
            isComposerImageExpanded={isComposerImageExpanded}
            isComposerImageExpandedVisible={isComposerImageExpandedVisible}
            messageInputRef={messageInputRef}
            composerContainerRef={composerContainerRef}
            attachButtonRef={attachButtonRef}
            attachModalRef={attachModalRef}
            imageInputRef={imageInputRef}
            documentInputRef={documentInputRef}
            audioInputRef={audioInputRef}
            composerSyncLayoutTransition={COMPOSER_SYNC_LAYOUT_TRANSITION}
            composerBaseBorderColor={COMPOSER_BASE_BORDER_COLOR}
            composerBaseShadow={COMPOSER_BASE_SHADOW}
            composerGlowShadowPeak={COMPOSER_GLOW_SHADOW_PEAK}
            composerGlowShadowHigh={COMPOSER_GLOW_SHADOW_HIGH}
            composerGlowShadowMid={COMPOSER_GLOW_SHADOW_MID}
            composerGlowShadowFade={COMPOSER_GLOW_SHADOW_FADE}
            composerGlowShadowLow={COMPOSER_GLOW_SHADOW_LOW}
            sendSuccessGlowDuration={SEND_SUCCESS_GLOW_DURATION}
            onMessageChange={setMessage}
            onKeyDown={handleKeyPress}
            onPaste={handleComposerPaste}
            onSendMessage={handleSendMessage}
            onAttachButtonClick={handleAttachButtonClick}
            onAttachImageClick={handleAttachImageClick}
            onAttachDocumentClick={handleAttachDocumentClick}
            onAttachAudioClick={handleAttachAudioClick}
            onImageFileChange={handleImageFileChange}
            onDocumentFileChange={handleDocumentFileChange}
            onAudioFileChange={handleAudioFileChange}
            onCancelEditMessage={handleCancelEditMessage}
            onFocusEditingTargetMessage={focusEditingTargetMessage}
            onOpenComposerImagePreview={openComposerImagePreview}
            onCloseComposerImagePreview={closeComposerImagePreview}
            onRemovePendingComposerAttachment={removePendingComposerAttachment}
            onQueueComposerImage={queueComposerImage}
          />
        </div>
      </motion.div>
    );
  }
);

ChatSidebarPanel.displayName = 'ChatSidebarPanel';

export default ChatSidebarPanel;
