// Business rules for updating items
import type { Item } from '@/types/database';
import { validateCreateItemInput, type CreateItemInput } from './CreateItem';

export interface UpdateItemInput extends CreateItemInput {
  id: string;
}

export interface UpdateItemOutput {
  success: boolean;
  updated_item?: Item;
  error?: string;
}

// Business validation for updates (reuses create validation)
export const validateUpdateItemInput = (
  input: UpdateItemInput
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!input.id?.trim()) {
    errors.push('ID item harus ada untuk update');
  }

  const createValidation = validateCreateItemInput(input);
  errors.push(...createValidation.errors);

  return {
    isValid: errors.length === 0,
    errors,
  };
};
