import React, { RefObject } from 'react';
import { motion } from 'motion/react';
import type { ComboboxOption } from '@/types';
import { truncateText, shouldTruncateText } from '@/utils/text';
import { COMBOBOX_CONSTANTS } from '../../constants';
import { getComboboxOptionMatchRanges } from '../../utils/comboboxUtils';
import RadioIndicator from './RadioIndicator';
import CheckboxIndicator from './CheckboxIndicator';

interface OptionRowProps {
  option: ComboboxOption;
  index: number;
  optionId: string;
  optionCount: number;

  // Visual states
  isSelected: boolean;
  isHighlighted: boolean;
  suppressHighlightBackground: boolean;
  activeBackgroundLayoutId?: string;
  isKeyboardNavigation: boolean;
  isExpanded?: boolean;

  // Layout context
  portalWidth?: number | string;
  searchTerm?: string;
  withRadio?: boolean;
  withCheckbox?: boolean;

  // Event/ARIA handlers
  onSelect: (
    optionId: string,
    event?: Event | React.SyntheticEvent<HTMLElement>
  ) => void;
  onHighlight: (
    index: number,
    event?: Event | React.SyntheticEvent<HTMLElement>
  ) => void;

  // Refs
  dropdownMenuRef: RefObject<HTMLDivElement | null>;
  className?: string;
  style?: React.CSSProperties;
  render?: (
    props: React.HTMLAttributes<HTMLDivElement>,
    state: {
      selected: boolean;
      highlighted: boolean;
      disabled: boolean;
    }
  ) => React.ReactElement;

  // Hover detail (opsional)
  onHoverDetailShow?: (
    optionId: string,
    element: HTMLElement,
    optionData?: Partial<ComboboxOption>,
    options?: { immediate?: boolean }
  ) => Promise<void>;
  onHoverDetailHide?: () => void;
}

const OptionRow: React.FC<OptionRowProps> = ({
  option,
  index,
  optionId,
  optionCount,
  isSelected,
  isHighlighted,
  suppressHighlightBackground,
  activeBackgroundLayoutId,
  isKeyboardNavigation,
  isExpanded = false,
  portalWidth,
  searchTerm = '',
  withRadio = false,
  withCheckbox = false,
  onSelect,
  onHighlight,
  dropdownMenuRef,
  className,
  style,
  render,
  onHoverDetailShow,
  onHoverDetailHide,
}) => {
  const DEFAULT_WIDTH = 200;
  const numericPortalWidth = (() => {
    if (portalWidth == null) return DEFAULT_WIDTH;
    if (typeof portalWidth === 'number') return portalWidth;
    const parsed = parseInt(String(portalWidth).replace('px', ''), 10);
    return Number.isFinite(parsed) ? parsed : DEFAULT_WIDTH;
  })();

  const maxTextWidth =
    numericPortalWidth -
    (withRadio || withCheckbox
      ? COMBOBOX_CONSTANTS.BUTTON_PADDING +
        COMBOBOX_CONSTANTS.RADIO_EXTRA_PADDING
      : COMBOBOX_CONSTANTS.BUTTON_PADDING);

  const willTruncate = shouldTruncateText(option.name, maxTextWidth);
  const shouldExpand = isExpanded && willTruncate;
  const displayText =
    willTruncate && !shouldExpand
      ? truncateText(option.name, maxTextWidth)
      : option.name;

  const handleMouseEnter = async (e: React.MouseEvent<HTMLElement>) => {
    if (isKeyboardNavigation) return;
    onHighlight(index, e);

    if (onHoverDetailShow) {
      await onHoverDetailShow(option.id, e.currentTarget, {
        id: option.id,
        name: option.name,
        code: option.code,
        description: option.description,
        metaLabel: option.metaLabel,
        metaTone: option.metaTone,
        updated_at: option.updated_at,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!isKeyboardNavigation) return;
    onHighlight(index, e);

    if (onHoverDetailShow) {
      void onHoverDetailShow(option.id, e.currentTarget, {
        id: option.id,
        name: option.name,
        code: option.code,
        description: option.description,
        metaLabel: option.metaLabel,
        metaTone: option.metaTone,
        updated_at: option.updated_at,
      });
    }
  };

  const handleMouseLeave = () => {
    if (isKeyboardNavigation) return;
    if (onHoverDetailHide) onHoverDetailHide();
  };

  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    onHighlight(index, e);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!dropdownMenuRef.current?.contains(document.activeElement)) {
        // Parent handles global highlight management
      }
    }, 0);
  };

  const baseTextClass = shouldExpand
    ? 'whitespace-normal break-words leading-relaxed'
    : 'truncate';

  const textStateClass = isSelected
    ? 'text-primary font-semibold'
    : 'text-slate-800';
  const matchRanges = getComboboxOptionMatchRanges(displayText, searchTerm);
  const shouldHighlightMatches = matchRanges.length > 0;
  const renderDisplayText = () => {
    if (!shouldHighlightMatches) return displayText;

    const parts: React.ReactNode[] = [];
    let currentIndex = 0;

    matchRanges.forEach((range, rangeIndex) => {
      if (range.start > currentIndex) {
        parts.push(displayText.slice(currentIndex, range.start));
      }

      parts.push(
        <span
          key={`${range.start}-${range.end}-${rangeIndex}`}
          className="font-bold"
        >
          {displayText.slice(range.start, range.end)}
        </span>
      );
      currentIndex = range.end;
    });

    if (currentIndex < displayText.length) {
      parts.push(displayText.slice(currentIndex));
    }

    return parts;
  };

  const optionProps = {
    id: optionId,
    role: 'option',
    'aria-selected': Boolean(isSelected),
    'aria-posinset': index + 1,
    'aria-setsize': optionCount,
    'data-dropdown-option-index': index,
    'data-combobox-item': '',
    'data-selected': isSelected ? '' : undefined,
    'data-highlighted': isHighlighted ? '' : undefined,
    'data-value': option.id,
    tabIndex: -1,
    className: `relative z-10 flex ${shouldExpand ? 'items-start' : 'items-center'} w-full py-2 px-3 rounded-lg text-sm text-slate-800 cursor-pointer focus:outline-hidden transition-colors duration-150 ${className ?? ''}`,
    style,
    onClick: (e: React.MouseEvent<HTMLDivElement>) => onSelect(option.id, e),
    onMouseEnter: handleMouseEnter,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    children: (
      <>
        {isHighlighted && !suppressHighlightBackground && (
          <motion.div
            key={activeBackgroundLayoutId ?? 'static-highlight-background'}
            layoutId={activeBackgroundLayoutId}
            initial={false}
            className="pointer-events-none absolute inset-0 z-0 rounded-lg bg-primary/10"
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
              mass: 0.8,
            }}
          />
        )}
        {withRadio && (
          <RadioIndicator isSelected={isSelected} isExpanded={shouldExpand} />
        )}
        {withCheckbox && (
          <CheckboxIndicator
            isSelected={isSelected}
            isExpanded={shouldExpand}
          />
        )}
        <span className="relative z-10 flex min-w-0 flex-1 items-center gap-2">
          <span
            className={`${baseTextClass} transition-all duration-200 text-left ${textStateClass} min-w-0 flex-1`}
            title={willTruncate && !shouldExpand ? option.name : undefined}
          >
            {renderDisplayText()}
          </span>
        </span>
      </>
    ),
  };

  const state = {
    selected: isSelected,
    highlighted: isHighlighted,
    disabled: false,
  };

  if (render) {
    return render(optionProps, state);
  }

  return <div {...optionProps} />;
};

export default OptionRow;
