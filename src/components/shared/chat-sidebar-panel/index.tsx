import { useAuthStore } from '@/store/authStore';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'motion/react';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  TbCircleArrowDownFilled,
  TbArrowUp,
  TbCopy,
  TbPencil,
  TbPlus,
  TbTrash,
  TbX,
} from 'react-icons/tb';
import toast, { Toaster } from 'react-hot-toast';
import PopupMenuContent, {
  type PopupMenuAction,
} from '@/components/image-manager/PopupMenuContent';
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

interface ChatSidebarPanelProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: {
    id: string;
    name: string;
    email: string;
    profilephoto?: string | null;
  };
}

type MenuPlacement = 'left' | 'right' | 'up' | 'down';

const MENU_GAP = 8;
const MENU_WIDTH = 140;
const MENU_HEIGHT = 128;
const MAX_MESSAGE_CHARS = 220;
const CHAT_SIDEBAR_TOASTER_ID = 'chat-sidebar-toaster';
const MESSAGE_INPUT_MIN_HEIGHT = 22;
const MESSAGE_INPUT_MAX_HEIGHT = 170;
const COMPOSER_LAYOUT_SWITCH_DELAY = 55;
const SEND_SUCCESS_GLOW_DURATION = 700;
const SEND_SUCCESS_GLOW_RESET_BUFFER = 20;
const MESSAGE_BOTTOM_GAP = 12;
const EDITING_STACK_OFFSET = 24;
const COMPOSER_BASE_BORDER_COLOR = 'rgba(226, 232, 240, 0.65)';
const COMPOSER_BASE_SHADOW = '0 2px 8px rgba(15, 23, 42, 0.08)';
const COMPOSER_GLOW_SHADOW_PEAK =
  '0 0 18px oklch(50.8% 0.118 165.612 / 0.32),0 0 30px oklch(50.8% 0.118 165.612 / 0.18),0 2px 8px rgba(15, 23, 42, 0.08)';
const COMPOSER_GLOW_SHADOW_HIGH =
  '0 0 16px oklch(50.8% 0.118 165.612 / 0.28),0 0 27px oklch(50.8% 0.118 165.612 / 0.16),0 2px 8px rgba(15, 23, 42, 0.08)';
const COMPOSER_GLOW_SHADOW_MID =
  '0 0 14px oklch(50.8% 0.118 165.612 / 0.24),0 0 24px oklch(50.8% 0.118 165.612 / 0.14),0 2px 8px rgba(15, 23, 42, 0.08)';
const COMPOSER_GLOW_SHADOW_FADE =
  '0 0 11px oklch(50.8% 0.118 165.612 / 0.18),0 0 19px oklch(50.8% 0.118 165.612 / 0.11),0 2px 8px rgba(15, 23, 42, 0.08)';
const COMPOSER_GLOW_SHADOW_LOW =
  '0 0 8px oklch(50.8% 0.118 165.612 / 0.12),0 0 14px oklch(50.8% 0.118 165.612 / 0.08),0 2px 8px rgba(15, 23, 42, 0.08)';
const TEXT_MOVE_TRANSITION = {
  type: 'tween' as const,
  ease: 'easeOut' as const,
  duration: 0.16,
};

