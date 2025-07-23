import React from "react";
import { ValidationArrowProps } from "../types";
import { STYLES, ARROW_LEFT_OFFSET } from "../constants";

const ValidationArrow: React.FC<ValidationArrowProps> = ({
  className = STYLES.arrow,
}) => {
  return (
    <div 
      className={className}
      style={{ left: ARROW_LEFT_OFFSET }}
    />
  );
};

export default ValidationArrow;