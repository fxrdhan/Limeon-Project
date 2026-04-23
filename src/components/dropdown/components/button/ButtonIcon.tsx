import React from "react";
import { TbChevronDown } from "react-icons/tb";

interface ButtonIconProps {
  isOpen: boolean;
  isClosing: boolean;
}

const ButtonIcon: React.FC<ButtonIconProps> = ({ isOpen, isClosing }) => {
  return (
    <TbChevronDown
      className={`transition-transform duration-200 ${
        isOpen || isClosing ? "rotate-180" : ""
      } w-4 h-4 ml-2 shrink-0 self-center`}
    />
  );
};

export default ButtonIcon;
