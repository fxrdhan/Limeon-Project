import { useState, memo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RiSendPlaneFill } from 'react-icons/ri';
import { PiArrowCircleDownFill } from 'react-icons/pi';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  channel_id: string | null;
  message: string;
  message_type: 'text' | 'image' | 'file';
  created_at: string;
  updated_at: string;
  is_read: boolean;
  reply_to_id: string | null;
  // Virtual fields for display
  sender_name?: string;
  receiver_name?: string;
  // Stable key for consistent animation during optimistic updates
  stableKey?: string;
}

interface ChatPortalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: {
    id: string;
    name: string;
    email: string;
    profilephoto?: string | null;
  };
}

// Generate channel ID for direct messages
const generateChannelId = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort();
  return `dm_${sortedIds[0]}_${sortedIds[1]}`;
};

interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_seen: string;
  current_chat_channel: string | null;
}

const ChatPortal = memo(({ isOpen, onClose, targetUser }: ChatPortalProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [targetUserPresence, setTargetUserPresence] =
    useState<UserPresence | null>(null);
  const { user } = useAuthStore();
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

    // console.log('🔴 Updating user chat close:', { userId: user.id });

    try {
      const { error } = await supabase
        .from('user_presence')
        .update({
          is_online: false,
          current_chat_channel: null,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select();

      if (error) {
        console.error('❌ Error updating user chat close:', error);
      }
      // else {
      //   console.log('✅ Successfully updated user chat close:', data);
      // }
    } catch (error) {
      console.error('❌ Caught error updating user chat close:', error);
    }
  }, [user]);

  // Centralized close logic (used by close button AND external triggers)
  const performClose = useCallback(async () => {
    if (hasClosedRef.current || !user) {
      // console.log('📡 Close already performed or no user');
      return;
    }

    // console.log('🚪 Performing close sequence...');

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
      // console.log('💾 Database updated successfully');
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
      const { data: updateData, error: updateError } = await supabase
        .from('user_presence')
        .update({
          is_online: true,
          current_chat_channel: currentChannelId,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select();

      if (updateError || !updateData || updateData.length === 0) {
        // If update failed or no rows affected, try insert

        const { error: insertError } = await supabase
          .from('user_presence')
          .insert({
            user_id: user.id,
            is_online: true,
            current_chat_channel: currentChannelId,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select();

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
      const { data: presence, error } = await supabase
        .from('user_presence')
        .select('user_id, is_online, last_seen, current_chat_channel')
        .eq('user_id', targetUser.id)
        .single();

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
      // console.log('🚪 Chat closing detected from external trigger');

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
        const { data: existingMessages, error } = await supabase
          .from('chat_messages')
          .select('*')
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${targetUser.id}),and(sender_id.eq.${targetUser.id},receiver_id.eq.${user.id})`
          )
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading messages:', error);
          return;
        }

        // Transform messages for display (use existing user data)
        const transformedMessages: ChatMessage[] = (existingMessages || []).map(
          msg => ({
            ...msg,
            sender_name:
              msg.sender_id === user.id
                ? user.name || 'You'
                : targetUser.name || 'Unknown',
            receiver_name:
              msg.receiver_id === user.id
                ? user.name || 'You'
                : targetUser.name || 'Unknown',
          })
        );

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
        supabase.removeChannel(channelRef.current);
      }

      // Create new channel for this conversation
      const channel = supabase.channel(`chat_${currentChannelId}`, {
        config: {
          broadcast: { self: true },
        },
      });

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
        supabase.removeChannel(presenceChannelRef.current);
      }

      // Create presence channel
      const presenceChannel = supabase.channel('user_presence_changes', {
        config: {
          broadcast: { self: false },
        },
      });

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
        supabase.removeChannel(globalPresenceChannelRef.current);
      }

      // Create GLOBAL presence channel that ALL users subscribe to
      const globalPresenceChannel = supabase.channel(
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
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      if (globalPresenceChannelRef.current) {
        supabase.removeChannel(globalPresenceChannelRef.current);
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
      // console.log('🚪 Component unmount - attempting close...');

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
          supabase.removeChannel(globalPresenceChannelRef.current);
          globalPresenceChannelRef.current = null;
        }
      }, 200);
    };
  }, [user, performClose]);

  // Handle browser tab close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      // console.log('🚪 Page unload - attempting close...');
      if (!hasClosedRef.current && user) {
        // Perform synchronous close operations for page unload
        hasClosedRef.current = true;
        updateUserChatClose();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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
      'bg-gray-500',
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

  const handleSendMessage = async () => {
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
      const { data: newMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          receiver_id: targetUser.id,
          channel_id: currentChannelId,
          message: messageText,
          message_type: 'text',
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        // Remove optimistic message and restore input
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

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ transformOrigin: 'top right' }}
          className="relative z-50 w-96 bg-white rounded-xl shadow-lg border border-gray-200"
        >
          {/* Chat Content */}
          <div className="relative h-[500px] flex flex-col">
            {/* Chat Header */}
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">
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
                        <span className="text-xs text-gray-400">
                          Last seen{' '}
                          {formatLastSeen(targetUserPresence.last_seen)}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 p-3 overflow-y-auto space-y-3"
            >
              {loading && messages.length === 0 ? (
                <div className="flex justify-center items-center py-8">
                  <div className="text-gray-400 text-sm">
                    Loading messages...
                  </div>
                </div>
              ) : (
                messages.map(msg => {
                  const isCurrentUser = msg.sender_id === user?.id;
                  const displayTime = new Date(
                    msg.created_at
                  ).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  // Use stableKey from message if available, otherwise fall back to ID
                  const animationKey = msg.stableKey || msg.id;

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
                      className={`flex w-full ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`${isCurrentUser ? 'flex flex-col items-end max-w-xs' : 'flex flex-col items-start max-w-xs'}`}
                      >
                        {/* Message Bubble */}
                        <div
                          className={`relative px-3 py-2 text-sm inline-block ${
                            isCurrentUser
                              ? 'bg-primary text-gray-100 rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl'
                              : 'bg-gray-100 text-gray-800 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl'
                          }`}
                          style={{
                            [isCurrentUser
                              ? 'borderBottomRightRadius'
                              : 'borderBottomLeftRadius']: '2px',
                          }}
                        >
                          {msg.message}
                        </div>

                        {/* Message Info */}
                        <div
                          className={`flex items-center gap-2 mt-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {isCurrentUser ? (
                            <>
                              <span className="text-xs text-gray-400">
                                {displayTime}
                              </span>
                              <div className="w-4 h-4 rounded-full overflow-hidden shrink-0">
                                {user?.profilephoto ? (
                                  <img
                                    src={user.profilephoto}
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
                                {targetUser?.profilephoto ? (
                                  <img
                                    src={targetUser.profilephoto}
                                    alt={targetUser.name}
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
                              <span className="text-xs text-gray-400">
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
                  className="absolute bottom-16 left-2 z-20 cursor-pointer text-primary hover:text-primary/80 transition-colors"
                  style={{
                    filter: 'drop-shadow(0 0 0 white)',
                    background:
                      'radial-gradient(circle at center, white 30%, transparent 30%)',
                  }}
                >
                  <PiArrowCircleDownFill size={32} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message Input */}
            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center">
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyUp={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 p-2.5 border border-gray-300 rounded-full px-3 text-sm h-[2.5rem] focus:outline-hidden focus:border-primary focus:ring-3 focus:ring-emerald-200 transition-all duration-200 ease-in-out"
                />
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${message.trim() ? 'w-10 ml-2' : 'w-0 ml-0'}`}
                >
                  <button
                    onClick={handleSendMessage}
                    className="p-1 transition-colors whitespace-nowrap"
                  >
                    <RiSendPlaneFill
                      size={28}
                      className="text-emerald-600 hover:text-primary"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ChatPortal.displayName = 'ChatPortal';

export default ChatPortal;
