import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ItemCategory, ItemTypeEntity, ItemPackage, ItemDosageEntity, ItemManufacturerEntity } from '../../../domain/entities';

export const useItemQueries = () => {
  const { data: categoriesData } = useQuery<ItemCategory[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_categories')
        .select('id, kode, name, description, created_at, updated_at')
        .order('kode');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: typesData } = useQuery<ItemTypeEntity[]>({
    queryKey: ['types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_types')
        .select('id, kode, name, description, created_at, updated_at')
        .order('kode');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: unitsData } = useQuery<ItemPackage[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_packages')
        .select('id, kode, name, description, created_at, updated_at')
        .order('kode');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: dosagesData } = useQuery<ItemDosageEntity[]>({
    queryKey: ['dosages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_dosages')
        .select('id, kode, name, description, created_at, updated_at')
        .order('kode');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: manufacturersData } = useQuery<ItemManufacturerEntity[]>({
    queryKey: ['manufacturers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_manufacturers')
        .select('id, kode, name, address, created_at, updated_at')
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
