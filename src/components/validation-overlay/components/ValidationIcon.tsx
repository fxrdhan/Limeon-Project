import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import { ValidationIconProps } from "../types";
import { ICON_SIZE, STYLES } from "../constants";

const ValidationIcon: React.FC<ValidationIconProps> = ({
  className = STYLES.icon,
  size = ICON_SIZE,
}) => {
  return (
    <FaExclamationTriangle
      className={className}
      size={size}
    />
  );
};

export default ValidationIcon;