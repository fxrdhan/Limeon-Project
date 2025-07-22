import { createContext } from 'react';
import type { DropdownContextType } from '../types';

export const DropdownContext = createContext<DropdownContextType | undefined>(undefined);