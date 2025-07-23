import React from 'react';

interface OptionTextProps {
  text: string;
  isSelected: boolean;
  isHighlighted: boolean;
  isExpanded: boolean;
  shouldTruncate: boolean;
  title?: string;
}

const OptionText: React.FC<OptionTextProps> = ({
  text,
  isSelected,
  isHighlighted,
  isExpanded,
  shouldTruncate,
  title,
}) => {
  return (
    <span
      className={`${
        isExpanded ? 'whitespace-normal break-words leading-relaxed' : 'truncate'
      } transition-all duration-200 text-left ${
        isSelected
          ? 'text-primary font-semibold'
          : isHighlighted
            ? 'text-gray-800 font-semibold'
            : ''
      }`}
      title={shouldTruncate && !isExpanded ? title : undefined}
    >
      {text}
    </span>
  );
};

export default OptionText;