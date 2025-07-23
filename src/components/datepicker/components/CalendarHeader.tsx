import React from "react";
import classNames from "classnames";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { getYearsToDisplay, DATE_FORMAT_CONFIG } from "../constants";
import type { CalendarHeaderProps } from "../types";

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentView,
  displayDate,
  onNavigatePrev,
  onNavigateNext,
  onHeaderClick,
}) => {
  const renderHeaderContent = () => {
    if (currentView === "days") {
      return displayDate.toLocaleDateString(
        DATE_FORMAT_CONFIG.locale,
        DATE_FORMAT_CONFIG.monthYear
      );
    } else if (currentView === "months") {
      return displayDate.getFullYear().toString();
    } else if (currentView === "years") {
      const years = getYearsToDisplay(displayDate.getFullYear());
      return `${years[0]} - ${years[years.length - 1]}`;
    }
    return "";
  };

  const getAriaLabel = (direction: "prev" | "next") => {
    const isNext = direction === "next";
    if (currentView === "days") {
      return isNext ? "Next month" : "Previous month";
    } else if (currentView === "months") {
      return isNext ? "Next year" : "Previous year";
    } else {
      return isNext ? "Next decade" : "Previous decade";
    }
  };

  return (
    <div className="flex justify-between items-center mb-3">
      <button
        onClick={onNavigatePrev}
        className="p-1.5 rounded-lg hover:bg-gray-100 focus:outline-hidden transition-colors"
        aria-label={getAriaLabel("prev")}
      >
        <FaChevronLeft size={12} />
      </button>
      
      <button
        onClick={onHeaderClick}
        className={classNames(
          "font-semibold text-sm hover:bg-gray-100 p-1.5 rounded-sm focus:outline-hidden min-w-[120px] text-center transition-colors",
          "focus:ring-2 focus:ring-primary/50 focus:bg-primary/10"
        )}
        aria-live="polite"
      >
        {renderHeaderContent()}
      </button>
      
      <button
        onClick={onNavigateNext}
        className="p-1.5 rounded-lg hover:bg-gray-100 focus:outline-hidden transition-colors"
        aria-label={getAriaLabel("next")}
      >
        <FaChevronRight size={12} />
      </button>
    </div>
  );
};

export default CalendarHeader;