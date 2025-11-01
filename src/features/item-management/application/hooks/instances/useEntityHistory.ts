import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { HISTORY_DEBUG } from '../../../config/debug';

interface EntityHistoryItem {
  id: string;
  entity_table: string;
  entity_id: string;
  version_number: number;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by: string | null;
  changed_at: string;
  entity_data: Record<string, unknown>;
  changed_fields?: Record<string, { from: unknown; to: unknown }>;
  change_description?: string;
}

export const useEntityHistory = (entityTable: string, entityId: string) => {
  const [history, setHistory] = useState<EntityHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); // ← Changed to true to prevent flash
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchHistory = useCallback(
    async (silent = false) => {
      if (!entityTable || !entityId) {
        // Skip logging for initial renders where entityId is not yet available
        return;
      }

      if (HISTORY_DEBUG)
        console.log('🔍 Fetching history for:', {
          entityTable,
          entityId,
          silent,
        });

      // Check auth status
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (HISTORY_DEBUG)
        console.log('🔑 Current user:', user?.id || 'Not authenticated');

      // Only show loading spinner for initial/manual fetch, not realtime updates
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);

      try {
        // Test basic connectivity first
        const { data: testData, error: testError } = await supabase
          .from('entity_history')
          .select('count')
          .limit(1);
        if (HISTORY_DEBUG)
          console.log('🔗 Connection test:', { testData, testError });

        // Now try the actual query
        const { data, error: fetchError } = await supabase
          .from('entity_history')
          .select('*')
          .eq('entity_table', entityTable)
          .eq('entity_id', entityId)
          .order('version_number', { ascending: false });

        if (HISTORY_DEBUG) {
          console.log('📊 History query result:', {
            data,
            error: fetchError,
            queryParams: { entityTable, entityId },
            resultCount: data?.length || 0,
          });
        }

        if (fetchError) {
          if (HISTORY_DEBUG) console.error('❌ Query error:', fetchError);
          throw new Error(fetchError.message);
        }

        setHistory(data || []);
        if (HISTORY_DEBUG) {
          console.log('✅ History set to:', data);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        if (HISTORY_DEBUG)
          console.error('💥 Error fetching entity history:', err);
      } finally {
        // Only update loading state if we set it to true (not silent mode)
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [entityTable, entityId]
  );

  const restoreVersion = async (versionNumber: number): Promise<void> => {
    const targetVersion = history.find(h => h.version_number === versionNumber);
    if (!targetVersion) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    try {
      // Get the entity data from the target version
      const restoreData = { ...targetVersion.entity_data };

      // Remove metadata fields that shouldn't be restored
      delete restoreData.id;
      delete restoreData.created_at;
      delete restoreData.updated_at;

      // Update the current entity with restored data
      const { error: updateError } = await supabase
        .from(entityTable)
        .update({
          ...restoreData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entityId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Refresh history after restore
      await fetchHistory();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to restore version';
      throw new Error(errorMessage);
    }
  };

  const getVersionDiff = (fromVersion: number, toVersion: number) => {
    const from = history.find(h => h.version_number === fromVersion);
    const to = history.find(h => h.version_number === toVersion);

    if (!from || !to) return null;

    const changes: Record<string, { from: unknown; to: unknown }> = {};

    // Compare all fields
    const allFields = new Set([
      ...Object.keys(from.entity_data),
      ...Object.keys(to.entity_data),
    ]);

    allFields.forEach(field => {
      const fromVal = from.entity_data[field];
      const toVal = to.entity_data[field];

      if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
        changes[field] = { from: fromVal, to: toVal };
      }
    });

    return {
      fromVersion: from,
      toVersion: to,
      changes,
    };
  };

  const addHistoryEntry = async (
    actionType: 'INSERT' | 'UPDATE' | 'DELETE',
    entityData: Record<string, unknown>,
    changedFields?: Record<string, { from: unknown; to: unknown }>,
    changeDescription?: string
  ) => {
    try {
      // Get next version number
      const { data: maxVersionData } = await supabase
        .from('entity_history')
        .select('version_number')
        .eq('entity_table', entityTable)
        .eq('entity_id', entityId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = (maxVersionData?.[0]?.version_number || 0) + 1;

      // Insert history entry
      const { error: insertError } = await supabase
        .from('entity_history')
        .insert({
          entity_table: entityTable,
          entity_id: entityId,
          version_number: nextVersion,
          action_type: actionType,
          entity_data: entityData,
          changed_fields: changedFields,
          change_description: changeDescription,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Refresh history
      await fetchHistory();
    } catch (err) {
      if (HISTORY_DEBUG) console.error('Error adding history entry:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 🔥 Realtime subscription for entity_history
  useEffect(() => {
    // Skip if no entity table/id provided
    if (!entityTable || !entityId) {
      return;
    }

    // Cleanup previous subscription if exists
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create unique channel name for this entity
    const channelName = `entity-history-${entityTable}-${entityId}`;

    if (HISTORY_DEBUG) {
      console.log('🔗 Setting up realtime subscription for entity history:', {
        entityTable,
        entityId,
        channelName,
      });
    }

    // Setup realtime subscription with postgres_changes
    // NOTE: Supabase doesn't support multi-column filters like "table=eq.X,id=eq.Y"
    // So we filter by entity_table only, then check entity_id in the callback
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'entity_history',
          event: '*',
          filter: `entity_table=eq.${entityTable}`, // Single column filter
        },
        payload => {
          // Client-side filtering by entity_id
          const newRecord = payload.new as EntityHistoryItem | null;
          const oldRecord = payload.old as EntityHistoryItem | null;
          const recordEntityId = newRecord?.entity_id || oldRecord?.entity_id;

          if (HISTORY_DEBUG) {
            console.log('🔄 Entity history event received:', {
              eventType: payload.eventType,
              recordEntityId,
              targetEntityId: entityId,
              match: recordEntityId === entityId,
            });
          }

          // Only process events for THIS specific entity
          if (recordEntityId === entityId) {
            if (HISTORY_DEBUG) {
              console.log('✅ Event matches, re-fetching history (silent)');
            }

            // Re-fetch history silently (no loading spinner for smooth UX)
            fetchHistory(true); // silent = true
          } else {
            if (HISTORY_DEBUG) {
              console.log('⏭️ Event skipped (different entity)');
            }
          }
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          if (HISTORY_DEBUG) {
            console.log('✅ Entity history realtime connected:', channelName);
          }
        } else if (status === 'CHANNEL_ERROR') {
          if (HISTORY_DEBUG) {
            console.log('❌ Entity history realtime error:', channelName);
          }
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount or when entityTable/entityId changes
    return () => {
      if (channelRef.current) {
        if (HISTORY_DEBUG) {
          console.log('🔌 Disconnecting entity history realtime:', channelName);
        }
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [entityTable, entityId, fetchHistory]);

  return {
    history,
    isLoading,
    error,
    fetchHistory,
    restoreVersion,
    getVersionDiff,
    addHistoryEntry,
  };
};
