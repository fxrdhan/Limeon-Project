import React, { RefObject } from 'react';
import type { DropdownOption } from '@/types';
import { truncateText, shouldTruncateText } from '@/utils/text';
import { DROPDOWN_CONSTANTS } from '../../constants';
import RadioIndicator from './RadioIndicator';
import CheckboxIndicator from './CheckboxIndicator';

interface OptionRowProps {
  option: DropdownOption;
  index: number;

  // Visual states
  isSelected: boolean;
  isHighlighted: boolean;
  isKeyboardNavigation: boolean;
  isExpanded?: boolean;

  // Layout context
  portalWidth?: number | string;
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
    optionData?: Partial<DropdownOption>
  ) => Promise<void>;
  onHoverDetailHide?: () => void;
}

const OptionRow: React.FC<OptionRowProps> = ({
  option,
  index,
  isSelected,
  isHighlighted,
  isKeyboardNavigation,
  isExpanded = false,
  portalWidth,
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
    : isHighlighted
      ? 'text-slate-800 font-semibold'
      : 'text-slate-800';

  const backgroundClass = isHighlighted
    ? 'bg-slate-300/50'
    : isSelected
      ? 'bg-slate-100'
      : 'hover:bg-slate-200/40';

  return (
    <button
      id={`dropdown-option-${option.id}`}
      role="option"
      aria-selected={Boolean(isSelected)}
      type="button"
      className={`flex ${shouldExpand ? 'items-start' : 'items-center'} w-full py-2 px-3 rounded-lg text-sm text-slate-800 cursor-pointer focus:outline-hidden ${backgroundClass} transition-colors duration-150`}
      onClick={() => onSelect(option.id)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {withRadio && (
        <RadioIndicator isSelected={isSelected} isExpanded={shouldExpand} />
      )}
      {withCheckbox && (
        <CheckboxIndicator isSelected={isSelected} isExpanded={shouldExpand} />
      )}
      <span
        className={`${baseTextClass} transition-all duration-200 text-left ${textStateClass}`}
        title={willTruncate && !shouldExpand ? option.name : undefined}
      >
        {displayText}
      </span>
    </button>
  );
};

export default OptionRow;
