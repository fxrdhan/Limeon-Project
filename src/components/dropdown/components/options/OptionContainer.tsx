import React, { RefObject, ReactNode } from 'react';
import type { DropdownOption } from '@/types';

interface OptionContainerProps {
  optionId: string;
  index: number;
  isHighlighted: boolean;
  isExpanded: boolean;
  isKeyboardNavigation: boolean;
  onSelect: (optionId: string) => void;
  onHighlight: (index: number) => void;
  onExpansion: (
    optionId: string,
    optionName: string,
    shouldExpand: boolean
  ) => void;
  dropdownMenuRef: RefObject<HTMLDivElement | null>;
  optionName: string;
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
  isExpanded,
  isKeyboardNavigation,
  onSelect,
  onHighlight,
  onExpansion,
  dropdownMenuRef,
  optionName,
  children,
  option,
  onHoverDetailShow,
  onHoverDetailHide,
}) => {
  const handleMouseEnter = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Ignore mouse events during keyboard navigation
    if (isKeyboardNavigation) return;
    
    onHighlight(index);
    onExpansion(optionId, optionName, true);

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
    
    onExpansion(optionId, optionName, false);

    // Hide hover detail
    if (onHoverDetailHide) {
      onHoverDetailHide();
    }
  };

  const handleFocus = () => {
    onHighlight(index);
    onExpansion(optionId, optionName, true);
  };

  const handleBlur = () => {
    onExpansion(optionId, optionName, false);
    setTimeout(() => {
      if (!dropdownMenuRef.current?.contains(document.activeElement)) {
        // onHighlight(-1); // This would be handled by the parent
      }
    }, 0);
  };

  return (
    <button
      key={optionId}
      id={`dropdown-option-${optionId}`}
      role="option"
      aria-selected={isHighlighted}
      type="button"
      className={`flex ${isExpanded ? 'items-start' : 'items-center'} w-full py-2 px-3 rounded-lg text-sm text-gray-800 ${
        !isKeyboardNavigation ? 'hover:bg-slate-300/50' : ''
      } focus:outline-hidden focus:bg-gray-100 ${
        isHighlighted ? 'bg-slate-300/30' : ''
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
