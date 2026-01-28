import React from 'react';

interface ButtonTextProps {
  displayText: string;
  titleText?: string;
  isPlaceholder: boolean;
  isExpanded: boolean;
}

const ButtonText: React.FC<ButtonTextProps> = ({
  displayText,
  titleText,
  isPlaceholder,
  isExpanded,
}) => {
  return (
    <span
      className={`${
        isExpanded
          ? 'whitespace-normal break-words leading-relaxed'
          : 'truncate'
      } ${
        isPlaceholder ? 'text-slate-400' : 'text-slate-800'
      } transition-all duration-200 text-left flex-1 min-w-0`}
      title={titleText}
    >
      {displayText}
    </span>
  );
};

export default ButtonText;
