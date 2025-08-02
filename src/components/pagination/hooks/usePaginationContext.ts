import { useContext } from 'react';
import { PaginationContext } from '../providers/paginationContext';
import type { PaginationContextValue } from '../types';

export const usePaginationContext = (): PaginationContextValue => {
  const context = useContext(PaginationContext);
  if (!context) {
    throw new Error(
      'usePaginationContext must be used within a PaginationProvider'
    );
  }
  return context;
};
