import React from 'react';

export interface UsePaginationStateProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

export interface UsePaginationStateReturn {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  handleItemsPerPageClick: (value: number, event: React.MouseEvent) => void;
  selectedPageSizeIndex: number;
  pageSizes: number[];
}

export interface UseFloatingPaginationProps {
  enableFloating: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseFloatingPaginationReturn {
  showFloating: boolean;
  setShowFloating: (show: boolean) => void;
}

export interface UseKeyboardNavigationProps {
  showFloating: boolean;
  selectedPageSizeIndex: number;
  pageSizes: number[];
  currentPage: number;
  totalPages: number;
  onItemsPerPageChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onPageChange: (page: number) => void;
  setSelectedPageSizeIndex: (index: number) => void;
}

export interface UseAnimationDirectionProps {
  currentPage: number;
}

export interface UseAnimationDirectionReturn {
  direction: number;
  variants: {
    enter: (direction: number) => { x: number; opacity: number };
    center: { zIndex: number; x: number; opacity: number };
    exit: (direction: number) => { zIndex: number; x: number; opacity: number };
  };
  floatingVariants: {
    initial: { scale: number; y: number };
    animate: { scale: number; y: number };
    exit: { scale: number; y: number };
  };
}