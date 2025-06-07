import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { usePresenceStore } from '@/store/presenceStore';

export const usePresence = () => {
    const { user } = useAuthStore();
    const { channel, setChannel, setOnlineUsers } = usePresenceStore();

    const setupPresence = useCallback(async () => {
        if (!user || channel) return;

        const newChannel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        newChannel
            .on('presence', { event: 'sync' }, () => {
                const presenceState = newChannel.presenceState();
                const userCount = Object.keys(presenceState).length;
                setOnlineUsers(userCount);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await newChannel.track({ online_at: new Date().toISOString() });
                }
            });

        setChannel(newChannel);

    }, [user, channel, setChannel, setOnlineUsers]);

    useEffect(() => {
        setupPresence();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
                setChannel(null);
            }
        };
    }, [user, channel, setupPresence, setChannel]);
};
