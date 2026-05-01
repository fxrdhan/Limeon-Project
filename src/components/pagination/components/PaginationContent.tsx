import React from 'react';
import classNames from 'classnames';
import { usePaginationContext } from '../hooks';
import { PageSizeSelector } from './PageSizeSelector';
import { PageNavigationControl } from './PageNavigationControl';
import { PAGINATION_CONSTANTS } from '../constants';
import type { PaginationContentProps } from '../types';

export const PaginationContent: React.FC<PaginationContentProps> = ({
  isFloating = false,
}) => {
  const { className } = usePaginationContext();

  return (
    <div
      className={classNames(
        'flex justify-between items-center gap-4 select-none',
        isFloating ? 'rounded-full shadow-surface-thin p-4 relative' : 'mt-4',
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
      <PageSizeSelector />
      <PageNavigationControl isFloating={isFloating} />
    </div>
  );
};
