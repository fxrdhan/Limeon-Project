import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ItemDosage } from "@/features/item-management/domain/entities/Item";

// Query hook untuk dosages dengan realtime
export const useDosagesRealtime = ({ enabled = true }: { enabled?: boolean } = {}) => {
  return useQuery<ItemDosage[]>({
    queryKey: ["dosages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_dosages")
        .select("id, kode, name, description, created_at, updated_at")
        .order("kode");
      
      if (error) throw error;
      return data || [];
    },
    enabled,
  });
};

// Mutation hooks untuk CRUD operations
export const useDosageMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (dosageData: { kode?: string; name: string; description: string }) => {
      const { data, error } = await supabase
        .from("item_dosages")
        .insert([dosageData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dosages"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & Partial<ItemDosage>) => {
      const { data, error } = await supabase
        .from("item_dosages")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dosages"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("item_dosages")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dosages"] });
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
};