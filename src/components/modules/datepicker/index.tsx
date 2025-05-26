import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/modules";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { classNames } from "@/lib/classNames";
import type { DatepickerProps } from "@/types";

type CalendarView = "days" | "months" | "years";

const MONTH_NAMES_ID = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
];

const getYearsToDisplay = (year: number) => {
    const startYear = Math.floor(year / 10) * 10;
    return Array.from({ length: 12 }, (_, i) => startYear + i - 1);
};

export const Datepicker: React.FC<DatepickerProps> = ({
    value,
    onChange,
    label,
    inputClassName,
    placeholder = "Pilih tanggal",
    minDate,
    maxDate,
    portalWidth,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [applyOpenStyles, setApplyOpenStyles] = useState(false);
    const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
    const triggerInputRef = useRef<HTMLInputElement>(null);
    const portalContentRef = useRef<HTMLDivElement>(null);
    const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [displayDate, setDisplayDate] = useState(value || new Date());
    const [currentView, setCurrentView] = useState<CalendarView>("days");
    const [dropDirection, setDropDirection] = useState<"down" | "up">("down");
    const [highlightedDate, setHighlightedDate] = useState<Date | null>(null);

    const calculatePosition = useCallback(() => {
        if (!triggerInputRef.current || !portalContentRef.current) return;
        const buttonRect = triggerInputRef.current.getBoundingClientRect();
        const calendarActualHeight = portalContentRef.current.scrollHeight;
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const shouldDropUp =
            spaceBelow < calendarActualHeight + 10 &&
            buttonRect.top > calendarActualHeight + 10;

        setDropDirection(shouldDropUp ? "up" : "down");

        const newMenuStyle: React.CSSProperties = {
            position: "fixed",
            left: `${buttonRect.left + window.scrollX}px`,
            width: portalWidth ? (typeof portalWidth === 'number' ? `${portalWidth}px` : portalWidth) : `${buttonRect.width}px`,
            zIndex: 1050,
        };
        const margin = 5;
        if (shouldDropUp) {
            newMenuStyle.top = `${buttonRect.top + window.scrollY - calendarActualHeight - margin
                }px`;
        } else {
            newMenuStyle.top = `${buttonRect.bottom + window.scrollY + margin}px`;
        }
        setPortalStyle(newMenuStyle);
    }, [triggerInputRef, portalContentRef, setDropDirection, setPortalStyle, portalWidth]);

    useEffect(() => {
        let openStyleTimerId: NodeJS.Timeout | undefined;
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setDisplayDate(value || new Date());
            setCurrentView("days");
            setHighlightedDate(value || new Date());
            openStyleTimerId = setTimeout(() => {
                setApplyOpenStyles(true);
                requestAnimationFrame(() => {
                    if (portalContentRef.current) {
                        calculatePosition();
                    }
                });
            }, 20);
            window.addEventListener("scroll", calculatePosition, true);
            window.addEventListener("resize", calculatePosition);
        } else {
            setApplyOpenStyles(false);
            setHighlightedDate(null);
            document.body.style.overflow = '';
        }
        return () => {
            if (openStyleTimerId) clearTimeout(openStyleTimerId);
            document.body.style.overflow = '';
            window.removeEventListener("scroll", calculatePosition, true);
            window.removeEventListener("resize", calculatePosition);
        };
    }, [isOpen, calculatePosition, value, setApplyOpenStyles, portalContentRef]);

    const openCalendar = useCallback(() => {
        if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        setIsOpen(true);
        setIsClosing(false);
    }, []);

    const closeCalendar = useCallback(() => {
        if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
            setApplyOpenStyles(false);
        }, 200);
    }, []);

    const handleTriggerClick = () => {
        if (isOpen && !isClosing) {
            closeCalendar();
        } else {
            openCalendar();
        }
    };

    const handleTriggerMouseEnter = () => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        openTimeoutRef.current = setTimeout(() => {
            openCalendar();
        }, 150);
    };

    const handleTriggerMouseLeave = () => {
        if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
        closeTimeoutRef.current = setTimeout(() => {
            if (
                portalContentRef.current &&
                !portalContentRef.current.matches(":hover")
            ) {
                closeCalendar();
            }
        }, 200);
    };

    const handleCalendarMouseEnter = () => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };

    const handleCalendarMouseLeave = () => {
        closeTimeoutRef.current = setTimeout(() => {
            closeCalendar();
        }, 200);
    };

    const handleDateSelect = (date: Date) => {
        const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
        onChange(selectedDate);
        closeCalendar();
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (isOpen && !isClosing) {
                if (highlightedDate) {
                    handleDateSelect(highlightedDate);
                } else {
                    closeCalendar();
                }
            } else {
                openCalendar();
            }
        } else if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            closeCalendar();
        } else if (isOpen && currentView === "days") {
            const currentHighlight = highlightedDate || value || new Date();
            const newHighlight = new Date(currentHighlight);
            
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    newHighlight.setDate(newHighlight.getDate() - 1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    newHighlight.setDate(newHighlight.getDate() + 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    newHighlight.setDate(newHighlight.getDate() - 7);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    newHighlight.setDate(newHighlight.getDate() + 7);
                    break;
                default:
                    return;
            }
            
            // Check if new date is within allowed range
            let isValidDate = true;
            if (minDate) {
                const min = new Date(minDate);
                min.setHours(0, 0, 0, 0);
                if (newHighlight < min) isValidDate = false;
            }
            if (maxDate) {
                const max = new Date(maxDate);
                max.setHours(0, 0, 0, 0);
                if (newHighlight > max) isValidDate = false;
            }
            
            if (isValidDate) {
                setHighlightedDate(newHighlight);
                // Update display month if necessary
                if (newHighlight.getMonth() !== displayDate.getMonth() || 
                    newHighlight.getFullYear() !== displayDate.getFullYear()) {
                    setDisplayDate(new Date(newHighlight.getFullYear(), newHighlight.getMonth(), 1));
                }
            }
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isOpen &&
                portalContentRef.current &&
                !portalContentRef.current.contains(event.target as Node) &&
                triggerInputRef.current &&
                !triggerInputRef.current.contains(event.target as Node)
            ) {
                closeCalendar();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, closeCalendar]);

    useEffect(() => {
        return () => {
            if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        };
    }, []);

    const formattedDisplayValue = () => {
        if (value) {
            return value.toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        }
        return "";
    };

    const daysInMonth = (year: number, month: number) =>
        new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) =>
        new Date(year, month, 1).getDay();

    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();

    const numDays = daysInMonth(year, month);
    let firstDay = firstDayOfMonth(year, month);
    if (firstDay === 0) firstDay = 6;
    else firstDay -= 1;

    const calendarDays: (number | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= numDays; i++) calendarDays.push(i);

    const dayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

    const navigateViewDate = (direction: "prev" | "next") => {
        setDisplayDate((prev) => {
            const newDate = new Date(prev);
            if (currentView === "days") {
                newDate.setDate(1);
                newDate.setMonth(newDate.getMonth() + (direction === "prev" ? -1 : 1));
            } else if (currentView === "months") {
                newDate.setFullYear(
                    newDate.getFullYear() + (direction === "prev" ? -1 : 1)
                );
            } else if (currentView === "years") {
                const decadeShift = 10;
                newDate.setFullYear(
                    newDate.getFullYear() +
                    (direction === "prev" ? -decadeShift : decadeShift)
                );
            }
            return newDate;
        });
    };

    const handleHeaderClick = () => {
        if (currentView === "days") {
            setCurrentView("months");
        } else if (currentView === "months") {
            setCurrentView("years");
        }
        requestAnimationFrame(() => {
            if (isOpen && portalContentRef.current) {
                calculatePosition();
            }
        });
    };

    const handleMonthSelect = (selectedMonth: number) => {
        setDisplayDate((prev) => {
            const newDate = new Date(prev);
            newDate.setMonth(selectedMonth);
            newDate.setDate(1);
            return newDate;
        });
        setCurrentView("days");
        requestAnimationFrame(() => {
            if (isOpen && portalContentRef.current) {
                calculatePosition();
            }
        });
    };

    const handleYearSelect = (selectedYear: number) => {
        setDisplayDate((prev) => {
            const newDate = new Date(prev);
            newDate.setFullYear(selectedYear);
            return newDate;
        });
        setCurrentView("months");
        requestAnimationFrame(() => {
            if (isOpen && portalContentRef.current) {
                calculatePosition();
            }
        });
    };

    const renderHeaderContent = () => {
        if (currentView === "days") {
            return displayDate.toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
            });
        } else if (currentView === "months") {
            return displayDate.getFullYear().toString();
        } else if (currentView === "years") {
            const years = getYearsToDisplay(displayDate.getFullYear());
            return `${years[0]} - ${years[years.length - 1]}`;
        }
        return "";
    };

    const renderDaysGrid = () => (
        <>
            <div className="grid grid-cols-7 gap-px text-center text-xs">
                {dayLabels.map((day) => (
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
                        highlightedDate && currentDate.toDateString() === highlightedDate.toDateString();

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

                    return (
                        <button
                            key={day}
                            onClick={() => !isDisabled && handleDateSelect(currentDate)}
                            disabled={isDisabled}
                            className={classNames(
                                "py-1.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50",
                                isDisabled ? "text-gray-300 cursor-not-allowed" : "hover:bg-teal-100",
                                !isDisabled && (isSelected
                                    ? "bg-primary text-white hover:bg-primary"
                                    : isHighlighted
                                        ? "bg-primary/30 text-primary-dark ring-2 ring-primary/50"
                                        : new Date(year, month, day).toDateString() === new Date().toDateString()
                                            ? "border border-primary text-primary"
                                            : "text-gray-700")
                            )}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </>
    );

    const renderMonthsGrid = () => {
        const currentYear = displayDate.getFullYear();
        return (
            <div className="grid grid-cols-3 gap-2 py-1">
                {MONTH_NAMES_ID.map((monthName, index) => {
                    let isDisabled = false;
                    if (minDate) {
                        const minD = new Date(minDate);
                        minD.setDate(1);
                        minD.setHours(0, 0, 0, 0);
                        const lastDayOfMonth = new Date(currentYear, index + 1, 0);
                        if (lastDayOfMonth < minD) isDisabled = true;
                    }
                    if (maxDate) {
                        const maxD = new Date(maxDate);
                        maxD.setDate(1);
                        maxD.setHours(0, 0, 0, 0);
                        const firstDayOfMonth = new Date(currentYear, index, 1);
                        if (firstDayOfMonth > maxD) isDisabled = true;
                    }
                    return (
                        <button
                            key={monthName}
                            onClick={() => !isDisabled && handleMonthSelect(index)}
                            disabled={isDisabled}
                            className={classNames(
                                "p-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50",
                                isDisabled
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "hover:bg-teal-100 text-gray-700",
                                value &&
                                value.getFullYear() === currentYear &&
                                value.getMonth() === index &&
                                "bg-primary/20 text-primary-dark"
                            )}
                        >
                            {monthName.substring(0, 3)}
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderYearsGrid = () => {
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
                    return (
                        <button
                            key={yearVal}
                            onClick={() => !isDisabled && handleYearSelect(yearVal)}
                            disabled={isDisabled}
                            className={classNames(
                                "p-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50",
                                isDisabled
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "hover:bg-teal-100 text-gray-700",
                                value &&
                                value.getFullYear() === yearVal &&
                                "bg-primary/20 text-primary-dark"
                            )}
                        >
                            {yearVal}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <Input
                    ref={triggerInputRef}
                    type="text"
                    value={formattedDisplayValue()}
                    placeholder={placeholder}
                    className={classNames("cursor-pointer", inputClassName)}
                    onClick={handleTriggerClick}
                    onKeyDown={handleInputKeyDown}
                    onMouseEnter={handleTriggerMouseEnter}
                    onMouseLeave={handleTriggerMouseLeave}
                    readOnly={false}
                />
                {(isOpen || isClosing) &&
                    createPortal(
                        <div
                            ref={portalContentRef}
                            style={portalStyle}
                            className={classNames(
                                "bg-white shadow-lg rounded-lg border border-gray-200 p-4 w-[280px]",
                                dropDirection === "down" ? "origin-top" : "origin-bottom",
                                "transition-all duration-200 ease-out",
                                isClosing
                                    ? "opacity-0 scale-y-95"
                                    : isOpen && applyOpenStyles
                                        ? "opacity-100 scale-y-100"
                                        : `opacity-0 scale-y-95 ${dropDirection === "down"
                                            ? "translate-y-1"
                                            : "-translate-y-1"
                                        } pointer-events-none`
                            )}
                            onMouseEnter={handleCalendarMouseEnter}
                            onMouseLeave={handleCalendarMouseLeave}
                        >
                            <div className="flex justify-between items-center mb-3">
                                <button
                                    onClick={() => navigateViewDate("prev")}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 focus:outline-none"
                                    aria-label={
                                        currentView === "days"
                                            ? "Previous month"
                                            : currentView === "months"
                                                ? "Previous year"
                                                : "Previous decade"
                                    }
                                >
                                    <FaChevronLeft size={12} />
                                </button>
                                <button
                                    onClick={handleHeaderClick}
                                    className="font-semibold text-sm hover:bg-gray-100 p-1.5 rounded focus:outline-none min-w-[120px] text-center"
                                    aria-live="polite"
                                >
                                    {renderHeaderContent()}
                                </button>
                                <button
                                    onClick={() => navigateViewDate("next")}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 focus:outline-none"
                                    aria-label={
                                        currentView === "days"
                                            ? "Next month"
                                            : currentView === "months"
                                                ? "Next year"
                                                : "Next decade"
                                    }
                                >
                                    <FaChevronRight size={12} />
                                </button>
                            </div>

                            {currentView === "days" && renderDaysGrid()}
                            {currentView === "months" && renderMonthsGrid()}
                            {currentView === "years" && renderYearsGrid()}
                        </div>,
                        document.body
                    )}
            </div>
        </div>
    );
};
