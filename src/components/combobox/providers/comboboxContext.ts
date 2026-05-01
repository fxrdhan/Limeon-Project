import { createContext } from 'react';
import type { ComboboxContextType } from '../types';

export const ComboboxContext = createContext<ComboboxContextType | undefined>(
  undefined
);
