import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface BroadcastChannelOptions {
  channelName: string;
  onMessage?: (event: string, payload: unknown) => void;
  onStatusChange?: (status: string, error?: unknown) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  enableAck?: boolean;
  receiveSelfMessages?: boolean;
}

interface BroadcastChannelStatus {
  isConnected: boolean;
  isConnecting: boolean;
  lastError: string | null;
  reconnectAttempts: number;
  lastMessageTime: number;
}

export const useBroadcastChannel = (options: BroadcastChannelOptions) => {
  const {
    channelName,
    onMessage,
    onStatusChange,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    enableAck = true,
    receiveSelfMessages = false,
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimeRef = useRef(Date.now());
  const connectionReadyRef = useRef(false);

  const [status, setStatus] = useState<BroadcastChannelStatus>({
    isConnected: false,
    isConnecting: false,
    lastError: null,
    reconnectAttempts: 0,
    lastMessageTime: 0,
  });

  // Update status helper
  const updateStatus = useCallback((updates: Partial<BroadcastChannelStatus>) => {
    setStatus(prev => ({ ...prev, ...updates }));
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log(`🧹 Cleaning up broadcast channel: ${channelName}`);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.warn(`Error removing channel ${channelName}:`, error);
      }
      channelRef.current = null;
    }

    connectionReadyRef.current = false;
    updateStatus({
      isConnected: false,
      isConnecting: false,
      lastError: null,
    });
  }, [channelName, updateStatus]);

  // Stop health check
  const stopHealthCheck = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Main connection function
  const connectToChannel = useCallback(() => {
    console.log(`🔗 Connecting to broadcast channel: ${channelName}`);
    
    // Cleanup existing connection
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    updateStatus({
      isConnecting: true,
      lastError: null,
    });

    // Create new channel
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: {
          self: receiveSelfMessages,
          ack: enableAck,
        },
      },
    });

    channelRef.current = channel;

    // Handle broadcast messages
    channel.on('broadcast', { event: '*' }, (payload) => {
      lastMessageTimeRef.current = Date.now();
      updateStatus({ lastMessageTime: lastMessageTimeRef.current });
      
      // Reset reconnect attempts on successful message
      reconnectAttemptsRef.current = 0;
      updateStatus({ reconnectAttempts: 0 });

      if (onMessage) {
        onMessage(payload.event, payload.payload);
      }
    });

    // Reconnection function (defined here to avoid circular dependency)
    const scheduleReconnect = () => {
      if (!autoReconnect) return;

      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.error(`❌ Max reconnect attempts (${maxReconnectAttempts}) reached for ${channelName}`);
        updateStatus({
          isConnecting: false,
          lastError: `Max reconnect attempts reached`,
        });
        onStatusChange?.('MAX_RETRIES_REACHED');
        return;
      }

      if (reconnectTimeoutRef.current) return; // Already reconnecting

      // Calculate exponential backoff delay
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;

      console.log(
        `🔄 Reconnecting broadcast channel ${channelName} in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
      );

      updateStatus({
        isConnecting: true,
        reconnectAttempts: reconnectAttemptsRef.current,
      });

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connectToChannel();
      }, delay);
    };

    // Connection health check for broadcast channels
    const startHealthCheck = () => {
      if (heartbeatIntervalRef.current) return;

      heartbeatIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const timeSinceLastMessage = now - lastMessageTimeRef.current;

        // If no messages received in 2 minutes, channel might be stale
        if (timeSinceLastMessage > 120000 && connectionReadyRef.current) {
          console.warn(`🚨 No broadcast messages received for 2 minutes on ${channelName}`);
          
          // Send a test message to check if channel is responding
          if (channelRef.current && status.isConnected) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'health_check',
              payload: { timestamp: now }
            }).catch(error => {
              console.error('Health check failed, triggering reconnection:', error);
              scheduleReconnect();
            });
          }
        }
      }, 60000); // Check every minute
    };

    // Subscribe and handle status
    channel.subscribe((subscriptionStatus, err) => {
      console.log(`📡 Broadcast channel ${channelName} status: ${subscriptionStatus}`, err ? `Error: ${err}` : '');

      switch (subscriptionStatus) {
        case 'SUBSCRIBED':
          console.log(`✅ Successfully connected to broadcast channel: ${channelName}`);
          connectionReadyRef.current = true;
          reconnectAttemptsRef.current = 0;
          lastMessageTimeRef.current = Date.now();

          updateStatus({
            isConnected: true,
            isConnecting: false,
            lastError: null,
            reconnectAttempts: 0,
            lastMessageTime: lastMessageTimeRef.current,
          });

          startHealthCheck();
          onStatusChange?.(subscriptionStatus);
          break;

        case 'CHANNEL_ERROR':
          console.error(`❌ Broadcast channel error for ${channelName}:`, err);
          connectionReadyRef.current = false;
          stopHealthCheck();

          updateStatus({
            isConnected: false,
            isConnecting: false,
            lastError: typeof err === 'string' ? err : (err as Error)?.message || 'Channel error',
          });

          onStatusChange?.(subscriptionStatus, err);
          scheduleReconnect();
          break;

        case 'TIMED_OUT':
          console.warn(`⏰ Broadcast channel ${channelName} timed out`);
          connectionReadyRef.current = false;
          stopHealthCheck();

          updateStatus({
            isConnected: false,
            isConnecting: false,
            lastError: 'Connection timed out',
          });

          onStatusChange?.(subscriptionStatus);
          scheduleReconnect();
          break;

        case 'CLOSED':
          console.log(`🔌 Broadcast channel ${channelName} closed`);
          connectionReadyRef.current = false;
          stopHealthCheck();

          updateStatus({
            isConnected: false,
            isConnecting: false,
            lastError: 'Channel closed',
          });

          onStatusChange?.(subscriptionStatus);
          scheduleReconnect();
          break;

        default:
          onStatusChange?.(subscriptionStatus, err);
      }
    });
  }, [
    channelName,
    receiveSelfMessages,
    enableAck,
    onMessage,
    onStatusChange,
    updateStatus,
    stopHealthCheck,
    autoReconnect,
    maxReconnectAttempts,
    status.isConnected,
  ]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    console.log(`🔄 Manual reconnect triggered for ${channelName}`);
    reconnectAttemptsRef.current = 0; // Reset attempts for manual reconnect
    cleanup();
    setTimeout(connectToChannel, 100);
  }, [channelName, cleanup, connectToChannel]);

  // Send message function
  const sendMessage = useCallback(async (event: string, payload: unknown) => {
    if (!channelRef.current || !status.isConnected) {
      console.warn(`Cannot send message: channel ${channelName} not connected`);
      return { success: false, error: 'Channel not connected' };
    }

    try {
      const result = await channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      });

      return { success: true, result };
    } catch (error) {
      console.error(`Error sending broadcast message to ${channelName}:`, error);
      return { success: false, error };
    }
  }, [channelName, status.isConnected]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !status.isConnected && autoReconnect) {
        console.log(`📱 Page visible - checking broadcast channel ${channelName}...`);
        setTimeout(reconnect, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [channelName, status.isConnected, autoReconnect, reconnect]);

  // Initial connection
  useEffect(() => {
    connectToChannel();
    return cleanup;
  }, [connectToChannel, cleanup]);

  return {
    status,
    sendMessage,
    reconnect,
    disconnect: cleanup,
    isConnected: status.isConnected,
    isConnecting: status.isConnecting,
    lastError: status.lastError,
    reconnectAttempts: status.reconnectAttempts,
  };
};