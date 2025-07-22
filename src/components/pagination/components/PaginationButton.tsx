import React from 'react';
import classNames from 'classnames';
import type { PaginationButtonProps } from '../types';

export const PaginationButton: React.FC<PaginationButtonProps> = ({
  direction,
  disabled,
  onClick,
  ariaLabel,
}) => {
  const isNext = direction === 'next';
  
  return (
    <div
      onClick={onClick}
      className={classNames(
        "p-2 rounded-full focus:outline-hidden transition-colors duration-150 cursor-pointer select-none",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-emerald-100 hover:text-secondary transition-all duration-300 ease-in-out",
      )}
      aria-label={ariaLabel}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d={
            isNext
              ? "M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              : "M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
          }
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
};