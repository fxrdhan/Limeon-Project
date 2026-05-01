import React from 'react';
import { PAGINATION_CONSTANTS } from '../constants';
import { usePaginationContext } from '../hooks';
import { CurrentPageDisplay } from './CurrentPageDisplay';
import { PaginationButton } from './PaginationButton';

interface PageNavigationControlProps {
  isFloating?: boolean;
}

export const PageNavigationControl: React.FC<PageNavigationControlProps> = ({
  isFloating = false,
}) => {
  const { currentPage, totalPages, onPageChange, direction } =
    usePaginationContext();

  const handlePrevClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (currentPage < totalPages && totalPages !== 0) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center rounded-full bg-white p-1 text-slate-700 shadow-thin overflow-hidden select-none">
      <PaginationButton
        direction="prev"
        disabled={currentPage === 1}
        onClick={handlePrevClick}
        ariaLabel={PAGINATION_CONSTANTS.ARIA_LABELS.PREVIOUS_PAGE}
      />

      <CurrentPageDisplay
        currentPage={currentPage}
        direction={direction}
        isFloating={isFloating}
      />

      <PaginationButton
        direction="next"
        disabled={currentPage === totalPages || totalPages === 0}
        onClick={handleNextClick}
        ariaLabel={PAGINATION_CONSTANTS.ARIA_LABELS.NEXT_PAGE}
      />
    </div>
  );
};
