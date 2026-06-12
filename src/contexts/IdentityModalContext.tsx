import React from 'react';
import {
  IdentityModalContext,
  type IdentityModalContextValue,
} from './IdentityModalContextState';

interface IdentityModalProviderProps {
  children: React.ReactNode;
  value: IdentityModalContextValue;
}

export const IdentityModalProvider: React.FC<IdentityModalProviderProps> = ({
  children,
  value,
}) => {
  return (
    <IdentityModalContext.Provider value={value}>
      {children}
    </IdentityModalContext.Provider>
  );
};
