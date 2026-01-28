import React from 'react';
import classNames from 'classnames';
import { usePaginationContext } from '../hooks';
import { PageSizeSelector } from './PageSizeSelector';
import { PaginationButton } from './PaginationButton';
import { CurrentPageDisplay } from './CurrentPageDisplay';
import { PAGINATION_CONSTANTS } from '../constants';
import type { PaginationContentProps } from '../types';

export const PaginationContent: React.FC<PaginationContentProps> = ({
  isFloating = false,
}) => {
  const {
    currentPage,
    totalPages,
    itemsPerPage,
    onPageChange,
    handleItemsPerPageClick,
    direction,
    className,
    pageSizes,
  } = usePaginationContext();

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
    <div
      className={classNames(
        'flex justify-between items-center gap-4 select-none',
        isFloating ? 'rounded-full shadow-2xl p-4 relative' : 'mt-4',
        !isFloating && className
      )}
      style={
        isFloating
          ? {
              minWidth: PAGINATION_CONSTANTS.FLOATING.MIN_WIDTH,
              background: PAGINATION_CONSTANTS.STYLES.FLOATING_BACKGROUND,
              backdropFilter: PAGINATION_CONSTANTS.STYLES.BACKDROP_FILTER,
              WebkitBackdropFilter:
                PAGINATION_CONSTANTS.STYLES.WEBKIT_BACKDROP_FILTER,
              willChange: 'transform',
            }
          : undefined
      }
    >
      <PageSizeSelector
        pageSizes={pageSizes}
        currentSize={itemsPerPage}
        onSizeChange={handleItemsPerPageClick}
        isFloating={isFloating}
      />

      <div className="flex items-center rounded-full bg-zinc-100 p-1 shadow-md text-slate-700 overflow-hidden select-none">
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
    </div>
  );
};
