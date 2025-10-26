import React, { RefObject, ReactNode } from 'react';
import type { DropdownOption } from '@/types';
import { useDropdownContext } from '../../hooks/useDropdownContext';

interface OptionContainerProps {
  optionId: string;
  index: number;
  isHighlighted: boolean;
  isSelected?: boolean;
  isExpanded: boolean;
  isKeyboardNavigation: boolean;
  onSelect: (optionId: string) => void;
  onHighlight: (index: number) => void;
  dropdownMenuRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  // Hover detail props
  option?: DropdownOption;
  onHoverDetailShow?: (
    optionId: string,
    element: HTMLElement,
    optionData?: Partial<DropdownOption>
  ) => Promise<void>;
  onHoverDetailHide?: () => void;
}

const OptionContainer: React.FC<OptionContainerProps> = ({
  optionId,
  index,
  isHighlighted,
  isSelected,
  isExpanded,
  isKeyboardNavigation,
  onSelect,
  onHighlight,
  dropdownMenuRef,
  children,
  option,
  onHoverDetailShow,
  onHoverDetailHide,
}) => {
  const handleMouseEnter = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Ignore mouse events during keyboard navigation
    if (isKeyboardNavigation) return;

    onHighlight(index);

    // Trigger hover detail if enabled
    if (onHoverDetailShow && option) {
      await onHoverDetailShow(optionId, e.currentTarget, {
        id: option.id,
        name: option.name,
        code: option.code,
        description: option.description,
        updated_at: option.updated_at,
      });
    }
  };

  const handleMouseLeave = () => {
    // Ignore mouse events during keyboard navigation
    if (isKeyboardNavigation) return;

    // Hide hover detail
    if (onHoverDetailHide) {
      onHoverDetailHide();
    }
  };

  const handleFocus = () => {
    onHighlight(index);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!dropdownMenuRef.current?.contains(document.activeElement)) {
        // onHighlight(-1); // This would be handled by the parent
      }
    }, 0);
  };

  // Compute selection for aria-selected: prefer prop isSelected, fallback to context value
  const { value, withCheckbox } = useDropdownContext();
  const isSelectedByContext =
    withCheckbox && Array.isArray(value)
      ? value.includes(optionId)
      : typeof value === 'string'
        ? value === optionId
        : false;
  const ariaSelected =
    isHighlighted ||
    (typeof isSelected === 'boolean' ? isSelected : isSelectedByContext);

  return (
    <button
      key={optionId}
      id={`dropdown-option-${optionId}`}
      role="option"
      aria-selected={ariaSelected}
      type="button"
      className={`flex ${isExpanded ? 'items-start' : 'items-center'} w-full py-2 px-3 rounded-lg text-sm text-gray-800 cursor-pointer focus:outline-hidden ${
        isHighlighted ? 'bg-slate-300/50' : 'hover:bg-slate-200/40'
      } transition-colors duration-150`}
      onClick={() => onSelect(optionId)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
    </button>
  );
};

export default OptionContainer;
