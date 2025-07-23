import React from 'react';

interface ButtonTextProps {
  displayText: string;
  titleText?: string;
  isExpanded: boolean;
}

const ButtonText: React.FC<ButtonTextProps> = ({
  displayText,
  titleText,
  isExpanded,
}) => {
  return (
    <span
      className={`${
        isExpanded
          ? 'whitespace-normal break-words leading-relaxed'
          : 'truncate'
      } transition-all duration-200 text-left flex-1 min-w-0`}
      title={titleText}
    >
      {displayText}
    </span>
  );
};

export default ButtonText;