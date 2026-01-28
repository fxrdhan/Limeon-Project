import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '@/services/api/base.service';

export interface EntityHistoryItem {
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
  users?: {
    name: string;
    profilephoto: string | null;
  } | null;
  user_name?: string | null;
  user_photo?: string | null;
}

export const entityHistoryService = {
  async fetchHistory(
    entityTable: string,
    entityId: string
  ): Promise<ServiceResponse<EntityHistoryItem[]>> {
    try {
      const { data, error } = await supabase
        .from('entity_history')
        .select(
          `
            *,
            users:changed_by (
              name,
              profilephoto
            )
          `
        )
        .eq('entity_table', entityTable)
        .eq('entity_id', entityId)
        .order('version_number', { ascending: false });

      if (error) {
        return { data: null, error };
      }

      const transformedData = (data || []).map(item => ({
        ...item,
        user_name: item.users?.name || null,
        user_photo: item.users?.profilephoto || null,
      }));

      return { data: transformedData, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async getNextVersionNumber(
    entityTable: string,
    entityId: string
  ): Promise<ServiceResponse<number>> {
    try {
      const { data, error } = await supabase
        .from('entity_history')
        .select('version_number')
        .eq('entity_table', entityTable)
        .eq('entity_id', entityId)
        .order('version_number', { ascending: false })
        .limit(1);

      if (error) {
        return { data: null, error };
      }

      const nextVersion = (data?.[0]?.version_number || 0) + 1;
      return { data: nextVersion, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async insertHistoryEntry(params: {
    entityTable: string;
    entityId: string;
    versionNumber: number;
    actionType: 'INSERT' | 'UPDATE' | 'DELETE';
    entityData: Record<string, unknown>;
    changedFields?: Record<string, { from: unknown; to: unknown }>;
    changeDescription?: string;
  }): Promise<ServiceResponse<null>> {
    try {
      const {
        entityTable,
        entityId,
        versionNumber,
        actionType,
        entityData,
        changedFields,
        changeDescription,
      } = params;

      const { error } = await supabase.from('entity_history').insert({
        entity_table: entityTable,
        entity_id: entityId,
        version_number: versionNumber,
        action_type: actionType,
        entity_data: entityData,
        changed_fields: changedFields,
        change_description: changeDescription,
      });

      return { data: null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },
};
