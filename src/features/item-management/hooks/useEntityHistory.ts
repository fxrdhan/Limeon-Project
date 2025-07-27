import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { HISTORY_DEBUG } from "../config/debug";
import type { EntityHistoryItem } from "../types";

export const useEntityHistory = (entityTable: string, entityId: string) => {
  const [history, setHistory] = useState<EntityHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!entityTable || !entityId) {
      if (HISTORY_DEBUG) console.log('Missing params:', { entityTable, entityId });
      return;
    }
    
    if (HISTORY_DEBUG) console.log('🔍 Fetching history for:', { entityTable, entityId });
    
    // Check auth status
    const { data: { user } } = await supabase.auth.getUser();
    if (HISTORY_DEBUG) console.log('🔑 Current user:', user?.id || 'Not authenticated');
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Test basic connectivity first
      const { data: testData, error: testError } = await supabase
        .from('entity_history')
        .select('count')
        .limit(1);
      if (HISTORY_DEBUG) console.log('🔗 Connection test:', { testData, testError });
      
      // Now try the actual query
      const { data, error: fetchError } = await supabase
        .from('entity_history')
        .select('*')
        .eq('entity_table', entityTable)
        .eq('entity_id', entityId)
        .order('version_number', { ascending: false });

      if (HISTORY_DEBUG) console.log('📊 History query result:', { 
        data, 
        error: fetchError,
        queryParams: { entityTable, entityId },
        resultCount: data?.length || 0
      });

      if (fetchError) {
        if (HISTORY_DEBUG) console.error('❌ Query error:', fetchError);
        throw new Error(fetchError.message);
      }

      setHistory(data || []);
      if (HISTORY_DEBUG) console.log('✅ History set to:', data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      if (HISTORY_DEBUG) console.error('💥 Error fetching entity history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [entityTable, entityId]);

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
          updated_at: new Date().toISOString()
        })
        .eq('id', entityId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Refresh history after restore
      await fetchHistory();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore version';
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
      ...Object.keys(to.entity_data)
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
      changes
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
          change_description: changeDescription
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

  return {
    history,
    isLoading,
    error,
    fetchHistory,
    restoreVersion,
    getVersionDiff,
    addHistoryEntry
  };
};