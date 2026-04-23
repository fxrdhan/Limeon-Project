import React from "react";
import classNames from "classnames";
import { TbChevronLeft, TbChevronRight } from "react-icons/tb";
import type { PaginationButtonProps } from "../types";

export const PaginationButton: React.FC<PaginationButtonProps> = ({
  direction,
  disabled,
  onClick,
  ariaLabel,
}) => {
  const isNext = direction === "next";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        "p-2 rounded-full focus:outline-hidden transition-colors duration-150 cursor-pointer select-none border-0 bg-transparent",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-emerald-100 hover:text-secondary transition-all duration-300 ease-in-out",
      )}
      aria-label={ariaLabel}
    >
      {isNext ? <TbChevronRight className="h-5 w-5" /> : <TbChevronLeft className="h-5 w-5" />}
    </button>
  );
};
