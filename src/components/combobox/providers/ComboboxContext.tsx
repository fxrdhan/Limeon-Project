import React from 'react';
import { ComboboxContext } from './comboboxContext';
import type { ComboboxContextType } from '../types';

export const ComboboxProvider: React.FC<{
  children: React.ReactNode;
  value: ComboboxContextType;
}> = ({ children, value }) => {
  return (
    <ComboboxContext.Provider value={value}>
      {children}
    </ComboboxContext.Provider>
  );
};
