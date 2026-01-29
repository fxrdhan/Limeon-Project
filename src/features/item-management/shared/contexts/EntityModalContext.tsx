import { createContext, useContext } from 'react';
import type { ModalMode, VersionData, EntityModalContextValue } from '../types';

export type { ModalMode, VersionData, EntityModalContextValue };

const EntityModalContext = createContext<EntityModalContextValue | null>(null);

export const EntityModalProvider = EntityModalContext.Provider;

// eslint-disable-next-line react-refresh/only-export-components
export const useEntityModal = () => {
  const context = useContext(EntityModalContext);
  if (!context) {
    throw new Error('useEntityModal must be used within EntityModalProvider');
  }
  return context;
};
