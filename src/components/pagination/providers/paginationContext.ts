import { createContext } from 'react';
import type { PaginationContextValue } from '../types';

export const PaginationContext = createContext<PaginationContextValue | null>(
  null
);
