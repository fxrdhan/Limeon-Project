import React from 'react';
import classNames from 'classnames';
import { motion, LayoutGroup } from 'framer-motion';
import { PAGINATION_CONSTANTS } from '../constants';
import type { PageSizeSelectorProps } from '../types';

export const PageSizeSelector: React.FC<PageSizeSelectorProps> = ({
  pageSizes,
  currentSize,
  onSizeChange,
  isFloating = false,
}) => {
  return (
    <LayoutGroup id={isFloating ? "floating-selector" : "main-selector"}>
      <div className="flex items-center rounded-full bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden select-none relative">
        {pageSizes.map((size) => (
          <button
            key={`page-size-${size}-${isFloating ? "floating" : "main"}`}
            className={classNames(
              "group px-3 py-1.5 rounded-full focus:outline-hidden select-none relative cursor-pointer z-10",
              currentSize !== size ? "hover:bg-emerald-100" : "",
            )}
            onClick={(event) => onSizeChange(size, event)}
          >
            {currentSize === size && (
              <motion.div
                layoutId={`selector-bg-${isFloating ? "floating" : "main"}`}
                className="absolute inset-0 bg-primary rounded-full shadow-xs"
                style={{ borderRadius: PAGINATION_CONSTANTS.STYLES.BORDER_RADIUS }}
                transition={{
                  type: "spring",
                  stiffness: PAGINATION_CONSTANTS.ANIMATION.SPRING_STIFFNESS,
                  damping: PAGINATION_CONSTANTS.ANIMATION.SPRING_DAMPING,
                  duration: PAGINATION_CONSTANTS.ANIMATION.SPRING_DURATION,
                }}
              />
            )}
            <span
              className={classNames(
                "relative z-10 select-none",
                currentSize === size
                  ? "text-white font-medium"
                  : "text-gray-700 group-hover:text-emerald-700",
              )}
            >
              {currentSize === size ? `${size} items` : size.toString()}
            </span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
};