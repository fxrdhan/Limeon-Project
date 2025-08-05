import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ItemCategory, ItemTypeEntity, ItemPackage, ItemDosageEntity, ItemManufacturerEntity } from '../../../domain/entities';

export const useItemQueries = () => {
  const { data: categoriesData } = useQuery<ItemCategory[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_categories')
        .select('id, code, name, description, created_at, updated_at')
        .order('code');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: typesData } = useQuery<ItemTypeEntity[]>({
    queryKey: ['types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_types')
        .select('id, code, name, description, created_at, updated_at')
        .order('code');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: unitsData } = useQuery<ItemPackage[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_packages')
        .select('id, code, name, description, created_at, updated_at')
        .order('code');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: dosagesData } = useQuery<ItemDosageEntity[]>({
    queryKey: ['dosages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_dosages')
        .select('id, code, name, description, created_at, updated_at')
        .order('code');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: manufacturersData } = useQuery<ItemManufacturerEntity[]>({
    queryKey: ['manufacturers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_manufacturers')
        .select('id, code, name, address, created_at, updated_at')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  return {
    categoriesData,
    typesData,
    unitsData,
    dosagesData,
    manufacturersData,
  };
};
