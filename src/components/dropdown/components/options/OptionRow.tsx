import React, { RefObject } from 'react';
import { motion } from 'motion/react';
import type { DropdownOption } from '@/types';
import { truncateText, shouldTruncateText } from '@/utils/text';
import { DROPDOWN_CONSTANTS } from '../../constants';
import { getDropdownOptionMatchRanges } from '../../utils/dropdownUtils';
import RadioIndicator from './RadioIndicator';
import CheckboxIndicator from './CheckboxIndicator';

interface OptionRowProps {
  option: DropdownOption;
  index: number;

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
  onSelect: (optionId: string) => void;
  onHighlight: (index: number) => void;

  // Refs
  dropdownMenuRef: RefObject<HTMLDivElement | null>;

  // Hover detail (opsional)
  onHoverDetailShow?: (
    optionId: string,
    element: HTMLElement,
    optionData?: Partial<DropdownOption>,
    options?: { immediate?: boolean }
  ) => Promise<void>;
  onHoverDetailHide?: () => void;
}

const OptionRow: React.FC<OptionRowProps> = ({
  option,
  index,
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
      ? DROPDOWN_CONSTANTS.BUTTON_PADDING +
        DROPDOWN_CONSTANTS.RADIO_EXTRA_PADDING
      : DROPDOWN_CONSTANTS.BUTTON_PADDING);

  const willTruncate = shouldTruncateText(option.name, maxTextWidth);
  const shouldExpand = isExpanded && willTruncate;
  const displayText =
    willTruncate && !shouldExpand
      ? truncateText(option.name, maxTextWidth)
      : option.name;

  const handleMouseEnter = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    if (isKeyboardNavigation) return;
    onHighlight(index);

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

  const handleMouseMove = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    if (!isKeyboardNavigation) return;
    onHighlight(index);

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

  const handleFocus = () => {
    onHighlight(index);
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
  const matchRanges = getDropdownOptionMatchRanges(displayText, searchTerm);
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

  return (
    <button
      id={`dropdown-option-${option.id}`}
      role="option"
      aria-selected={Boolean(isSelected)}
      data-dropdown-option-index={index}
      type="button"
      className={`relative z-10 flex ${shouldExpand ? 'items-start' : 'items-center'} w-full py-2 px-3 rounded-lg text-sm text-slate-800 cursor-pointer focus:outline-hidden transition-colors duration-150`}
      onClick={() => onSelect(option.id)}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {isHighlighted && !suppressHighlightBackground && (
        <motion.div
          layoutId={activeBackgroundLayoutId}
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
        <CheckboxIndicator isSelected={isSelected} isExpanded={shouldExpand} />
      )}
      <span className="relative z-10 flex min-w-0 flex-1 items-center gap-2">
        <span
          className={`${baseTextClass} transition-all duration-200 text-left ${textStateClass} min-w-0 flex-1`}
          title={willTruncate && !shouldExpand ? option.name : undefined}
        >
          {renderDisplayText()}
        </span>
      </span>
    </button>
  );
};

export default OptionRow;
