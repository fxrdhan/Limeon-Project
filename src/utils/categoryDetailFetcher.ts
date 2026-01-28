import type { HoverDetailData } from '@/types';
import { categoryService } from '@/services/api/masterData.service';

export const fetchCategoryDetail = async (
  categoryId: string
): Promise<HoverDetailData | null> => {
  try {
    const { data, error } = await categoryService.getById(
      categoryId,
      'id, code, name, description, updated_at'
    );

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
      created_at: undefined,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error fetching category detail:', error);
    return null;
  }
};
