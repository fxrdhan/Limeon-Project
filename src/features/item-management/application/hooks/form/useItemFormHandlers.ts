import { useCallback } from 'react';
import { extractNumericValue } from '@/lib/formatters';

import type { ItemFormData } from '../../../shared/types';

interface UseItemFormHandlersProps {
  formState: {
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    handleSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    formData: ItemFormData;
  };
  packageConversionHook: {
    setBasePrice: (price: number) => void;
    setSellPrice: (price: number) => void;
  };
}

/**
 * Hook for managing form event handlers and interactions
 * 
 * Handles:
 * - Form input changes with price synchronization
 * - Select field changes
 * - Package conversion price updates
 */
export const useItemFormHandlers = ({
  formState,
  packageConversionHook,
}: UseItemFormHandlersProps) => {

  // Enhanced form change handler with package conversion sync
  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      formState.handleChange(e);

      // Handle unit conversion sync for price changes
      const { name, value } = e.target as HTMLInputElement;
      if (name === 'base_price') {
        const numericInt = extractNumericValue(value);
        packageConversionHook.setBasePrice(numericInt);
      } else if (name === 'sell_price') {
        const numericInt = extractNumericValue(value);
        packageConversionHook.setSellPrice(numericInt);
      }
    },
    [formState, packageConversionHook]
  );

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      formState.handleSelectChange(e);
    },
    [formState]
  );

  return {
    handleChange,
    handleSelectChange,
  };
};