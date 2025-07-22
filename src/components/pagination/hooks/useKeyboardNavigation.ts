import { useEffect, useCallback } from 'react';
import type { UseKeyboardNavigationProps } from '../types';

export const useKeyboardNavigation = ({
  showFloating,
  selectedPageSizeIndex,
  pageSizes,
  currentPage,
  totalPages,
  onItemsPerPageChange,
  onPageChange,
  setSelectedPageSizeIndex,
}: UseKeyboardNavigationProps) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!showFloating) return;

      switch (event.key) {
        case "ArrowUp": {
          event.preventDefault();
          const nextIndex =
            selectedPageSizeIndex < pageSizes.length - 1
              ? selectedPageSizeIndex + 1
              : 0;
          setSelectedPageSizeIndex(nextIndex);
          onItemsPerPageChange({
            target: { value: pageSizes[nextIndex].toString() },
          } as React.ChangeEvent<HTMLSelectElement>);
          break;
        }
        case "ArrowDown": {
          event.preventDefault();
          const prevIndex =
            selectedPageSizeIndex > 0
              ? selectedPageSizeIndex - 1
              : pageSizes.length - 1;
          setSelectedPageSizeIndex(prevIndex);
          onItemsPerPageChange({
            target: { value: pageSizes[prevIndex].toString() },
          } as React.ChangeEvent<HTMLSelectElement>);
          break;
        }
        case "ArrowLeft":
          event.preventDefault();
          if (currentPage > 1) {
            onPageChange(currentPage - 1);
          }
          break;
        case "ArrowRight":
          event.preventDefault();
          if (currentPage < totalPages && totalPages !== 0) {
            onPageChange(currentPage + 1);
          }
          break;
      }
    },
    [
      showFloating,
      selectedPageSizeIndex,
      pageSizes,
      currentPage,
      totalPages,
      onItemsPerPageChange,
      onPageChange,
      setSelectedPageSizeIndex,
    ],
  );

  useEffect(() => {
    if (showFloating) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showFloating, handleKeyDown]);
};