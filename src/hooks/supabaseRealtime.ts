import { useEffect } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface SupabaseRealtimeOptions {
    enabled?: boolean;
}

export const useSupabaseRealtime = (
    tableName: string,
    queryKeyToInvalidate: QueryKey,
    options: SupabaseRealtimeOptions = {}
) => {
    const { enabled = true } = options;
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const channelName = `realtime:${tableName}:${Array.isArray(queryKeyToInvalidate) ? queryKeyToInvalidate.join('-') : queryKeyToInvalidate}`;
        
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: tableName },
                (payload) => {
                    console.log(`Realtime update on ${tableName} (hook):`, payload);
                    queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Subscribed to realtime updates for ${tableName}`);
                }
                if (err) {
                    console.error(`Realtime subscription error for ${tableName}:`, err);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tableName, queryKeyToInvalidate, queryClient, enabled]);
};
