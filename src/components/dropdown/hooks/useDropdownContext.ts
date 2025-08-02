import { useContext } from 'react';
import { DropdownContext } from '../providers/dropdownContext';
import type { DropdownContextType } from '../types';

export const useDropdownContext = (): DropdownContextType => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error(
      'useDropdownContext must be used within a DropdownProvider'
    );
  }
  return context;
};
