import type { HoverDetailData } from '@/types';
import { supabase } from '@/lib/supabase';

export const fetchCategoryDetail = async (
  categoryId: string
): Promise<HoverDetailData | null> => {
  try {
    const { data, error } = await supabase
      .from('item_categories')
      .select('id, code, name, description, created_at, updated_at')
      .eq('id', categoryId)
      .single();

    if (error) {
      console.error('Error fetching category detail:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error fetching category detail:', error);
    return null;
  }
};
