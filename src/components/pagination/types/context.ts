import React from 'react';

export interface PaginationContextValue {
  // State
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  showFloating: boolean;
  selectedPageSizeIndex: number;
  direction: number;
  
  // Actions
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  handleItemsPerPageClick: (value: number, event: React.MouseEvent) => void;
  
  // Configuration
  enableFloating: boolean;
  hideFloatingWhenModalOpen: boolean;
  className?: string;
  pageSizes: number[];
}

export interface PaginationContextProviderProps {
  children: React.ReactNode;
  value: PaginationContextValue;
}