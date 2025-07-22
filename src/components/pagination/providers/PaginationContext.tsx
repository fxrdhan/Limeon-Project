import React from 'react';
import { PaginationContext } from './paginationContext';
import type { PaginationContextProviderProps } from '../types';

export const PaginationProvider: React.FC<PaginationContextProviderProps> = ({
  children,
  value,
}) => {
  return (
    <PaginationContext.Provider value={value}>
      {children}
    </PaginationContext.Provider>
  );
};