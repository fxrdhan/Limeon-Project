import { useAuthStore } from '@/store/authStore';
import { usePresenceStore } from '@/store/presenceStore';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usersService } from '@/services/api/users.service';
import { realtimeService } from '@/services/realtime/realtime.service';
import {
  cacheImageBlob,
  getCachedImageBlobUrl,
  setCachedImage,
} from '@/utils/imageCache';
import { mergePresenceUsers } from './roster';

// Helper function to count unique users from presence state
const countUniqueUsers = (presenceState: Record<string, unknown>) => {
  const uniqueUsers = new Set<string>();
  Object.values(presenceState).forEach((presence: unknown) => {
    if (Array.isArray(presence)) {
      presence.forEach((p: unknown) => {
        if (
          p &&
          typeof p === 'object' &&
          'user_id' in p &&
          typeof p.user_id === 'string'
        ) {
          uniqueUsers.add(p.user_id);
        }
      });
    }
  });
  const count = uniqueUsers.size;
  return count;
};

// Helper function to get unique user IDs from presence state
const getUniqueUserIds = (presenceState: Record<string, unknown>): string[] => {
  const uniqueUsers = new Set<string>();
  Object.values(presenceState).forEach((presence: unknown) => {
    if (Array.isArray(presence)) {
      presence.forEach((p: unknown) => {
        if (
          p &&
          typeof p === 'object' &&
          'user_id' in p &&
          typeof p.user_id === 'string'
        ) {
          uniqueUsers.add(p.user_id);
        }
      });
    }
  });
  return Array.from(uniqueUsers);
};

const areOnlineUserListsEqual = (
  previousUsers: Array<{
    id: string;
    name: string;
    email: string;
    profilephoto: string | null;
  }>,
  nextUsers: Array<{
    id: string;
    name: string;
    email: string;
    profilephoto: string | null;
  }>
) =>
  previousUsers.length === nextUsers.length &&
  previousUsers.every((previousUser, index) => {
    const nextUser = nextUsers[index];
    return (
      previousUser.id === nextUser?.id &&
      previousUser.name === nextUser?.name &&
      previousUser.email === nextUser?.email &&
      previousUser.profilephoto === nextUser?.profilephoto &&
      Boolean(nextUser)
    );
  });

