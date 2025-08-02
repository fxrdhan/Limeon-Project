import React from 'react';

interface ButtonIconProps {
  isOpen: boolean;
  isClosing: boolean;
  isExpanded: boolean;
}

const ButtonIcon: React.FC<ButtonIconProps> = ({
  isOpen,
  isClosing,
  isExpanded,
}) => {
  return (
    <svg
      className={`transition-transform duration-200 ${
        isOpen || isClosing ? 'rotate-180' : ''
      } w-4 h-4 ml-2 flex-shrink-0 ${isExpanded ? 'mt-0.5' : ''}`}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
};

export default ButtonIcon;
