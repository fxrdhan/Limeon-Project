import React from "react";
import classNames from "classnames";
import { DAY_LABELS } from "../constants";
import type { DaysGridProps } from "../types";

const DaysGrid: React.FC<DaysGridProps> = ({
  displayDate,
  value,
  highlightedDate,
  minDate,
  maxDate,
  onDateSelect,
  onDateHighlight,
}) => {
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();

  // Calculate days in month and first day
  const daysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const numDays = daysInMonth(year, month);
  let firstDay = firstDayOfMonth(year, month);
  if (firstDay === 0) firstDay = 6;
  else firstDay -= 1;

  const calendarDays: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= numDays; i++) calendarDays.push(i);

  return (
    <div className="grid grid-cols-7 gap-px text-center text-xs">
      {DAY_LABELS.map((day) => (
        <div key={day} className="font-medium text-gray-500 py-1.5">
          {day}
        </div>
      ))}
      {calendarDays.map((day, index) => {
        if (day === null)
          return <div key={`empty-${index}`} className="py-1.5"></div>;

        const currentDate = new Date(year, month, day);
        const isSelected =
          value && currentDate.toDateString() === value.toDateString();
        const isHighlighted =
          highlightedDate &&
          currentDate.toDateString() === highlightedDate.toDateString();

        let isDisabled = false;
        if (minDate) {
          const min = new Date(minDate);
          min.setHours(0, 0, 0, 0);
          if (currentDate < min) isDisabled = true;
        }
        if (maxDate) {
          const max = new Date(maxDate);
          max.setHours(0, 0, 0, 0);
          if (currentDate > max) isDisabled = true;
        }

        const isToday =
          new Date(year, month, day).toDateString() ===
          new Date().toDateString();

        return (
          <button
            key={day}
            onClick={() => !isDisabled && onDateSelect(currentDate)}
            onMouseEnter={() =>
              !isDisabled && onDateHighlight(currentDate)
            }
            onMouseLeave={() => onDateHighlight(null)}
            disabled={isDisabled}
            className={classNames(
              "py-1.5 rounded-lg text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary/50",
              isDisabled
                ? "text-gray-300 cursor-not-allowed"
                : "hover:bg-emerald-100",
              !isDisabled &&
                (isSelected
                  ? "bg-primary text-white hover:text-primary hover:bg-primary"
                  : isHighlighted
                    ? "bg-primary/30 text-primary-dark ring-2 ring-primary/50"
                    : isToday
                      ? "border border-primary text-primary"
                      : "text-gray-700")
            )}
          >
            {day}
          </button>
        );
      })}
    </div>
  );
};

export default DaysGrid;