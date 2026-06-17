import { supabase } from '@/lib/supabase';
import {
  toServiceError,
  type ServiceResponse,
} from '@/services/api/base.service';

export interface ItemHistoryRollbackResult {
  deleted_count: number;
}

const hasDeletedCount = (value: unknown): value is { deleted_count: unknown } =>
  typeof value === 'object' && value !== null && 'deleted_count' in value;

const normalizeRollbackResult = (value: unknown): ItemHistoryRollbackResult => {
  if (!hasDeletedCount(value) || typeof value.deleted_count !== 'number') {
    return { deleted_count: 0 };
  }

  return { deleted_count: value.deleted_count };
};

export const itemHistoryService = {
  async hardRollbackEntity(params: {
    entityTable: string;
    entityId: string;
    targetVersion: number;
  }): Promise<ServiceResponse<ItemHistoryRollbackResult>> {
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

      return { data: normalizeRollbackResult(data), error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
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
      return { data: null, error: toServiceError(error) };
    }
  },
};
