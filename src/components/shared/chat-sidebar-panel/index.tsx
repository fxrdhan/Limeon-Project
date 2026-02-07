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
  TbCopy,
  TbPencil,
  TbPlus,
  TbSend2,
  TbTrash,
} from 'react-icons/tb';
import toast, { Toaster } from 'react-hot-toast';
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

type MenuPlacement = 'left' | 'up' | 'down';

const MENU_GAP = 8;
const MENU_WIDTH = 140;
const MENU_HEIGHT = 128;
const MAX_MESSAGE_CHARS = 220;
const CHAT_SIDEBAR_TOASTER_ID = 'chat-sidebar-toaster';
const MESSAGE_INPUT_MIN_HEIGHT = 22;
const MESSAGE_INPUT_MAX_HEIGHT = 170;

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
    const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>('up');
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
    const channelRef = useRef<RealtimeChannel | null>(null);
    const presenceChannelRef = useRef<RealtimeChannel | null>(null);
    const globalPresenceChannelRef = useRef<RealtimeChannel | null>(null);
    const presenceRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasClosedRef = useRef(false);
    const previousIsOpenRef = useRef(isOpen);
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
    const isMessageInputMultiline =
      messageInputHeight > MESSAGE_INPUT_MIN_HEIGHT + 2;

    const getMenuPlacement = useCallback(
      (anchorRect: DOMRect): MenuPlacement => {
        const containerRect =
          messagesContainerRef.current?.getBoundingClientRect();

        if (!containerRect) return 'up';

        const spaceRight = containerRect.right - anchorRect.right;
        const spaceAbove = anchorRect.top - containerRect.top;
        const spaceBelow = containerRect.bottom - anchorRect.bottom;
        const canSideFit =
          spaceRight >= MENU_WIDTH + MENU_GAP &&
          spaceAbove >= MENU_HEIGHT / 2 &&
          spaceBelow >= MENU_HEIGHT / 2;

        if (canSideFit) return 'left';
        if (spaceBelow >= MENU_HEIGHT + MENU_GAP) return 'up';
        if (spaceAbove >= MENU_HEIGHT + MENU_GAP) return 'down';

        return spaceBelow >= spaceAbove ? 'up' : 'down';
      },
      []
    );

    const closeMessageMenu = useCallback(() => {
      setOpenMenuMessageId(null);
    }, []);

    const toggleMessageMenu = useCallback(
      (anchor: HTMLElement, messageId: string) => {
        if (openMenuMessageId === messageId) {
          closeMessageMenu();
          return;
        }

        const anchorRect = anchor.getBoundingClientRect();
        const nextPlacement = getMenuPlacement(anchorRect);

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

    const ensureMenuFullyVisible = useCallback((messageId: string) => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const menuElement = container.querySelector<HTMLElement>(
        `[data-chat-menu-id="${messageId}"]`
      );

      if (!menuElement) return;

      const containerRect = container.getBoundingClientRect();
      const menuRect = menuElement.getBoundingClientRect();

      let scrollOffset = 0;
      if (menuRect.top < containerRect.top) {
        scrollOffset = menuRect.top - containerRect.top - MENU_GAP;
      } else if (menuRect.bottom > containerRect.bottom) {
        scrollOffset = menuRect.bottom - containerRect.bottom;
      }

      if (scrollOffset !== 0) {
        container.scrollTo({
          top: container.scrollTop + scrollOffset,
          behavior: 'auto',
        });
      }
    }, []);

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
        console.error('❌ Database update failed:', error);
      }

      // Step 3: Small delay for broadcast delivery
      await new Promise(resolve => setTimeout(resolve, 100));
    }, [user, updateUserChatClose]);

    // Update user presence when chat opens
    const updateUserChatOpen = useCallback(async () => {
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

          setMessages(transformedMessages);

          // Auto-scroll to bottom after messages are loaded
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setIsAtBottom(true);
            setHasNewMessages(false);
          }, 100);
        } catch (error) {
          console.error('Error loading messages:', error);
        } finally {
          setLoading(false);
        }
      };

      // Setup realtime subscription
      const setupRealtimeSubscription = () => {
        // Clean up existing channel if any
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
    ]);

    // Cleanup presence on component unmount
    useEffect(() => {
      return () => {
        // Perform close if not already closed
        if (!hasClosedRef.current && user) {
          performClose();
        }

        // Clean up interval on unmount
        if (presenceRefreshIntervalRef.current) {
          clearInterval(presenceRefreshIntervalRef.current);
          presenceRefreshIntervalRef.current = null;
        }

        // Clean up global presence channel LAST (after broadcast)
        setTimeout(() => {
          if (globalPresenceChannelRef.current) {
            realtimeService.removeChannel(globalPresenceChannelRef.current);
            globalPresenceChannelRef.current = null;
          }
        }, 200);
      };
    }, [user, performClose]);

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
      return true;
    }, []);

    // Handle scroll events
    const handleScroll = useCallback(() => {
      // Use requestAnimationFrame to ensure the check happens after the scroll event
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
      if (messages.length > 0) {
        // Check current scroll position before new message
        const wasAtBottom = checkIfAtBottom();

        if (wasAtBottom) {
          // User was at bottom, auto-scroll and don't show arrow
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 10);
          setHasNewMessages(false);
        } else {
          // User was not at bottom, show arrow
          setHasNewMessages(true);
        }
      }
    }, [messages, checkIfAtBottom]);

    // Add scroll event listener
    useEffect(() => {
      const container = messagesContainerRef.current;
      if (container) {
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
      }
    }, [handleScroll]);

    // Initialize scroll position when chat opens
    useEffect(() => {
      if (isOpen && messagesContainerRef.current) {
        // Reset states when chat opens
        setIsAtBottom(true);
        setHasNewMessages(false);
        // Ensure we're at bottom when chat opens (longer delay to ensure rendering)
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 200);
      }
    }, [isOpen]);

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
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    };

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

    const resizeMessageInput = useCallback((value: string) => {
      const textarea = messageInputRef.current;
      if (!textarea) return;

      textarea.style.height = 'auto';
      const contentHeight = value.trim()
        ? textarea.scrollHeight
        : MESSAGE_INPUT_MIN_HEIGHT;
      const nextHeight = Math.min(
        Math.max(contentHeight, MESSAGE_INPUT_MIN_HEIGHT),
        MESSAGE_INPUT_MAX_HEIGHT
      );
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY =
        textarea.scrollHeight > MESSAGE_INPUT_MAX_HEIGHT ? 'auto' : 'hidden';
      setMessageInputHeight(prevHeight =>
        prevHeight === nextHeight ? prevHeight : nextHeight
      );
    }, []);

    useLayoutEffect(() => {
      if (!isOpen) return;
      resizeMessageInput(message);
    }, [isOpen, message, resizeMessageInput]);

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
        className="relative h-full w-full"
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
            className="flex-1 px-3 pt-3 overflow-y-auto space-y-3"
            style={{
              overflowAnchor: 'none',
              paddingBottom: messageInputHeight + 108,
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
                const isMenuOpen = openMenuMessageId === msg.id;

                // Use stableKey from message if available, otherwise fall back to ID
                const animationKey = msg.stableKey || msg.id;

                const isExpanded = expandedMessageIds.has(msg.id);
                const isMessageLong =
                  !isExpanded && msg.message.length > MAX_MESSAGE_CHARS;
                const displayMessage = isMessageLong
                  ? msg.message.slice(0, MAX_MESSAGE_CHARS).trimEnd()
                  : msg.message;

                return (
                  <motion.div
                    key={animationKey}
                    initial={{ opacity: 0, scale: 0.7, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
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
                            toggleMessageMenu(event.currentTarget, msg.id);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              toggleMessageMenu(event.currentTarget, msg.id);
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
                                y: menuPlacement === 'down' ? 6 : -6,
                              }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{
                                opacity: 0,
                                scale: 0.98,
                                y: 0,
                              }}
                              transition={{ duration: 0.12, ease: 'easeOut' }}
                              className={`absolute z-20 min-w-[120px] overflow-hidden rounded-xl bg-white text-slate-900 shadow-lg ${
                                menuPlacement === 'left'
                                  ? 'left-full ml-2 top-1/2 -translate-y-1/2 origin-left'
                                  : menuPlacement === 'down'
                                    ? 'bottom-full mb-2 right-0 origin-bottom-right'
                                    : 'top-full mt-2 right-0 origin-top-right'
                              }`}
                              onClick={event => event.stopPropagation()}
                            >
                              <span
                                className={`absolute w-0 h-0 border-6 border-transparent ${
                                  menuPlacement === 'left'
                                    ? 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-r-white'
                                    : menuPlacement === 'down'
                                      ? 'bottom-0 right-3 translate-y-full border-t-white'
                                      : 'top-0 right-3 -translate-y-full border-b-white'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100 transition-colors"
                              >
                                <TbCopy className="h-4 w-4" />
                                Salin
                              </button>
                              {isCurrentUser ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditMessage(msg)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100 transition-colors"
                                  >
                                    <TbPencil className="h-4 w-4" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMessage(msg)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-700 hover:bg-slate-100 transition-colors"
                                  >
                                    <TbTrash className="h-4 w-4" />
                                    Hapus
                                  </button>
                                </>
                              ) : null}
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
                            <span className="text-xs text-slate-400">
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
                            <span className="text-xs text-slate-400">
                              {displayTime}
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
                className="absolute left-2 z-20 cursor-pointer text-primary hover:text-primary/80 transition-colors"
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
          <div className="absolute bottom-2 left-0 right-0 px-3 pb-4">
            <div className="relative z-10 rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08)] px-4 py-2.5 transition-[height] duration-200 ease-out">
              <div
                className={`grid grid-cols-[auto_1fr_auto] gap-x-2 ${
                  isMessageInputMultiline
                    ? 'grid-rows-[auto_auto] gap-y-1 items-end'
                    : 'grid-rows-[auto] gap-y-0 items-center'
                }`}
              >
                <textarea
                  ref={messageInputRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  rows={1}
                  style={{ height: `${messageInputHeight}px` }}
                  className={`w-full resize-none bg-transparent border-0 p-0 text-[15px] leading-[22px] text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:ring-0 transition-[height] duration-200 ease-out ${
                    isMessageInputMultiline
                      ? 'col-span-3 row-start-1'
                      : 'col-start-2 row-start-1'
                  }`}
                />
                <button
                  type="button"
                  className={`h-8 w-8 rounded-full text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0 ${
                    isMessageInputMultiline
                      ? 'col-start-1 row-start-2'
                      : 'col-start-1 row-start-1'
                  }`}
                >
                  <TbPlus size={20} />
                </button>
                <button
                  onClick={handleSendMessage}
                  className={`h-9 w-9 rounded-full bg-violet-500 text-white flex items-center justify-center transition-colors whitespace-nowrap hover:bg-violet-600 shrink-0 ${
                    isMessageInputMultiline
                      ? 'col-start-3 row-start-2'
                      : 'col-start-3 row-start-1'
                  }`}
                >
                  <TbSend2 size={20} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);

ChatSidebarPanel.displayName = 'ChatSidebarPanel';

export default ChatSidebarPanel;
