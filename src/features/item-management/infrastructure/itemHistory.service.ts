import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '@/services/api/base.service';

export const itemHistoryService = {
  async hardRollbackEntity(params: {
    entityTable: string;
    entityId: string;
    targetVersion: number;
  }): Promise<ServiceResponse<{ deleted_count: number }>> {
    try {
      const { entityTable, entityId, targetVersion } = params;
      const { data, error } = await supabase.rpc('hard_rollback_entity', {
        p_entity_table: entityTable,
        p_entity_id: entityId,
        p_target_version: targetVersion,
      });

      if (error) {
        return { data: null, error };
      }

      return { data: data as { deleted_count: number }, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async softRestoreEntity(params: {
    entityTable: string;
    entityId: string;
    restoreData: Record<string, unknown>;
  }): Promise<ServiceResponse<null>> {
    try {
      const { entityTable, entityId, restoreData } = params;
      const { error } = await supabase
        .from(entityTable)
        .update({
          ...restoreData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entityId);

      return { data: null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },
};
