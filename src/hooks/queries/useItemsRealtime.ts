import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import { useItems } from './useItems';
import type { DBItem } from '@/types/database';

interface UseItemsRealtimeOptions {
  enabled?: boolean;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
}

export const useItemsRealtime = (options?: UseItemsRealtimeOptions) => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Use the existing useItems hook for initial data fetching
  const itemsQuery = useItems(options);
  
  useEffect(() => {
    // Only set up realtime if enabled (default true)
    if (options?.enabled === false) return;
    
    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    // Create new subscription
    const channel = supabase
      .channel('realtime-items')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'items'
        },
        (payload: any) => {
          console.log('🔔 Items realtime change detected:', payload);
          
          // Handle different event types
          switch (payload.eventType) {
            case 'INSERT': {
              console.log('➕ New item inserted:', payload.new);
              // Invalidate and refetch all items queries
              const insertKeysToInvalidate = getInvalidationKeys.items.all();
              insertKeysToInvalidate.forEach(keySet => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }
              
            case 'UPDATE': {
              console.log('✏️ Item updated:', payload.new);
              // Update specific item in cache if possible
              const updatedItem = payload.new as DBItem;
              
              // Update item detail cache
              queryClient.setQueryData(
                QueryKeys.items.detail(updatedItem.id), 
                updatedItem
              );
              
              // Invalidate list queries to refresh with updated data
              const updateKeysToInvalidate = getInvalidationKeys.items.all();
              updateKeysToInvalidate.forEach(keySet => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }
              
            case 'DELETE': {
              console.log('🗑️ Item deleted:', payload.old);
              const deletedItem = payload.old as DBItem;
              
              // Remove from specific queries
              queryClient.removeQueries({
                queryKey: QueryKeys.items.detail(deletedItem.id)
              });
              
              // Invalidate list queries
              const deleteKeysToInvalidate = getInvalidationKeys.items.all();
              deleteKeysToInvalidate.forEach(keySet => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }
              
            default:
              console.log('🔄 Unknown event type:', payload.eventType);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Items realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to items realtime changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Items realtime subscription error');
        } else if (status === 'TIMED_OUT') {
          console.warn('⏰ Items realtime subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('🔒 Items realtime subscription closed');
        }
      });
    
    subscriptionRef.current = channel;
    
    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up items realtime subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [options?.enabled, queryClient]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Component unmounting - cleaning up items realtime subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);
  
  return itemsQuery;
};