import React from 'react';
import type { PaginationProps } from '@/types';

export interface FloatingPaginationProps extends PaginationProps {
  enableFloating?: boolean;
  hideFloatingWhenModalOpen?: boolean;
}

export interface PaginationContentProps {
  isFloating?: boolean;
}

export interface PaginationButtonProps {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: (event: React.MouseEvent) => void;
  ariaLabel: string;
}

export interface PageSizeSelectorProps {
  pageSizes: number[];
  currentSize: number;
  onSizeChange: (size: number, event: React.MouseEvent) => void;
  isFloating?: boolean;
}

export interface CurrentPageDisplayProps {
  currentPage: number;
  direction: number;
  isFloating?: boolean;
}

export interface FloatingWrapperProps {
  children: React.ReactNode;
  show: boolean;
  hideWhenModalOpen: boolean;
}
