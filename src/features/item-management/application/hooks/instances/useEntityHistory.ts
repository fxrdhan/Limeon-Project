import { useCallback, useEffect, useRef, useState } from 'react';
import {
  entityHistoryService,
  type EntityHistoryItem,
} from '../../../infrastructure/entityHistory.service';
import { itemHistoryService } from '../../../infrastructure/itemHistory.service';
import {
  itemRealtimeService,
  type RealtimeChannel,
} from '../../../infrastructure/itemRealtime.service';

interface EntityHistoryRealtimePayload {
  new?: unknown;
  old?: unknown;
}

const readEntityHistoryPayloadEntityId = (record: unknown) => {
  if (
    typeof record === 'object' &&
    record !== null &&
    'entity_id' in record &&
    typeof record.entity_id === 'string'
  ) {
    return record.entity_id;
  }

  return null;
};

export const getEntityHistoryRealtimeEntityId = (
  payload: EntityHistoryRealtimePayload
) =>
  readEntityHistoryPayloadEntityId(payload.new) ??
  readEntityHistoryPayloadEntityId(payload.old);

export const useEntityHistory = (entityTable: string, entityId: string) => {
  const [history, setHistory] = useState<EntityHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false); // ← Start with false for seamless pre-fetch UX
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const entityChannelRef = useRef<RealtimeChannel | null>(null);
  const currentScopeRef = useRef({ entityTable, entityId });
  const fetchGenerationRef = useRef(0);
  const loadingGenerationRef = useRef(0);
  const mountedRef = useRef(true);

  currentScopeRef.current = { entityTable, entityId };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      fetchGenerationRef.current += 1;
      loadingGenerationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (entityTable && entityId) return;

    fetchGenerationRef.current += 1;
    loadingGenerationRef.current += 1;
    setHistory([]);
    setError(null);
    setIsLoading(false);
  }, [entityTable, entityId]);

  const fetchHistory = useCallback(
    async (silent = false) => {
      if (!entityTable || !entityId) {
        // Skip logging for initial renders where entityId is not yet available
        return;
      }

      const requestScope = { entityTable, entityId };
      const isCurrentScope = () =>
        mountedRef.current &&
        currentScopeRef.current.entityTable === requestScope.entityTable &&
        currentScopeRef.current.entityId === requestScope.entityId;

      if (!isCurrentScope()) return;

      const fetchGeneration = fetchGenerationRef.current + 1;
      fetchGenerationRef.current = fetchGeneration;
      const isCurrentFetch = () =>
        isCurrentScope() && fetchGenerationRef.current === fetchGeneration;
      const isCurrentLoadingFetch = () =>
        isCurrentScope() && loadingGenerationRef.current === fetchGeneration;

      // Only show loading spinner for initial/manual fetch, not realtime updates
      if (!silent) {
        loadingGenerationRef.current = fetchGeneration;
        setIsLoading(true);
      }
      setError(null);

      try {
        // Fetch entity history with user info
        const { data, error: fetchError } =
          await entityHistoryService.fetchHistory(entityTable, entityId);

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        if (!isCurrentFetch()) return;
        setHistory(data || []);
      } catch (err) {
        if (!isCurrentFetch()) return;
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        // Only update loading state if we set it to true (not silent mode)
        if (!silent && isCurrentLoadingFetch()) {
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
      const { error: updateError } = await itemHistoryService.softRestoreEntity(
        {
          entityTable,
          entityId,
          restoreData,
        }
      );

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
      const { data: nextVersion, error: versionError } =
        await entityHistoryService.getNextVersionNumber(entityTable, entityId);

      if (versionError) {
        throw new Error(versionError.message);
      }

      const { error: insertError } =
        await entityHistoryService.insertHistoryEntry({
          entityTable,
          entityId,
          versionNumber: nextVersion || 1,
          actionType,
          entityData,
          changedFields,
          changeDescription,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Refresh history
      await fetchHistory();
    } catch {
      // Silent error
    }
  };

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  // 🔥 Realtime subscription for entity_history
  useEffect(() => {
    // Skip if no entity table/id provided
    if (!entityTable || !entityId) {
      return;
    }

    // Cleanup previous subscription if exists
    if (channelRef.current) {
      void channelRef.current.unsubscribe();
      void itemRealtimeService.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create unique channel name for this entity
    const channelName = `entity-history-${entityTable}-${entityId}`;

    // Setup realtime subscription with postgres_changes

    // Setup realtime subscription with postgres_changes
    // NOTE: Supabase doesn't support multi-column filters like "table=eq.X,id=eq.Y"
    // So we filter by entity_table only, then check entity_id in the callback
    const channel = itemRealtimeService
      .createChannel(channelName)
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
          const recordEntityId = getEntityHistoryRealtimeEntityId(payload);

          // Only process events for THIS specific entity
          if (recordEntityId === entityId) {
            // Re-fetch history silently (no loading spinner for smooth UX)
            void fetchHistory(true); // silent = true
          }
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          // Connected
        } else if (status === 'CHANNEL_ERROR') {
          // Error
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount or when entityTable/entityId changes
    return () => {
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        void itemRealtimeService.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [entityTable, entityId, fetchHistory]);

  // 🔥 Additional realtime subscription for entity table updates
  // This catches hard rollback updates that might not emit proper entity_history events
  useEffect(() => {
    // Skip if no entity table/id provided
    if (!entityTable || !entityId) {
      return;
    }

    // Cleanup previous subscription if exists
    if (entityChannelRef.current) {
      void entityChannelRef.current.unsubscribe();
      void itemRealtimeService.removeChannel(entityChannelRef.current);
      entityChannelRef.current = null;
    }

    // Create unique channel name for entity table subscription
    const entityChannelName = `entity-table-${entityTable}-${entityId}`;

    // Setup realtime subscription for entity table UPDATE events

    // Setup realtime subscription for entity table UPDATE events
    // This catches hard rollback which updates the entity directly via RPC
    const entityChannel = itemRealtimeService
      .createChannel(entityChannelName)
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: entityTable,
          event: 'UPDATE',
          filter: `id=eq.${entityId}`,
        },
        () => {
          // Re-fetch history silently when entity is updated
          // This handles hard rollback case where RPC updates entity directly
          void fetchHistory(true);
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          // Connected
        } else if (status === 'CHANNEL_ERROR') {
          // Error
        }
      });

    entityChannelRef.current = entityChannel;

    // Cleanup on unmount or when entityTable/entityId changes
    return () => {
      if (entityChannelRef.current) {
        void entityChannelRef.current.unsubscribe();
        void itemRealtimeService.removeChannel(entityChannelRef.current);
        entityChannelRef.current = null;
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
