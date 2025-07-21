import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Category, MedicineType, Unit } from "@/types";

export const useItemQueries = () => {
  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_categories")
        .select("id, name, description, updated_at")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: typesData } = useQuery<MedicineType[]>({
    queryKey: ["types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_types")
        .select("id, name, description, updated_at")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: unitsData } = useQuery<Unit[]>({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_units")
        .select("id, name, description, updated_at")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  return {
    categoriesData,
    typesData,
    unitsData,
  };
};