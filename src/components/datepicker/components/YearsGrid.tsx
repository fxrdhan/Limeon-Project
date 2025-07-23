import React from "react";
import classNames from "classnames";
import { getYearsToDisplay } from "../constants";
import type { YearsGridProps } from "../types";

const YearsGrid: React.FC<YearsGridProps> = ({
  displayDate,
  value,
  highlightedYear,
  minDate,
  maxDate,
  onYearSelect,
  onYearHighlight,
}) => {
  const yearsToDisplay = getYearsToDisplay(displayDate.getFullYear());

  return (
    <div className="grid grid-cols-3 gap-2 py-1">
      {yearsToDisplay.map((yearVal) => {
        let isDisabled = false;
        if (minDate) {
          const minD = new Date(minDate);
          if (yearVal < minD.getFullYear()) isDisabled = true;
        }
        if (maxDate) {
          const maxD = new Date(maxDate);
          if (yearVal > maxD.getFullYear()) isDisabled = true;
        }

        const isSelected = value && value.getFullYear() === yearVal;
        const isHighlighted = highlightedYear === yearVal;

        return (
          <button
            key={yearVal}
            onClick={() => !isDisabled && onYearSelect(yearVal)}
            onMouseEnter={() => !isDisabled && onYearHighlight(yearVal)}
            onMouseLeave={() => onYearHighlight(null)}
            disabled={isDisabled}
            className={classNames(
              "p-2 rounded-lg text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-1 focus:ring-primary/50",
              isDisabled
                ? "text-gray-300 cursor-not-allowed"
                : "hover:bg-emerald-100 text-gray-700",
              !isDisabled &&
                (isSelected
                  ? "bg-primary text-white hover:text-primary"
                  : isHighlighted
                    ? "bg-primary/30 text-primary-dark ring-2 ring-primary/50"
                    : "")
            )}
          >
            {yearVal}
          </button>
        );
      })}
    </div>
  );
};

export default YearsGrid;