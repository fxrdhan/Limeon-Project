import { useContext } from 'react';
import { ComboboxContext } from '../providers/comboboxContext';
import type { ComboboxContextType } from '../types';

export const useComboboxContext = (): ComboboxContextType => {
  const context = useContext(ComboboxContext);
  if (!context) {
    throw new Error(
      'useComboboxContext must be used within a ComboboxProvider'
    );
  }
  return context;
};
