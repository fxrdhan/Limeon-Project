import React from 'react';
import { DropdownContext } from './dropdownContext';
import type { DropdownContextType } from '../types';

export const DropdownProvider: React.FC<{
  children: React.ReactNode;
  value: DropdownContextType;
}> = ({ children, value }) => {
  return (
    <DropdownContext.Provider value={value}>
      {children}
    </DropdownContext.Provider>
  );
};
