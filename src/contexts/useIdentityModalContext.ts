import { useContext } from 'react';
import { IdentityModalContext } from './IdentityModalContextState';

export const useIdentityModalContext = () => {
  const context = useContext(IdentityModalContext);
  if (context === undefined) {
    throw new Error(
      'useIdentityModalContext must be used within an IdentityModalProvider'
    );
  }
  return context;
};
