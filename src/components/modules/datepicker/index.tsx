import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Input from "@/components/modules/input";
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

const Datepicker: React.FC<DatepickerProps> = ({
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
    const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
    const [isPositionReady, setIsPositionReady] = useState(false);
    const triggerInputRef = useRef<HTMLInputElement>(null);
    const portalContentRef = useRef<HTMLDivElement>(null);
    const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [displayDate, setDisplayDate] = useState(value || new Date());
    const [currentView, setCurrentView] = useState<CalendarView>("days");
    const [dropDirection, setDropDirection] = useState<"down" | "up">("down");
    const [highlightedDate, setHighlightedDate] = useState<Date | null>(null);
    const [highlightedMonth, setHighlightedMonth] = useState<number | null>(null);
    const [highlightedYear, setHighlightedYear] = useState<number | null>(null);

    const focusPortal = useCallback(() => {
        setTimeout(() => {
            if (portalContentRef.current) {
                portalContentRef.current.focus();
            }
        }, 0);
    }, []);

    const calculatePosition = useCallback(() => {
        if (!triggerInputRef.current) return;
        const buttonRect = triggerInputRef.current.getBoundingClientRect();
        const calendarHeight = 320;
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const shouldDropUp =
            spaceBelow < calendarHeight + 10 && buttonRect.top > calendarHeight + 10;

        setDropDirection(shouldDropUp ? "up" : "down");

        const newMenuStyle: React.CSSProperties = {
            position: "fixed",
            left: `${buttonRect.left + window.scrollX}px`,
            width: portalWidth
                ? typeof portalWidth === "number"
                    ? `${portalWidth}px`
                    : portalWidth
                : `${buttonRect.width}px`,
            zIndex: 1050,
        };
        const margin = 5;
        if (shouldDropUp) {
            newMenuStyle.top = `${buttonRect.top + window.scrollY - calendarHeight - margin
                }px`;
        } else {
            newMenuStyle.top = `${buttonRect.bottom + window.scrollY + margin}px`;
        }
        setPortalStyle(newMenuStyle);
        setIsPositionReady(true);
    }, [portalWidth]);

    useEffect(() => {
        if (isOpen) {
            setIsPositionReady(false);
            setDisplayDate(value || new Date());
            setCurrentView("days");
            setHighlightedDate(value || new Date());
            setHighlightedMonth(null);
            setHighlightedYear(null);
            calculatePosition();
            window.addEventListener("scroll", calculatePosition, true);
            window.addEventListener("resize", calculatePosition);
        } else {
            setHighlightedDate(null);
            setHighlightedMonth(null);
            setHighlightedYear(null);
            setIsPositionReady(false);
        }
        return () => {
            window.removeEventListener("scroll", calculatePosition, true);
            window.removeEventListener("resize", calculatePosition);
        };
    }, [isOpen, calculatePosition, value]);

    const openCalendar = useCallback(() => {
        if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        setIsOpen(true);
        setIsClosing(false);
        setTimeout(() => {
            if (portalContentRef.current) {
                portalContentRef.current.focus();
            }
        }, 0);
    }, []);

    const closeCalendar = useCallback(() => {
        if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
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
            setTimeout(() => {
                if (portalContentRef.current) {
                    portalContentRef.current.focus();
                }
            }, 100);
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
        const selectedDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            12,
            0,
            0
        );
        onChange(selectedDate);
        closeCalendar();

        setTimeout(() => {
            triggerInputRef.current?.focus();
        }, 250);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Tab" && isOpen) {
            e.preventDefault();
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
            if (isOpen && !isClosing) {
                if (currentView === "days" && highlightedDate) {
                    handleDateSelect(highlightedDate);
                } else if (currentView === "months" && highlightedMonth !== null) {
                    handleMonthSelect(highlightedMonth);
                } else if (currentView === "years" && highlightedYear !== null) {
                    handleYearSelect(highlightedYear);
                } else {
                    closeCalendar();
                }
            } else {
                openCalendar();
            }
        } else if (e.key === "Escape" && isOpen) {
            e.preventDefault();
            closeCalendar();
        } else if (isOpen) {
            if (e.ctrlKey && currentView === "days") {
                let navigated = false;
                switch (e.key) {
                    case "ArrowLeft":
                        navigateViewDate("prev");
                        navigated = true;
                        break;
                    case "ArrowRight":
                        navigateViewDate("next");
                        navigated = true;
                        break;
                    case "ArrowUp":
                        navigateYear("prev");
                        navigated = true;
                        break;
                    case "ArrowDown":
                        navigateYear("next");
                        navigated = true;
                        break;
                }
                if (navigated) {
                    e.preventDefault();
                    return;
                }
            }

            if (currentView === "days" && !e.ctrlKey) {
                const currentHighlight = highlightedDate || value || new Date();
                const newHighlight = new Date(currentHighlight);
                let navigated = false;

                switch (e.key) {
                    case "ArrowLeft":
                        newHighlight.setDate(newHighlight.getDate() - 1);
                        navigated = true;
                        break;
                    case "ArrowRight":
                        newHighlight.setDate(newHighlight.getDate() + 1);
                        navigated = true;
                        break;
                    case "ArrowUp":
                        newHighlight.setDate(newHighlight.getDate() - 7);
                        navigated = true;
                        break;
                    case "ArrowDown":
                        newHighlight.setDate(newHighlight.getDate() + 7);
                        navigated = true;
                        break;
                }

                if (navigated) {
                    e.preventDefault();
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
                        if (
                            newHighlight.getMonth() !== displayDate.getMonth() ||
                            newHighlight.getFullYear() !== displayDate.getFullYear()
                        ) {
                            setDisplayDate(
                                new Date(newHighlight.getFullYear(), newHighlight.getMonth(), 1)
                            );
                        }
                    }
                }
            } else if (currentView === "months") {
                const currentHighlight =
                    highlightedMonth ?? (value ? value.getMonth() : 0);
                let newHighlight = currentHighlight;
                let navigated = false;

                switch (e.key) {
                    case "ArrowLeft":
                        newHighlight = Math.max(0, currentHighlight - 1);
                        navigated = true;
                        break;
                    case "ArrowRight":
                        newHighlight = Math.min(11, currentHighlight + 1);
                        navigated = true;
                        break;
                    case "ArrowUp":
                        newHighlight = Math.max(0, currentHighlight - 3);
                        navigated = true;
                        break;
                    case "ArrowDown":
                        newHighlight = Math.min(11, currentHighlight + 3);
                        navigated = true;
                        break;
                }

                if (navigated) {
                    e.preventDefault();
                    const currentYear = displayDate.getFullYear();
                    let isValidMonth = true;
                    if (minDate) {
                        const minD = new Date(minDate);
                        const lastDayOfMonth = new Date(currentYear, newHighlight + 1, 0);
                        if (lastDayOfMonth < minD) isValidMonth = false;
                    }
                    if (maxDate) {
                        const maxD = new Date(maxDate);
                        const firstDayOfMonth = new Date(currentYear, newHighlight, 1);
                        if (firstDayOfMonth > maxD) isValidMonth = false;
                    }

                    if (isValidMonth) {
                        setHighlightedMonth(newHighlight);
                    }
                }
            } else if (currentView === "years") {
                const yearsToDisplay = getYearsToDisplay(displayDate.getFullYear());
                const currentHighlight =
                    highlightedYear ?? (value ? value.getFullYear() : yearsToDisplay[5]);
                const currentIndex = yearsToDisplay.indexOf(currentHighlight);
                let newIndex = currentIndex;
                let navigated = false;

                switch (e.key) {
                    case "ArrowLeft":
                        newIndex = Math.max(0, currentIndex - 1);
                        navigated = true;
                        break;
                    case "ArrowRight":
                        newIndex = Math.min(yearsToDisplay.length - 1, currentIndex + 1);
                        navigated = true;
                        break;
                    case "ArrowUp":
                        newIndex = Math.max(0, currentIndex - 3);
                        navigated = true;
                        break;
                    case "ArrowDown":
                        newIndex = Math.min(yearsToDisplay.length - 1, currentIndex + 3);
                        navigated = true;
                        break;
                }

                if (navigated) {
                    e.preventDefault();
                    const newYear = yearsToDisplay[newIndex];
                    let isValidYear = true;
                    if (minDate && newYear < new Date(minDate).getFullYear())
                        isValidYear = false;
                    if (maxDate && newYear > new Date(maxDate).getFullYear())
                        isValidYear = false;

                    if (isValidYear) {
                        setHighlightedYear(newYear);
                    }
                }
            }
        }
    };

    const handleCalendarKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();
            return;
        }

        if (e.ctrlKey && currentView === "days") {
            let navigated = false;
            switch (e.key) {
                case "ArrowLeft":
                    navigateViewDate("prev");
                    navigated = true;
                    break;
                case "ArrowRight":
                    navigateViewDate("next");
                    navigated = true;
                    break;
                case "ArrowUp":
                    navigateYear("prev");
                    navigated = true;
                    break;
                case "ArrowDown":
                    navigateYear("next");
                    navigated = true;
                    break;
            }
            if (navigated) {
                e.preventDefault();
                return;
            }
        }

        if (e.key === "Enter") {
            if (e.target === portalContentRef.current) {
                e.preventDefault();
                if (currentView === "days" && highlightedDate) {
                    handleDateSelect(highlightedDate);
                } else if (currentView === "months" && highlightedMonth !== null) {
                    handleMonthSelect(highlightedMonth);
                } else if (currentView === "years" && highlightedYear !== null) {
                    handleYearSelect(highlightedYear);
                }
            }
            return;
        }

        if (e.key === "Escape") {
            e.preventDefault();
            if (currentView === "years") {
                setCurrentView("months");
                setHighlightedYear(null);
                const currentDisplayYear = displayDate.getFullYear();
                setHighlightedMonth(
                    value && value.getFullYear() === currentDisplayYear
                        ? value.getMonth()
                        : 0
                );
                focusPortal();
            } else if (currentView === "months") {
                setCurrentView("days");
                const currentDisplayMonth = displayDate.getMonth();
                const currentDisplayYear = displayDate.getFullYear();
                let newHighlight: Date;
                if (
                    value &&
                    value.getFullYear() === currentDisplayYear &&
                    value.getMonth() === currentDisplayMonth
                ) {
                    newHighlight = new Date(value);
                } else {
                    newHighlight = new Date(currentDisplayYear, currentDisplayMonth, 1);
                }
                setHighlightedDate(newHighlight);
                setHighlightedMonth(null);
                focusPortal();
            } else {
                closeCalendar();
            }
            return;
        }

        if (currentView === "days" && !e.ctrlKey) {
            const currentHighlight = highlightedDate || value || new Date();
            const newHighlight = new Date(currentHighlight);
            let navigated = false;

            switch (e.key) {
                case "ArrowLeft":
                    newHighlight.setDate(newHighlight.getDate() - 1);
                    navigated = true;
                    break;
                case "ArrowRight":
                    newHighlight.setDate(newHighlight.getDate() + 1);
                    navigated = true;
                    break;
                case "ArrowUp":
                    newHighlight.setDate(newHighlight.getDate() - 7);
                    navigated = true;
                    break;
                case "ArrowDown":
                    newHighlight.setDate(newHighlight.getDate() + 7);
                    navigated = true;
                    break;
            }

            if (navigated) {
                e.preventDefault();
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
                    if (
                        newHighlight.getMonth() !== displayDate.getMonth() ||
                        newHighlight.getFullYear() !== displayDate.getFullYear()
                    ) {
                        setDisplayDate(
                            new Date(newHighlight.getFullYear(), newHighlight.getMonth(), 1)
                        );
                    }
                }
            }
        } else if (currentView === "months") {
            const currentHighlight =
                highlightedMonth ?? (value ? value.getMonth() : 0);
            let newHighlight = currentHighlight;
            let navigated = false;

            switch (e.key) {
                case "ArrowLeft":
                    newHighlight = Math.max(0, currentHighlight - 1);
                    navigated = true;
                    break;
                case "ArrowRight":
                    newHighlight = Math.min(11, currentHighlight + 1);
                    navigated = true;
                    break;
                case "ArrowUp":
                    newHighlight = Math.max(0, currentHighlight - 3);
                    navigated = true;
                    break;
                case "ArrowDown":
                    newHighlight = Math.min(11, currentHighlight + 3);
                    navigated = true;
                    break;
            }

            if (navigated) {
                e.preventDefault();
                const currentYear = displayDate.getFullYear();
                let isValidMonth = true;
                if (minDate) {
                    const minD = new Date(minDate);
                    const lastDayOfMonth = new Date(currentYear, newHighlight + 1, 0);
                    if (lastDayOfMonth < minD) isValidMonth = false;
                }
                if (maxDate) {
                    const maxD = new Date(maxDate);
                    const firstDayOfMonth = new Date(currentYear, newHighlight, 1);
                    if (firstDayOfMonth > maxD) isValidMonth = false;
                }

                if (isValidMonth) {
                    setHighlightedMonth(newHighlight);
                }
            }
        } else if (currentView === "years") {
            const yearsToDisplay = getYearsToDisplay(displayDate.getFullYear());
            const currentHighlight =
                highlightedYear ?? (value ? value.getFullYear() : yearsToDisplay[5]);
            const currentIndex = yearsToDisplay.indexOf(currentHighlight);
            let newIndex = currentIndex;
            let navigated = false;

            switch (e.key) {
                case "ArrowLeft":
                    newIndex = Math.max(0, currentIndex - 1);
                    navigated = true;
                    break;
                case "ArrowRight":
                    newIndex = Math.min(yearsToDisplay.length - 1, currentIndex + 1);
                    navigated = true;
                    break;
                case "ArrowUp":
                    newIndex = Math.max(0, currentIndex - 3);
                    navigated = true;
                    break;
                case "ArrowDown":
                    newIndex = Math.min(yearsToDisplay.length - 1, currentIndex + 3);
                    navigated = true;
                    break;
            }

            if (navigated) {
                e.preventDefault();
                const newYear = yearsToDisplay[newIndex];
                let isValidYear = true;
                if (minDate && newYear < new Date(minDate).getFullYear())
                    isValidYear = false;
                if (maxDate && newYear > new Date(maxDate).getFullYear())
                    isValidYear = false;

                if (isValidYear) {
                    setHighlightedYear(newYear);
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

    const navigateYear = (direction: "prev" | "next") => {
        setDisplayDate((prev) => {
            const newDate = new Date(prev);
            newDate.setFullYear(
                newDate.getFullYear() + (direction === "prev" ? -1 : 1)
            );
            return newDate;
        });
    };

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
            setHighlightedDate(null);
            setHighlightedMonth(value ? value.getMonth() : 0);
        } else if (currentView === "months") {
            setCurrentView("years");
            setHighlightedMonth(null);
            setHighlightedYear(
                value ? value.getFullYear() : displayDate.getFullYear()
            );
        }
        calculatePosition();
        focusPortal();
    };

    const handleMonthSelect = (selectedMonth: number) => {
        const currentDisplayYear = displayDate.getFullYear();
        const newDisplayDateForDaysView = new Date(
            currentDisplayYear,
            selectedMonth,
            1
        );

        setDisplayDate(newDisplayDateForDaysView);
        setCurrentView("days");

        let newHighlight: Date;
        if (
            value &&
            value.getFullYear() === currentDisplayYear &&
            value.getMonth() === selectedMonth
        ) {
            newHighlight = new Date(value);
        } else {
            newHighlight = new Date(currentDisplayYear, selectedMonth, 1);
        }
        setHighlightedDate(newHighlight);
        setHighlightedMonth(null);

        calculatePosition();
        focusPortal();
    };

    const handleYearSelect = (selectedYear: number) => {
        setDisplayDate((prev) => {
            const newDate = new Date(prev);
            newDate.setFullYear(selectedYear);
            return newDate;
        });
        setCurrentView("months");
        setHighlightedYear(null);
        setHighlightedMonth(
            value && value.getFullYear() === selectedYear ? value.getMonth() : 0
        );
        calculatePosition();
        focusPortal();
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

                    return (
                        <button
                            key={day}
                            onClick={() => !isDisabled && handleDateSelect(currentDate)}
                            onMouseEnter={() =>
                                !isDisabled && setHighlightedDate(currentDate)
                            }
                            onMouseLeave={() => setHighlightedDate(null)}
                            disabled={isDisabled}
                            className={classNames(
                                "py-1.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50",
                                isDisabled
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "hover:bg-teal-100",
                                !isDisabled &&
                                (isSelected
                                    ? "bg-primary text-white hover:text-primary hover:bg-primary"
                                    : isHighlighted
                                        ? "bg-primary/30 text-primary-dark ring-2 ring-primary/50"
                                        : new Date(year, month, day).toDateString() ===
                                            new Date().toDateString()
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

                    const isSelected =
                        value &&
                        value.getFullYear() === currentYear &&
                        value.getMonth() === index;
                    const isHighlighted = highlightedMonth === index;

                    return (
                        <button
                            key={monthName}
                            onClick={() => !isDisabled && handleMonthSelect(index)}
                            onMouseEnter={() => !isDisabled && setHighlightedMonth(index)}
                            onMouseLeave={() => setHighlightedMonth(null)}
                            disabled={isDisabled}
                            className={classNames(
                                "p-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50",
                                isDisabled
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "hover:bg-teal-100 text-gray-700",
                                !isDisabled &&
                                (isSelected
                                    ? "bg-primary text-white hover:text-primary"
                                    : isHighlighted
                                        ? "bg-primary/30 text-primary-dark ring-2 ring-primary/50"
                                        : "")
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

                    const isSelected = value && value.getFullYear() === yearVal;
                    const isHighlighted = highlightedYear === yearVal;

                    return (
                        <button
                            key={yearVal}
                            onClick={() => !isDisabled && handleYearSelect(yearVal)}
                            onMouseEnter={() => !isDisabled && setHighlightedYear(yearVal)}
                            onMouseLeave={() => setHighlightedYear(null)}
                            disabled={isDisabled}
                            className={classNames(
                                "p-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50",
                                isDisabled
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "hover:bg-teal-100 text-gray-700",
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
                    onChange={(e) => e.preventDefault()}
                />
                {(isOpen || isClosing) &&
                    isPositionReady &&
                    createPortal(
                        <div
                            ref={portalContentRef}
                            tabIndex={0}
                            style={{
                                ...portalStyle,
                                outline: "none",
                            }}
                            className={classNames(
                                "bg-white shadow-lg rounded-lg border border-gray-200 p-4 w-[280px]",
                                dropDirection === "down" ? "origin-top" : "origin-bottom",
                                "transition-all duration-150 ease-out focus:outline-none",
                                isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"
                            )}
                            onMouseEnter={handleCalendarMouseEnter}
                            onMouseLeave={handleCalendarMouseLeave}
                            onKeyDown={handleCalendarKeyDown}
                        >
                            <div className="flex justify-between items-center mb-3">
                                <button
                                    onClick={() => navigateViewDate("prev")}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 focus:outline-none transition-colors"
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
                                    className={classNames(
                                        "font-semibold text-sm hover:bg-gray-100 p-1.5 rounded focus:outline-none min-w-[120px] text-center transition-colors",
                                        "focus:ring-2 focus:ring-primary/50 focus:bg-primary/10"
                                    )}
                                    aria-live="polite"
                                >
                                    {renderHeaderContent()}
                                </button>
                                <button
                                    onClick={() => navigateViewDate("next")}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 focus:outline-none transition-colors"
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

export default Datepicker;