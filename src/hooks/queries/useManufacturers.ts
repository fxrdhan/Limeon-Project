import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QueryKeys, getInvalidationKeys } from "@/constants/queryKeys";
import type { ItemManufacturer } from "@/types/database";

// Query hook for manufacturers with realtime
export const useManufacturersRealtime = ({ enabled = true }: { enabled?: boolean } = {}) => {
  return useQuery<ItemManufacturer[]>({
    queryKey: QueryKeys.masterData.manufacturers?.list() || ['manufacturers', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_manufacturers")
        .select("id, kode, name, address, created_at, updated_at")
        .order("kode");
      
      if (error) throw error;
      return data || [];
    },
    enabled,
  });
};

// Base query hook for manufacturers
export const useManufacturers = ({ enabled = true }: { enabled?: boolean } = {}) => {
  return useQuery<ItemManufacturer[]>({
    queryKey: QueryKeys.masterData.manufacturers?.list() || ['manufacturers', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_manufacturers")
        .select("id, kode, name, address, created_at, updated_at")
        .order("kode");
      
      if (error) throw error;
      return data || [];
    },
    enabled,
  });
};

// Mutation hooks for CRUD operations
export const useManufacturerMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (manufacturerData: { kode?: string; name: string; address: string }) => {
      const { data, error } = await supabase
        .from("item_manufacturers")
        .insert([manufacturerData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      const keysToInvalidate = getInvalidationKeys.masterData.manufacturers?.() || [['manufacturers']];
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & Partial<ItemManufacturer>) => {
      const { data, error } = await supabase
        .from("item_manufacturers")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      const keysToInvalidate = getInvalidationKeys.masterData.manufacturers?.() || [['manufacturers']];
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("item_manufacturers")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      const keysToInvalidate = getInvalidationKeys.masterData.manufacturers?.() || [['manufacturers']];
      keysToInvalidate.forEach((keySet: readonly string[]) => {
        queryClient.invalidateQueries({ queryKey: keySet });
      });
    },
  });

  return {
    createMutation,
    updateMutation, 
    deleteMutation,
  };
};