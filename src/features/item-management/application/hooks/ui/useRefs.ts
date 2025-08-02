import { useRef } from 'react';

export const useAddItemRefs = () => {
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const marginInputRef = useRef<HTMLInputElement | null>(null);
  const minStockInputRef = useRef<HTMLInputElement | null>(null);

  return {
    descriptionRef,
    marginInputRef,
    minStockInputRef,
  };
};
