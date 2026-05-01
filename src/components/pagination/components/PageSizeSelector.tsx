import classNames from 'classnames';
import { LayoutGroup, motion } from 'motion/react';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { TbChevronRight } from 'react-icons/tb';
import { usePaginationContext } from '../hooks';

interface PageSizeOption {
  value: number;
  defaultLabel: string;
  activeLabel: string;
}

const canUseHoverPointer = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const ARROW_SLOT_WIDTH_PX = 40;
const DEFAULT_OPTION_WIDTH_PX = 44;
const WIDE_OPTION_WIDTH_PX = 56;
const ACTIVE_OPTION_WIDTH_PX = 88;
const ACTIVE_UNLIMITED_WIDTH_PX = 104;

const getInactiveOptionWidth = (option: PageSizeOption) =>
  option.defaultLabel.length > 2
    ? WIDE_OPTION_WIDTH_PX
    : DEFAULT_OPTION_WIDTH_PX;

const getActiveOptionWidth = (option: PageSizeOption) =>
  option.value === -1 ? ACTIVE_UNLIMITED_WIDTH_PX : ACTIVE_OPTION_WIDTH_PX;

const PAGE_SIZE_LAYOUT_TRANSITION = {
  type: 'spring',
  stiffness: 320,
  damping: 34,
  duration: 0.5,
} as const;

const PAGE_SIZE_HOVER_TRANSITION = {
  duration: 0.18,
  ease: 'easeOut',
} as const;

export const PageSizeSelector: React.FC = () => {
  const {
    pageSizes,
    itemsPerPage: currentSize,
    handleItemsPerPageClick,
  } = usePaginationContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const layoutGroupId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const sizeOptions = useMemo<PageSizeOption[]>(
    () =>
      pageSizes.map(size =>
        size === -1
          ? {
              value: size,
              defaultLabel: 'U',
              activeLabel: 'Unlimited',
            }
          : {
              value: size,
              defaultLabel: size.toString(),
              activeLabel: `${size} items`,
            }
      ),
    [pageSizes]
  );

  const activeOption =
    sizeOptions.find(option => option.value === currentSize) ?? sizeOptions[0];
  const activeIndex = Math.max(
    sizeOptions.findIndex(option => option.value === currentSize),
    0
  );
  const activeOptionWidth = activeOption
    ? getActiveOptionWidth(activeOption)
    : 0;
  const expandedWidth = sizeOptions.reduce(
    (total, option) =>
      total +
      (option.value === currentSize
        ? activeOptionWidth
        : getInactiveOptionWidth(option)),
    0
  );
  const activeOffset = sizeOptions
    .slice(0, activeIndex)
    .reduce((total, option) => total + getInactiveOptionWidth(option), 0);

  useEffect(() => {
    if (!isExpanded) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setIsExpanded(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isExpanded]);

  const expandForHover = () => {
    if (canUseHoverPointer()) {
      setIsExpanded(true);
    }
  };

  const collapseForHover = () => {
    if (canUseHoverPointer()) {
      setIsExpanded(false);
      setHoveredValue(null);
    }
  };

  const toggleForClick = () => {
    if (!canUseHoverPointer()) {
      setIsExpanded(prev => !prev);
    }
  };

  const handleSizeClick = (
    option: PageSizeOption,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (option.value !== currentSize) {
      handleItemsPerPageClick(option.value, event);
    }

    if (!canUseHoverPointer()) {
      setIsExpanded(false);
    }
  };

  return (
    <LayoutGroup id={layoutGroupId}>
      <div
        ref={rootRef}
        className="inline-flex w-fit items-center overflow-hidden rounded-full bg-white p-1 text-slate-700 shadow-thin select-none"
        onMouseEnter={expandForHover}
        onMouseLeave={collapseForHover}
      >
        <motion.div
          className="relative h-9 overflow-hidden"
          animate={{
            width: isExpanded ? expandedWidth : activeOptionWidth,
          }}
          transition={PAGE_SIZE_LAYOUT_TRANSITION}
        >
          <motion.div
            className="relative flex h-9 items-center"
            animate={{
              x: isExpanded ? 0 : -activeOffset,
            }}
            style={{ width: `${expandedWidth}px` }}
            transition={PAGE_SIZE_LAYOUT_TRANSITION}
          >
            {sizeOptions.map(option => {
              const isActive = option.value === currentSize;
              const isHovered = hoveredValue === option.value && !isActive;
              const optionWidth = isActive
                ? activeOptionWidth
                : getInactiveOptionWidth(option);

              return (
                <motion.button
                  key={option.value}
                  layout
                  type="button"
                  className={classNames(
                    'relative h-9 shrink-0 cursor-pointer rounded-full px-3 text-base font-medium whitespace-nowrap focus:outline-hidden',
                    isActive
                      ? 'text-white'
                      : 'text-slate-700 hover:text-secondary'
                  )}
                  animate={{ width: optionWidth }}
                  transition={PAGE_SIZE_LAYOUT_TRANSITION}
                  onMouseEnter={() => {
                    if (!canUseHoverPointer()) return;
                    setHoveredValue(isActive ? null : option.value);
                  }}
                  onClick={event => {
                    if (!isExpanded && isActive) {
                      toggleForClick();
                      return;
                    }

                    handleSizeClick(option, event);
                  }}
                  aria-pressed={isActive}
                  aria-expanded={isActive ? isExpanded : undefined}
                >
                  {isHovered && (
                    <motion.div
                      layoutId="page-size-hover-bg"
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-primary/10"
                      transition={PAGE_SIZE_HOVER_TRANSITION}
                    />
                  )}

                  {isActive && (
                    <motion.div
                      layoutId="page-size-active-bg"
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-primary shadow-xs"
                      transition={PAGE_SIZE_LAYOUT_TRANSITION}
                    />
                  )}

                  <motion.span
                    layout
                    className="relative z-10 inline-block"
                    transition={PAGE_SIZE_LAYOUT_TRANSITION}
                  >
                    {isActive ? option.activeLabel : option.defaultLabel}
                  </motion.span>
                </motion.button>
              );
            })}
          </motion.div>
        </motion.div>

        <motion.div
          className={classNames(
            'overflow-hidden',
            isExpanded ? 'pointer-events-none' : undefined
          )}
          animate={{
            width: isExpanded ? 0 : ARROW_SLOT_WIDTH_PX - 4,
            opacity: isExpanded ? 0 : 1,
            marginLeft: isExpanded ? 0 : 4,
          }}
          transition={PAGE_SIZE_LAYOUT_TRANSITION}
        >
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 transition-colors duration-200 ease-out hover:bg-primary/10 hover:text-secondary focus:outline-hidden"
            onClick={toggleForClick}
            aria-label="Expand page size options"
            aria-expanded={isExpanded}
          >
            <TbChevronRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </LayoutGroup>
  );
};
