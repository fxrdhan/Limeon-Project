import { useEffect } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface SupabaseRealtimeOptions {
    enabled?: boolean;
    onRealtimeEvent?: (payload: RealtimePostgresChangesPayload<{[key: string]: unknown;}>) => void;
}

export const useSupabaseRealtime = (
    tableName: string,
    queryKeyToInvalidate: QueryKey | null,
    options: SupabaseRealtimeOptions = {}
) => {
    const { enabled = true, onRealtimeEvent } = options;
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let channelIdentifier = 'custom-callback';
        if (queryKeyToInvalidate) {
            channelIdentifier = Array.isArray(queryKeyToInvalidate) ? queryKeyToInvalidate.join('-') : String(queryKeyToInvalidate);
        }
        const channelName = `realtime:${tableName}:${channelIdentifier}`;
        
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: tableName },
                (payload) => {
                    console.log(`Realtime update on ${tableName} (hook via ${onRealtimeEvent ? 'callback' : 'query-invalidation'}):`, payload);
                    if (onRealtimeEvent) {
                        onRealtimeEvent(payload);
                    } else if (queryKeyToInvalidate) { 
                        queryClient.invalidateQueries({ queryKey: Array.isArray(queryKeyToInvalidate) ? queryKeyToInvalidate : [queryKeyToInvalidate] });
                    }
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Subscribed to realtime updates for ${tableName} (${onRealtimeEvent ? 'callback' : 'query-invalidation'})`);
                }
                if (err) {
                    console.error(`Realtime subscription error for ${tableName}:`, err);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tableName, queryKeyToInvalidate, queryClient, enabled, onRealtimeEvent]);
};