// Generate channel ID for direct messages
const generateChannelId = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort();
  return `dm_${sortedIds[0]}_${sortedIds[1]}`;
};

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
    const [
      menuPreselectedActionIndexByMessageId,
      setMenuPreselectedActionIndexByMessageId,
    ] = useState<Record<string, number>>({});
    const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>('up');
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
    const composerLayoutDelayRef = useRef<NodeJS.Timeout | null>(null);
    const messageInputHeightRafRef = useRef<number | null>(null);
    const sendSuccessGlowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const initialMessageAnimationKeysRef = useRef<Set<string>>(new Set());
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

    const getVisibleMessagesBounds = useCallback(() => {
      const containerRect =
        messagesContainerRef.current?.getBoundingClientRect() ?? null;
      if (!containerRect) return null;

      const composerTop =
        composerContainerRef.current?.getBoundingClientRect().top;
      const visibleBottom =
        typeof composerTop === 'number'
          ? Math.min(containerRect.bottom, composerTop)
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

    const getMenuPlacement = useCallback(
      (anchorRect: DOMRect, preferredSide: 'left' | 'right'): MenuPlacement => {
        const bounds = getVisibleMessagesBounds();
        if (!bounds) return 'up';

        const { containerRect, visibleBottom } = bounds;
        const spaceLeft = anchorRect.left - containerRect.left;
        const spaceRight = containerRect.right - anchorRect.right;
        const spaceAbove = anchorRect.top - containerRect.top;
        const spaceBelow = visibleBottom - anchorRect.bottom;
        const hasBottomAnchoredSideRoom =
          spaceAbove >= MENU_HEIGHT - anchorRect.height + MENU_GAP;
        const canFitLeft =
          spaceLeft >= MENU_WIDTH + MENU_GAP &&
          (hasBottomAnchoredSideRoom ||
            (spaceAbove >= MENU_HEIGHT / 2 && spaceBelow >= MENU_HEIGHT / 2));
        const canFitRight =
          spaceRight >= MENU_WIDTH + MENU_GAP &&
          spaceAbove >= MENU_HEIGHT / 2 &&
          spaceBelow >= MENU_HEIGHT / 2;

        if (preferredSide === 'left' && canFitLeft) return 'left';
        if (preferredSide === 'right' && canFitRight) return 'right';
        if (canFitLeft) return 'left';
        if (canFitRight) return 'right';

        if (spaceBelow >= MENU_HEIGHT + MENU_GAP) return 'up';
        if (spaceAbove >= MENU_HEIGHT + MENU_GAP) return 'down';

        return spaceBelow >= spaceAbove ? 'up' : 'down';
      },
      [getVisibleMessagesBounds]
    );

    const closeMessageMenu = useCallback(() => {
      setOpenMenuMessageId(null);
      setMenuOffsetX(0);
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
        const nextPlacement = getMenuPlacement(anchorRect, preferredSide);

        setMenuOffsetX(0);
        setMenuPlacement(nextPlacement);
        setOpenMenuMessageId(messageId);
      },
      [closeMessageMenu, getMenuPlacement, openMenuMessageId]
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
    }, [openMenuMessageId, menuPlacement, ensureMenuFullyVisible]);

    // Helper function to format last seen time
    const formatLastSeen = (lastSeen: string): string => {
      const now = new Date();
      const lastSeenDate = new Date(lastSeen);
      const diffInMinutes = Math.floor(
        (now.getTime() - lastSeenDate.getTime()) / (1000 * 60)
      );

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;

      return lastSeenDate.toLocaleDateString();
    };

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
          initialMessageAnimationKeysRef.current = new Set(
            transformedMessages.map(
              messageItem => messageItem.stableKey || messageItem.id
            )
          );
          setMessages(transformedMessages);
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
      return () => {
        if (sendSuccessGlowTimeoutRef.current) {
          clearTimeout(sendSuccessGlowTimeoutRef.current);
          sendSuccessGlowTimeoutRef.current = null;
        }
      };
    }, []);

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
        // Check current scroll position before new message
        const wasAtBottom = checkIfAtBottom();

        if (wasAtBottom) {
          // User was at bottom, auto-scroll and don't show arrow
          setTimeout(() => {
            scrollMessagesToBottom('auto');
          }, 10);
          setHasNewMessages(false);
        } else {
          // User was not at bottom, show arrow
          /* c8 ignore next */
          setHasNewMessages(true);
        }
      }
    }, [messages, checkIfAtBottom, scrollMessagesToBottom]);

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

    // Helper functions for avatar display
    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    const getInitialsColor = (userId: string) => {
      const colors = [
        'bg-blue-500',
        'bg-green-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-yellow-500',
        'bg-red-500',
        'bg-slate-500',
      ];

      const index = userId
        .split('')
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
      return colors[index % colors.length];
    };

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
      setMessages(prev => prev.filter(msg => msg.id !== targetMessage.id));

      if (editingMessageId === targetMessage.id) {
        setEditingMessageId(null);
        setMessage('');
      }

      if (targetMessage.id.startsWith('temp_')) return;

      try {
        const { error } = await chatService.deleteMessage(targetMessage.id);

        if (error) {
          console.error('Error deleting message:', error);
          return;
        }

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'delete_message',
            payload: { id: targetMessage.id },
          });
        }
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    };

    const handleEditMessage = (targetMessage: ChatMessage) => {
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
          await navigator.clipboard.writeText(targetMessage.message);
          toast.success('Pesan berhasil disalin', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
        } catch (error) {
          console.error('Error copying message:', error);
          toast.error('Gagal menyalin pesan', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
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

    useEffect(() => {
      const nextMode = isTargetMultiline ? 'multiline' : 'inline';
      if (nextMode === composerLayoutMode) return;

      /* c8 ignore next 3 */
      if (composerLayoutDelayRef.current) {
        clearTimeout(composerLayoutDelayRef.current);
        composerLayoutDelayRef.current = null;
      }

      if (nextMode === 'multiline') {
        setComposerLayoutMode(nextMode);
      }

      composerLayoutDelayRef.current = setTimeout(() => {
        setComposerLayoutMode(nextMode);
        composerLayoutDelayRef.current = null;
      }, COMPOSER_LAYOUT_SWITCH_DELAY);

      return () => {
        if (composerLayoutDelayRef.current) {
          clearTimeout(composerLayoutDelayRef.current);
          composerLayoutDelayRef.current = null;
        }
      };
    }, [composerLayoutMode, isTargetMultiline]);

    const handleSendMessage = async () => {
      if (editingMessageId) {
        await handleUpdateMessage();
        return;
      }

      if (!message.trim() || !user || !targetUser || !currentChannelId) return;

      const messageText = message.trim();
      const tempId = `temp_${Date.now()}`;
      const stableKey = `${user.id}-${Date.now()}-${messageText.slice(0, 10)}`;
      setMessage(''); // Clear input immediately for better UX

      // Optimistic update - show message immediately
      const optimisticMessage: ChatMessage = {
        id: tempId,
        sender_id: user.id,
        receiver_id: targetUser.id,
        channel_id: currentChannelId,
        message: messageText,
        message_type: 'text',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_read: false,
        reply_to_id: null,
        sender_name: user.name || 'You',
        receiver_name: targetUser.name || 'Unknown',
        // Add stable key for consistent animation
        stableKey,
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setIsAtBottom(true);
      setHasNewMessages(false);
      triggerSendSuccessGlow();

      try {
        // Insert message into database (simplified query)
        const { data: newMessage, error } = await chatService.insertMessage({
          sender_id: user.id,
          receiver_id: targetUser.id,
          channel_id: currentChannelId,
          message: messageText,
          message_type: 'text',
        });

        if (error) {
          console.error('Error sending message:', error);
          // Remove optimistic message and restore input
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
          setMessage(messageText);
          return;
        }

        if (!newMessage) {
          console.error('Error sending message: missing response data');
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
          setMessage(messageText);
          return;
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
      } catch (error) {
        console.error('Error sending message:', error);
        // Remove optimistic message and restore input
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        setMessage(messageText);
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
          {/* Chat Header */}
          <div className="px-4 py-3.5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                  {displayTargetPhotoUrl ? (
                    <img
                      src={displayTargetPhotoUrl}
                      alt={targetUser?.name || 'User'}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center text-white font-medium text-xs ${getInitialsColor(targetUser?.id || 'target_user')}`}
                    >
                      {getInitials(targetUser?.name || 'User')}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-900 truncate">
                    {targetUser ? targetUser.name : 'Chat'}
                  </h3>
                  {(() => {
                    const shouldShowOnline =
                      targetUserPresence &&
                      targetUserPresence.is_online &&
                      targetUserPresence.current_chat_channel ===
                        currentChannelId;

                    if (shouldShowOnline) {
                      return (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs text-green-600 font-medium">
                            Online
                          </span>
                        </div>
                      );
                    } else if (
                      targetUserPresence &&
                      targetUserPresence.last_seen
                    ) {
                      return (
                        <span className="text-xs text-slate-400">
                          Last seen{' '}
                          {formatLastSeen(targetUserPresence.last_seen)}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-x-hidden px-3 pt-3 overflow-y-auto space-y-3 transition-[padding-bottom] duration-[110ms] ease-out"
            style={{
              overflowAnchor: 'none',
              paddingBottom:
                messageInputHeight +
                84 +
                (editingMessagePreview ? EDITING_STACK_OFFSET : 0),
            }}
            onClick={closeMessageMenu}
          >
            {loading && messages.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-slate-400 text-sm">
                  Loading messages...
                </div>
              </div>
            ) : (
              messages.map(msg => {
                const isCurrentUser = msg.sender_id === user?.id;
                const displayTime = new Date(msg.created_at).toLocaleTimeString(
                  [],
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                );
                const createdTimestamp = new Date(msg.created_at).getTime();
                const updatedTimestamp = new Date(msg.updated_at).getTime();
                const isEdited =
                  Number.isFinite(createdTimestamp) &&
                  Number.isFinite(updatedTimestamp) &&
                  updatedTimestamp > createdTimestamp;
                const isMenuOpen = openMenuMessageId === msg.id;
                const savedPreselectedActionIndex =
                  menuPreselectedActionIndexByMessageId[msg.id];

                // Use stableKey from message if available, otherwise fall back to ID
                const animationKey = msg.stableKey || msg.id;
                const shouldAnimateEnter =
                  !initialMessageAnimationKeysRef.current.has(animationKey);

                const isExpanded = expandedMessageIds.has(msg.id);
                const isMessageLong =
                  !isExpanded && msg.message.length > MAX_MESSAGE_CHARS;
                const displayMessage = isMessageLong
                  ? msg.message.slice(0, MAX_MESSAGE_CHARS).trimEnd()
                  : msg.message;
                const menuActions: PopupMenuAction[] = [
                  {
                    label: 'Salin',
                    icon: <TbCopy className="h-4 w-4" />,
                    onClick: () => {
                      void handleCopyMessage(msg);
                    },
                  },
                ];

                if (isCurrentUser) {
                  menuActions.push(
                    {
                      label: 'Edit',
                      icon: <TbPencil className="h-4 w-4" />,
                      onClick: () => handleEditMessage(msg),
                    },
                    {
                      label: 'Hapus',
                      icon: <TbTrash className="h-4 w-4" />,
                      onClick: () => {
                        void handleDeleteMessage(msg);
                      },
                      tone: 'danger',
                    }
                  );
                }
                const isBottomAnchoredSideMenu =
                  isCurrentUser &&
                  (menuPlacement === 'left' || menuPlacement === 'right');
                const sidePlacementClass =
                  menuPlacement === 'left'
                    ? isBottomAnchoredSideMenu
                      ? 'right-full mr-2 bottom-0 origin-bottom-right'
                      : 'right-full mr-2 top-1/2 -translate-y-1/2 origin-right'
                    : menuPlacement === 'right'
                      ? isBottomAnchoredSideMenu
                        ? 'left-full ml-2 bottom-0 origin-bottom-left'
                        : 'left-full ml-2 top-1/2 -translate-y-1/2 origin-left'
                      : menuPlacement === 'down'
                        ? 'bottom-full mb-2 left-0 origin-bottom-left'
                        : 'top-full mt-2 left-0 origin-top-left';
                const sideArrowAnchorClass = isBottomAnchoredSideMenu
                  ? 'top-[78%] -translate-y-1/2'
                  : 'top-1/2 -translate-y-1/2';

                return (
                  <motion.div
                    key={animationKey}
                    initial={
                      shouldAnimateEnter
                        ? {
                            opacity: 0,
                            scale: 0.7,
                            x: isCurrentUser ? 18 : -18,
                            y: 10,
                          }
                        : false
                    }
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    style={{
                      transformOrigin: isCurrentUser
                        ? 'right bottom'
                        : 'left bottom',
                    }}
                    transition={{
                      duration: 0.3,
                      ease: [0.23, 1, 0.32, 1],
                      type: 'spring',
                      stiffness: 300,
                      damping: 24,
                    }}
                    className={`flex w-full transition-all duration-200 ease-out ${
                      isCurrentUser ? 'justify-end' : 'justify-start'
                    } ${
                      openMenuMessageId && openMenuMessageId !== msg.id
                        ? 'blur-[2px] brightness-95'
                        : ''
                    }`}
                  >
                    <div
                      className={`${isCurrentUser ? 'flex flex-col items-end max-w-xs' : 'flex flex-col items-start max-w-xs'}`}
                    >
                      {/* Message Bubble */}
                      <div className="relative">
                        <div
                          className={`px-3 py-2 text-sm inline-block ${
                            isCurrentUser
                              ? 'bg-emerald-200 text-slate-900 rounded-tl-xl rounded-tr-xl rounded-bl-xl'
                              : 'bg-slate-100 text-slate-800 rounded-tl-xl rounded-tr-xl rounded-br-xl'
                          } cursor-pointer select-none`}
                          style={{
                            [isCurrentUser
                              ? 'borderBottomRightRadius'
                              : 'borderBottomLeftRadius']: '2px',
                          }}
                          onClick={event => {
                            event.stopPropagation();
                            toggleMessageMenu(
                              event.currentTarget,
                              msg.id,
                              isCurrentUser ? 'left' : 'right'
                            );
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              toggleMessageMenu(
                                event.currentTarget,
                                msg.id,
                                isCurrentUser ? 'left' : 'right'
                              );
                            }
                          }}
                        >
                          {displayMessage}
                          {isMessageLong ? (
                            <>
                              <span>... </span>
                              <span
                                className="text-primary font-medium"
                                role="button"
                                tabIndex={0}
                                onClick={event => {
                                  event.stopPropagation();
                                  handleToggleExpand(msg.id);
                                }}
                                onKeyDown={event => {
                                  if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                  ) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleToggleExpand(msg.id);
                                  }
                                }}
                              >
                                Read more
                              </span>
                            </>
                          ) : isExpanded ? (
                            <span
                              className="block text-primary font-medium"
                              role="button"
                              tabIndex={0}
                              onClick={event => {
                                event.stopPropagation();
                                handleToggleExpand(msg.id);
                              }}
                              onKeyDown={event => {
                                if (
                                  event.key === 'Enter' ||
                                  event.key === ' '
                                ) {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleToggleExpand(msg.id);
                                }
                              }}
                            >
                              Read less
                            </span>
                          ) : null}
                        </div>

                        <AnimatePresence>
                          {isMenuOpen ? (
                            <motion.div
                              data-chat-menu-id={msg.id}
                              initial={{
                                opacity: 0,
                                scale: 0.96,
                                x:
                                  menuOffsetX +
                                  (menuPlacement === 'left'
                                    ? -6
                                    : menuPlacement === 'right'
                                      ? 6
                                      : 0),
                                y:
                                  menuPlacement === 'down'
                                    ? 6
                                    : menuPlacement === 'up'
                                      ? -6
                                      : 0,
                              }}
                              animate={{
                                opacity: 1,
                                scale: 1,
                                x: menuOffsetX,
                                y: 0,
                              }}
                              exit={{
                                opacity: 0,
                                scale: 0.98,
                                x: menuOffsetX,
                                y: 0,
                              }}
                              transition={{ duration: 0.12, ease: 'easeOut' }}
                              className={`absolute z-20 text-slate-900 ${sidePlacementClass}`}
                              onClick={event => event.stopPropagation()}
                            >
                              {menuPlacement === 'left' ? (
                                <div
                                  className={`absolute right-0 translate-x-full ${sideArrowAnchorClass}`}
                                >
                                  <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[6px] border-t-transparent border-b-transparent border-l-slate-200" />
                                  <div className="absolute w-0 h-0 border-t-[5px] border-b-[5px] border-l-[5px] border-t-transparent border-b-transparent border-l-white left-[-1px] top-1/2 transform -translate-y-1/2" />
                                </div>
                              ) : menuPlacement === 'right' ? (
                                <div
                                  className={`absolute left-0 -translate-x-full ${sideArrowAnchorClass}`}
                                >
                                  <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent border-r-slate-200" />
                                  <div className="absolute w-0 h-0 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent border-r-white right-[-1px] top-1/2 transform -translate-y-1/2" />
                                </div>
                              ) : menuPlacement === 'down' ? (
                                <div className="absolute bottom-0 left-3 translate-y-full">
                                  <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-200" />
                                  <div className="absolute w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-white left-1/2 top-[-1px] -translate-x-1/2" />
                                </div>
                              ) : (
                                <div className="absolute top-0 left-3 -translate-y-full">
                                  <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-slate-200" />
                                  <div className="absolute w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-white left-1/2 bottom-[-1px] -translate-x-1/2" />
                                </div>
                              )}
                              <PopupMenuContent
                                actions={menuActions}
                                minWidthClassName="min-w-[120px]"
                                enableArrowNavigation
                                autoFocusFirstItem
                                initialPreselectedIndex={
                                  savedPreselectedActionIndex
                                }
                                onPreselectedIndexChange={nextIndex => {
                                  setMenuPreselectedActionIndexByMessageId(
                                    previousState => {
                                      if (previousState[msg.id] === nextIndex) {
                                        return previousState;
                                      }

                                      return {
                                        ...previousState,
                                        [msg.id]: nextIndex,
                                      };
                                    }
                                  );
                                }}
                              />
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>

                      {/* Message Info */}
                      <div
                        className={`flex items-center gap-2 mt-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {isCurrentUser ? (
                          <>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              {isEdited ? (
                                <>
                                  <span className="text-slate-400">Diedit</span>
                                  <span className="text-slate-500">•</span>
                                </>
                              ) : null}
                              {displayTime}
                            </span>
                            <div className="w-4 h-4 rounded-full overflow-hidden shrink-0">
                              {displayUserPhotoUrl ? (
                                <img
                                  src={displayUserPhotoUrl}
                                  alt={user.name || 'You'}
                                  className="w-full h-full object-cover"
                                  draggable={false}
                                />
                              ) : (
                                <div
                                  className={`w-full h-full flex items-center justify-center text-white font-medium text-xs ${getInitialsColor(user?.id || 'current_user')}`}
                                >
                                  {getInitials(user?.name || 'You')}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-4 h-4 rounded-full overflow-hidden shrink-0">
                              {displayTargetPhotoUrl ? (
                                <img
                                  src={displayTargetPhotoUrl}
                                  alt={targetUser?.name || 'User'}
                                  className="w-full h-full object-cover"
                                  draggable={false}
                                />
                              ) : (
                                <div
                                  className={`w-full h-full flex items-center justify-center text-white font-medium text-xs ${getInitialsColor(targetUser?.id || 'target_user')}`}
                                >
                                  {getInitials(targetUser?.name || 'User')}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              {displayTime}
                              {isEdited ? (
                                <>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-slate-400">Diedit</span>
                                </>
                              ) : null}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            {/* Invisible element for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>

          {/* Floating bouncing scroll-to-bottom icon */}
          <AnimatePresence>
            {(hasNewMessages || !isAtBottom) && messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: [0, -8, 0],
                  transition: {
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 },
                    y: {
                      repeat: Infinity,
                      duration: 1.2,
                      ease: 'easeInOut',
                    },
                  },
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={scrollToBottom}
                className="absolute left-2 z-20 cursor-pointer text-primary hover:text-primary/80 transition-[color,bottom] duration-[110ms] ease-out"
                style={{
                  bottom: messageInputHeight + 78,
                  filter: 'drop-shadow(0 0 0 white)',
                  background:
                    'radial-gradient(circle at center, white 30%, transparent 30%)',
                }}
              >
                <TbCircleArrowDownFilled size={32} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message Input */}
          <div
            ref={composerContainerRef}
            className="absolute bottom-2 left-0 right-0 px-3 pb-4"
          >
            <motion.div
              initial={false}
              animate={
                isSendSuccessGlowVisible
                  ? {
                      borderColor: [
                        COMPOSER_BASE_BORDER_COLOR,
                        'oklch(50.8% 0.118 165.612 / 0.55)',
                        'oklch(50.8% 0.118 165.612 / 0.48)',
                        'oklch(50.8% 0.118 165.612 / 0.42)',
                        'oklch(50.8% 0.118 165.612 / 0.32)',
                        'oklch(50.8% 0.118 165.612 / 0.22)',
                        COMPOSER_BASE_BORDER_COLOR,
                      ],
                      boxShadow: [
                        COMPOSER_BASE_SHADOW,
                        COMPOSER_GLOW_SHADOW_PEAK,
                        COMPOSER_GLOW_SHADOW_HIGH,
                        COMPOSER_GLOW_SHADOW_MID,
                        COMPOSER_GLOW_SHADOW_FADE,
                        COMPOSER_GLOW_SHADOW_LOW,
                        COMPOSER_BASE_SHADOW,
                      ],
                    }
                  : {
                      borderColor: COMPOSER_BASE_BORDER_COLOR,
                      boxShadow: COMPOSER_BASE_SHADOW,
                    }
              }
              transition={
                isSendSuccessGlowVisible
                  ? {
                      duration: SEND_SUCCESS_GLOW_DURATION / 1000,
                      times: [0, 0.12, 0.3, 0.48, 0.66, 0.82, 1],
                      ease: 'easeOut',
                    }
                  : {
                      duration: 0.12,
                      ease: 'easeOut',
                    }
              }
              className="relative z-10 rounded-2xl border bg-white"
            >
              {editingMessagePreview ? (
                <div
                  className="absolute left-2.5 right-2.5 z-0 rounded-t-[14px] rounded-b-none border border-slate-300/70 bg-slate-100 px-3 pt-2 pb-3 shadow-[0_8px_16px_rgba(15,23,42,0.1)]"
                  style={{
                    top: 0,
                    transform: 'translateY(calc(-100% + 8px))',
                  }}
                >
                  <div className="flex items-center gap-2 text-slate-700">
                    <button
                      type="button"
                      aria-label="Cancel editing message"
                      onClick={handleCancelEditMessage}
                      className="-ml-0.5 group inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                    >
                      <TbPencil className="h-4 w-4 group-hover:hidden" />
                      <TbX className="hidden h-4 w-4 group-hover:block" />
                    </button>
                    <p className="pointer-events-none text-sm leading-5 truncate">
                      {editingMessagePreview}
                    </p>
                  </div>
                </div>
              ) : null}
              <motion.div
                layout
                transition={{ layout: TEXT_MOVE_TRANSITION }}
                className="relative z-10 rounded-[15px] bg-white px-2.5 py-2.5 transition-[height] duration-150 ease-out"
              >
                <motion.div
                  layout
                  transition={{ layout: TEXT_MOVE_TRANSITION }}
                  className={`grid grid-cols-[auto_1fr_auto] gap-x-1 ${
                    isMessageInputMultiline
                      ? 'grid-rows-[auto_auto] gap-y-1 items-end'
                      : 'grid-rows-[auto] gap-y-0 items-center'
                  }`}
                >
                  <motion.textarea
                    layout="position"
                    transition={{ layout: TEXT_MOVE_TRANSITION }}
                    ref={messageInputRef}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    style={{ height: `${messageInputHeight}px` }}
                    className={`w-full resize-none bg-transparent border-0 p-0 text-[15px] leading-[22px] text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:ring-0 transition-[height] duration-150 ease-out ${
                      isMessageInputMultiline
                        ? 'col-span-3 row-start-1 self-start'
                        : 'col-start-2 row-start-1 self-center'
                    }`}
                  />
                  <motion.button
                    layout="position"
                    transition={{ layout: TEXT_MOVE_TRANSITION }}
                    type="button"
                    className={`h-8 w-8 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center justify-self-start shrink-0 ${
                      isMessageInputMultiline
                        ? 'col-start-1 row-start-2'
                        : 'col-start-1 row-start-1'
                    }`}
                  >
                    <TbPlus size={20} />
                  </motion.button>
                  <motion.button
                    layout="position"
                    transition={{ layout: TEXT_MOVE_TRANSITION }}
                    onClick={handleSendMessage}
                    className={`h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center justify-self-end cursor-pointer whitespace-nowrap shrink-0 ${
                      isMessageInputMultiline
                        ? 'col-start-3 row-start-2'
                        : 'col-start-3 row-start-1'
                    }`}
                  >
                    <TbArrowUp size={20} className="text-white" />
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }
);

ChatSidebarPanel.displayName = 'ChatSidebarPanel';

export default ChatSidebarPanel;
