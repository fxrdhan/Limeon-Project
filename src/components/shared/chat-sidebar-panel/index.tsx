import { useAuthStore } from '@/store/authStore';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { motion } from 'motion/react';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import toast, { Toaster } from 'react-hot-toast';
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

const ChatSidebarPanel = memo(
  ({ isOpen, onClose, targetUser }: ChatSidebarPanelProps) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isAtBottom, setIsAtBottom] = useState(true);
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
    const messageInputHeightRafRef = useRef<number | null>(null);
    const sendSuccessGlowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const flashMessageIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const composerImagePreviewCloseTimerRef = useRef<number | null>(null);
    const menuTransitionSourceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const attachButtonRef = useRef<HTMLButtonElement>(null);
    const attachModalRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const documentInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
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

    useEffect(() => {
      pendingComposerAttachmentsRef.current = pendingComposerAttachments;
    }, [pendingComposerAttachments]);

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

        globalPresenceChannelRef.current.send({
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

            globalPresenceChannelRef.current.send({
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

    // PRIORITY 1: Simulate close button click when isOpen changes to false
    useEffect(() => {
      const previousIsOpen = previousIsOpenRef.current;

      // Update previous ref for next comparison
      previousIsOpenRef.current = isOpen;

      // SMART: When close detected from ANY source → use same close logic as close button
      if (previousIsOpen && !isOpen && user && !hasClosedRef.current) {
        // Call the centralized close function
        performClose();
      }
    }, [isOpen, user, targetUser, performClose]);

    // Load messages and setup realtime subscription
    useEffect(() => {
      if (!isOpen || !user || !targetUser || !currentChannelId) {
        return;
      }

      const loadMessages = async () => {
        setLoading(true);
        try {
          // Fetch existing messages (simplified query without JOIN)
          const { data: existingMessages, error } =
            await chatService.fetchMessagesBetweenUsers(user.id, targetUser.id);

          if (error) {
            console.error('Error loading messages:', error);
            return;
          }

          // Transform messages for display (use existing user data)
          const transformedMessages: ChatMessage[] = (
            existingMessages || []
          ).map(msg => ({
            ...msg,
            sender_name:
              msg.sender_id === user.id
                ? user.name || 'You'
                : targetUser.name || 'Unknown',
            receiver_name:
              msg.receiver_id === user.id
                ? user.name || 'You'
                : targetUser.name || 'Unknown',
          }));

          // Skip enter animation for messages that exist on initial load/open.
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
              messageItem => !transformedIds.has(messageItem.id)
            );

            return [...transformedMessages, ...pendingMessages];
          });
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
          realtimeService.removeChannel(channelRef.current);
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
        });

        channel.on('broadcast', { event: 'update_message' }, payload => {
          const updatedMessage = payload.payload as ChatMessage;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
            )
          );
        });

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
          realtimeService.removeChannel(presenceChannelRef.current);
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
          realtimeService.removeChannel(globalPresenceChannelRef.current);
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

        // Subscribe and store reference
        globalPresenceChannel.subscribe();

        globalPresenceChannelRef.current = globalPresenceChannel;
      };

      loadMessages();
      setupRealtimeSubscription();
      setupPresenceSubscription();
      setupGlobalPresenceSubscription();

      // Reset close flag when opening chat
      hasClosedRef.current = false;

      // Update user presence and load target user presence
      updateUserChatOpen();
      loadTargetUserPresence();

      // Setup periodic presence refresh as backup (every 30 seconds)
      presenceRefreshIntervalRef.current = setInterval(() => {
        loadTargetUserPresence();
      }, 30000);

      // Cleanup function
      return () => {
        if (channelRef.current) {
          realtimeService.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        if (presenceChannelRef.current) {
          realtimeService.removeChannel(presenceChannelRef.current);
          presenceChannelRef.current = null;
        }
        if (globalPresenceChannelRef.current) {
          realtimeService.removeChannel(globalPresenceChannelRef.current);
          globalPresenceChannelRef.current = null;
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
      scrollMessagesToBottom,
    ]);

    // Cleanup presence on component unmount
    useEffect(() => {
      return () => {
        // Perform close if not already closed
        if (!hasClosedRef.current && user) {
          performClose();
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
            realtimeService.removeChannel(globalPresenceChannelRef.current);
            globalPresenceChannelRef.current = null;
          }
        }, 200);
      };
    }, [user, performClose]);

    useEffect(() => {
      const pendingImagePreviewUrls = pendingImagePreviewUrlsRef.current;

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

        if (flashMessageIntervalRef.current) {
          clearInterval(flashMessageIntervalRef.current);
          flashMessageIntervalRef.current = null;
        }

        pendingImagePreviewUrls.forEach(previewUrl => {
          URL.revokeObjectURL(previewUrl);
        });
        pendingImagePreviewUrls.clear();

        pendingComposerAttachmentsRef.current.forEach(attachment => {
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
              pdfDocument.cleanup();
              pdfDocument.destroy();
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

            pdfDocument.cleanup();
            pdfDocument.destroy();
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
      if (flashMessageIntervalRef.current) {
        clearInterval(flashMessageIntervalRef.current);
        flashMessageIntervalRef.current = null;
      }

      setFlashingMessageId(messageId);
      setIsFlashHighlightVisible(true);

      let flashSteps = 0;
      flashMessageIntervalRef.current = setInterval(() => {
        flashSteps += 1;
        setIsFlashHighlightVisible(prev => !prev);

        if (flashSteps >= 3) {
          if (flashMessageIntervalRef.current) {
            clearInterval(flashMessageIntervalRef.current);
            flashMessageIntervalRef.current = null;
          }
          setIsFlashHighlightVisible(false);
          setFlashingMessageId(currentId =>
            currentId === messageId ? null : currentId
          );
        }
      }, EDIT_TARGET_FLASH_PHASE_DURATION);
    }, []);

    const focusEditingTargetMessage = useCallback(() => {
      if (!editingMessageId) return;
      closeMessageMenu();

      const bubble = messageBubbleRefs.current.get(editingMessageId);
      const container = messagesContainerRef.current;
      const bounds = getVisibleMessagesBounds();
      if (!bubble || !container || !bounds) {
        triggerMessageFlash(editingMessageId);
        return;
      }

      const minVisibleTop =
        bounds.containerRect.top + EDIT_TARGET_FOCUS_PADDING;
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

      triggerMessageFlash(editingMessageId);
    }, [
      closeMessageMenu,
      editingMessageId,
      getVisibleMessagesBounds,
      triggerMessageFlash,
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
            channelRef.current.send({
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
                channelRef.current.send({
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
          const filePath = buildChatFilePath(
            currentChannelId,
            user.id,
            pendingFile.file,
            pendingFile.fileKind
          );
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
            sender_name: user.name || 'You',
            receiver_name: targetUser.name || 'Unknown',
            stableKey,
          };

          setMessages(prev =>
            prev.map(msg => (msg.id === tempId ? realMessage : msg))
          );

          if (channelRef.current) {
            channelRef.current.send({
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
                channelRef.current.send({
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
          updateUserChatClose();
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

    // Handle scroll events
    const handleScroll = useCallback(() => {
      // Use requestAnimationFrame to ensure the check happens after the scroll event
      /* c8 ignore next 7 */
      requestAnimationFrame(() => {
        const atBottom = checkIfAtBottom();
        setIsAtBottom(atBottom);
        if (atBottom) {
          setHasNewMessages(false);
        }
      });
    }, [checkIfAtBottom]);

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
      setHasNewMessages(false);

      if (hasCompletedInitialOpenLoadRef.current && !loading) {
        shouldPinToBottomOnOpenRef.current = false;
      }
    }, [isOpen, loading, messages, messageInputHeight, scrollMessagesToBottom]);

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

    // Initialize scroll position when chat opens
    useEffect(() => {
      if (!isOpen) return;

      shouldPinToBottomOnOpenRef.current = true;
      hasCompletedInitialOpenLoadRef.current = false;
      setIsAtBottom(true);
      setHasNewMessages(false);
    }, [isOpen]);

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
          channelRef.current.send({
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
            channelRef.current?.send({
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
            channelRef.current.send({
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
      const messageText = message.trim();

      if (!hasPendingAttachments && !messageText) return;
      const shouldAttachCaption =
        hasPendingAttachments && messageText.length > 0;
      if (shouldAttachCaption) {
        setMessage('');
      }

      let lastAttachmentMessageId: string | null = null;
      const lastAttachmentIndex = pendingComposerAttachments.length - 1;
      for (const [
        attachmentIndex,
        pendingAttachment,
      ] of pendingComposerAttachments.entries()) {
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
        removePendingComposerAttachment(pendingAttachment.id);
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
        handleSendMessage();
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
          <ChatHeader
            targetUser={targetUser}
            displayTargetPhotoUrl={displayTargetPhotoUrl}
            targetUserPresence={targetUserPresence}
            currentChannelId={currentChannelId}
            onClose={handleClose}
            getInitials={getInitials}
            getInitialsColor={getInitialsColor}
          />

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
            getAttachmentFileName={getAttachmentFileName}
            getAttachmentFileKind={getAttachmentFileKind}
            getInitials={getInitials}
            getInitialsColor={getInitialsColor}
            onScrollToBottom={scrollToBottom}
          />

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