export const usePresence = () => {
  const { user } = useAuthStore();
  const {
    onlineUsersList,
    allUsersList,
    setChannel,
    setOnlineUsers,
    setOnlineUsersList,
    setAllUsersList,
    setPortalImageUrls,
  } = usePresenceStore();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSetupRef = useRef(false);
  const isConnectedRef = useRef(false);
  const isSubscribedRef = useRef(false);
  const setupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onlinePresenceUserIdsRef = useRef<string[]>([]);
  const handlePresenceChangeRef = useRef<
    (presenceState: Record<string, unknown>) => {
      userCount: number;
      userIds: string[];
    }
  >(() => ({
    userCount: 0,
    userIds: [],
  }));

  const rosterUsers = useMemo(
    () => mergePresenceUsers(onlineUsersList, allUsersList),
    [allUsersList, onlineUsersList]
  );

  const buildOnlineUsers = useCallback(
    (userIds: string[]) => {
      if (userIds.length === 0) {
        return [];
      }

      const onlineUserIdSet = new Set(userIds);
      const onlineAt = new Date().toISOString();

      if (allUsersList.length > 0) {
        return allUsersList
          .filter(knownUser => onlineUserIdSet.has(knownUser.id))
          .map(knownUser => ({
            ...knownUser,
            online_at: onlineAt,
          }));
      }

      if (user && onlineUserIdSet.has(user.id)) {
        return [
          {
            id: user.id,
            name: user.name,
            email: user.email,
            profilephoto: user.profilephoto,
            online_at: onlineAt,
          },
        ];
      }

      return [];
    },
    [allUsersList, user]
  );

  // Helper to handle presence state changes
  const handlePresenceChange = useCallback(
    (presenceState: Record<string, unknown>) => {
      const userCount = countUniqueUsers(presenceState);
      const userIds = getUniqueUserIds(presenceState);

      onlinePresenceUserIdsRef.current = userIds;
      setOnlineUsers(userCount);
      setOnlineUsersList(buildOnlineUsers(userIds));

      return { userCount, userIds };
    },
    [buildOnlineUsers, setOnlineUsers, setOnlineUsersList]
  );

  useEffect(() => {
    handlePresenceChangeRef.current = handlePresenceChange;
  }, [handlePresenceChange]);

  const cleanupChannel = useCallback(async () => {
    const currentChannel = channelRef.current;
    const wasConnected = isConnectedRef.current;

    if (currentChannel) {
      // Set to null immediately to prevent double cleanup
      channelRef.current = null;
      isConnectedRef.current = false;
      isSubscribedRef.current = false;

      try {
        // Only unsubscribe if channel was connected
        if (wasConnected) {
          void currentChannel.unsubscribe();
        }
        // Add a small delay to allow WebSocket to close properly
        await new Promise(resolve => setTimeout(resolve, 100));

        // Additional null check before removing channel
        if (currentChannel) {
          await realtimeService.removeChannel(currentChannel);
        }
      } catch (cleanupError) {
        // Silently handle cleanup errors - they're expected during rapid cleanup cycles
        if (
          (cleanupError as Error)?.message?.includes('channel is null') ||
          (cleanupError as Error)?.message?.includes(
            'Cannot read properties of null'
          ) ||
          (cleanupError as Error)?.message?.includes(
            'tried to subscribe multiple times'
          )
        ) {
          // Expected error during React Strict Mode - ignore it
          return;
        }
        console.warn('Channel cleanup warning:', cleanupError);
      }
    }
  }, []);

  const setupPresence = useCallback(async () => {
    if (!user || isSetupRef.current || isSubscribedRef.current) return;

    // Clear any pending setup timeout
    if (setupTimeoutRef.current) {
      clearTimeout(setupTimeoutRef.current);
      setupTimeoutRef.current = null;
    }

    try {
      // Cleanup any existing channel first
      await cleanupChannel();

      const presenceKey = `${user.id}:${Date.now()}`;

      const newChannel = realtimeService.createChannel('browser-active', {
        config: {
          presence: {
            key: presenceKey,
          },
        },
      });

      // Set up event handlers before subscribing
      newChannel
        .on('presence', { event: 'sync' }, () => {
          if (!isConnectedRef.current) return;
          const presenceState = newChannel.presenceState();
          handlePresenceChangeRef.current(presenceState);
        })
        .on('presence', { event: 'join' }, () => {
          if (!isConnectedRef.current) return;
          const presenceState = newChannel.presenceState();
          handlePresenceChangeRef.current(presenceState);
        })
        .on('presence', { event: 'leave' }, () => {
          if (!isConnectedRef.current) return;
          const presenceState = newChannel.presenceState();
          handlePresenceChangeRef.current(presenceState);
        });

      // Mark as subscribed before calling subscribe to prevent multiple calls
      isSubscribedRef.current = true;
      channelRef.current = newChannel;
      setChannel(newChannel);

      newChannel.subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          isConnectedRef.current = true;
          try {
            await newChannel.track({
              online_at: new Date().toISOString(),
              user_id: user.id,
            });

            // Set initial count to 1 (current user) if no presence state yet
            setTimeout(() => {
              if (!isConnectedRef.current) return;
              const presenceState = newChannel.presenceState();
              const userCount = countUniqueUsers(presenceState);
              if (userCount === 0) {
                setOnlineUsers(1);
                // Set current user in the list if available
                if (user) {
                  setOnlineUsersList([
                    {
                      id: user.id,
                      name: user.name,
                      email: user.email,
                      profilephoto: user.profilephoto,
                      online_at: new Date().toISOString(),
                    },
                  ]);
                }
              } else {
                handlePresenceChangeRef.current(presenceState);
              }
            }, 100);
          } catch (trackError) {
            console.error('Failed to track presence:', trackError);
            setOnlineUsers(1);
          }
        } else if (status === 'CHANNEL_ERROR') {
          isConnectedRef.current = false;
          isSubscribedRef.current = false;
          setOnlineUsers(1);
        } else if (status === 'TIMED_OUT') {
          isConnectedRef.current = false;
          isSubscribedRef.current = false;
          setOnlineUsers(1);
        } else if (status === 'CLOSED') {
          isConnectedRef.current = false;
          isSubscribedRef.current = false;
        }
      });

      isSetupRef.current = true;
    } catch (error) {
      console.error('Failed to setup presence:', error);
      isConnectedRef.current = false;
      isSubscribedRef.current = false;
      // Set to 1 as fallback (current user)
      setOnlineUsers(1);
    }
  }, [user, setChannel, setOnlineUsers, setOnlineUsersList, cleanupChannel]);

  const cleanup = useCallback(async () => {
    await cleanupChannel();
    setChannel(null);
    setOnlineUsers(0);
    setOnlineUsersList([]);
    setAllUsersList([]);
    setPortalImageUrls({});
    isSetupRef.current = false;
    isSubscribedRef.current = false;
  }, [
    cleanupChannel,
    setAllUsersList,
    setChannel,
    setOnlineUsers,
    setOnlineUsersList,
    setPortalImageUrls,
  ]);

  useEffect(() => {
    let isActive = true;

    const resolveAllUsers = async () => {
      if (!user?.id) {
        if (isActive) {
          setAllUsersList([]);
        }
        return;
      }

      const { data, error } = await usersService.getAllUsers();
      if (!isActive) return;

      if (error) {
        setAllUsersList([]);
        return;
      }

      setAllUsersList(data || []);
    };

    void resolveAllUsers();

    return () => {
      isActive = false;
    };
  }, [setAllUsersList, user?.id]);

  useEffect(() => {
    const nextOnlineUsers = buildOnlineUsers(onlinePresenceUserIdsRef.current);

    if (areOnlineUserListsEqual(onlineUsersList, nextOnlineUsers)) {
      return;
    }

    setOnlineUsersList(nextOnlineUsers);
  }, [buildOnlineUsers, onlineUsersList, setOnlineUsersList]);

  useEffect(() => {
    let isActive = true;

    const resolveRosterImages = async () => {
      if (rosterUsers.length === 0) {
        if (isActive) {
          setPortalImageUrls({});
        }
        return;
      }

      const entries = await Promise.all(
        rosterUsers.map(async rosterUser => {
          const profilePhotoUrl = rosterUser.profilephoto ?? '';
          if (!profilePhotoUrl) return [rosterUser.id, ''] as const;

          if (!profilePhotoUrl.startsWith('http')) {
            return [rosterUser.id, profilePhotoUrl] as const;
          }

          const cacheKey = `profile:${rosterUser.id}`;
          setCachedImage(cacheKey, profilePhotoUrl);

          const cachedBlobUrl = await getCachedImageBlobUrl(profilePhotoUrl);
          if (cachedBlobUrl) {
            return [rosterUser.id, cachedBlobUrl] as const;
          }

          const blobUrl = await cacheImageBlob(profilePhotoUrl);
          return [rosterUser.id, blobUrl || profilePhotoUrl] as const;
        })
      );

      if (!isActive) return;

      setPortalImageUrls(
        Object.fromEntries(entries.filter(([, url]) => Boolean(url)))
      );
    };

    void resolveRosterImages();

    return () => {
      isActive = false;
    };
  }, [rosterUsers, setPortalImageUrls]);

  useEffect(() => {
    if (user) {
      // Debounce setup to prevent rapid calls
      if (setupTimeoutRef.current) {
        clearTimeout(setupTimeoutRef.current);
      }
      setupTimeoutRef.current = setTimeout(() => {
        void setupPresence();
      }, 100);
    } else {
      void cleanup();
    }

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Always try to re-establish presence when page becomes visible
        if (!isConnectedRef.current) {
          isSetupRef.current = false;
          void setupPresence();
        } else if (channelRef.current) {
          // Re-track presence immediately when page becomes visible
          try {
            void channelRef.current.track({
              online_at: new Date().toISOString(),
              user_id: user.id,
            });
          } catch (error) {
            console.warn(
              'Failed to re-track presence on visibility change:',
              error
            );
          }
        }
      }
    };

    // Handle beforeunload to ensure cleanup
    const handleBeforeUnload = () => {
      const currentChannel = channelRef.current;
      if (currentChannel && isConnectedRef.current) {
        try {
          void currentChannel.unsubscribe();
          isConnectedRef.current = false;
          isSubscribedRef.current = false;
        } catch {
          // Ignore errors during unload - expected in some scenarios
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Clear any pending setup timeout
      if (setupTimeoutRef.current) {
        clearTimeout(setupTimeoutRef.current);
        setupTimeoutRef.current = null;
      }

      // Use a timeout to prevent cleanup conflicts in React Strict Mode
      setTimeout(() => {
        void cleanup();
      }, 0);
    };
  }, [user, setupPresence, cleanup]);

  // Heartbeat to maintain presence
  useEffect(() => {
    if (!user || !channelRef.current || !isConnectedRef.current) return;

    const heartbeat = setInterval(() => {
      if (channelRef.current && isConnectedRef.current) {
        try {
          void channelRef.current.track({
            online_at: new Date().toISOString(),
            user_id: user.id,
          });
        } catch (heartbeatError) {
          console.warn('Failed to update presence heartbeat:', heartbeatError);
        }
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(heartbeat);
  }, [user]);
};
