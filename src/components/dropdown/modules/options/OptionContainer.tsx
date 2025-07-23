import React, { RefObject, ReactNode } from 'react';

interface OptionContainerProps {
  optionId: string;
  index: number;
  isHighlighted: boolean;
  isExpanded: boolean;
  isKeyboardNavigation: boolean;
  onSelect: (optionId: string) => void;
  onHighlight: (index: number) => void;
  onExpansion: (optionId: string, optionName: string, shouldExpand: boolean) => void;
  dropdownMenuRef: RefObject<HTMLDivElement | null>;
  optionName: string;
  children: ReactNode;
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
}) => {
  const handleMouseEnter = () => {
    onHighlight(index);
    onExpansion(optionId, optionName, true);
  };

  const handleMouseLeave = () => {
    onExpansion(optionId, optionName, false);
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