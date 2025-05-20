import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/modules';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { classNames } from '@/lib/classNames';
import type { DatepickerProps } from '@/types';

export const Datepicker: React.FC<DatepickerProps> = ({
    value,
    onChange,
    label,
    inputClassName,
    placeholder = "Pilih tanggal",
    minDate,
    maxDate,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [applyOpenStyles, setApplyOpenStyles] = useState(false);
    const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
    const triggerInputRef = useRef<HTMLInputElement>(null);
    const portalContentRef = useRef<HTMLDivElement>(null);
    const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [currentMonthDate, setCurrentMonthDate] = useState(value || new Date());
    const [dropDirection, setDropDirection] = useState<'down' | 'up'>('down');

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
            width: `${buttonRect.width}px`,
            zIndex: 1050,
        };
        const margin = 5;
        if (shouldDropUp) {
            newMenuStyle.top = `${buttonRect.top + window.scrollY - calendarActualHeight - margin}px`;
        } else {
            newMenuStyle.top = `${buttonRect.bottom + window.scrollY + margin}px`;
        }
        setPortalStyle(newMenuStyle);
    }, [triggerInputRef, portalContentRef, setDropDirection, setPortalStyle]);

    useEffect(() => {
        let openStyleTimerId: NodeJS.Timeout | undefined;
        if (isOpen) {
            setCurrentMonthDate(value || new Date());
            openStyleTimerId = setTimeout(() => {
                setApplyOpenStyles(true);
                requestAnimationFrame(() => {
                    if (portalContentRef.current) {
                        calculatePosition();
                    }
                });
            }, 20);
            window.addEventListener('scroll', calculatePosition, true);
            window.addEventListener('resize', calculatePosition);
        }
        else {
            setApplyOpenStyles(false);
        }
        return () => {
            if (openStyleTimerId) clearTimeout(openStyleTimerId);
            window.removeEventListener('scroll', calculatePosition, true);
            window.removeEventListener('resize', calculatePosition);
        };
    }, [isOpen, calculatePosition, value, setApplyOpenStyles]);

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
            if (portalContentRef.current && !portalContentRef.current.matches(':hover')) {
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
        onChange(date);
        closeCalendar();
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && 
                portalContentRef.current && !portalContentRef.current.contains(event.target as Node) &&
                triggerInputRef.current && !triggerInputRef.current.contains(event.target as Node)) {
                closeCalendar();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, closeCalendar]);

    useEffect(() => {
        return () => {
            if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        };
    }, []);

    const formattedDisplayValue = () => {
        if (value) {
            return value.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return "";
    };

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const numDays = daysInMonth(year, month);
    let firstDay = firstDayOfMonth(year, month);
    if (firstDay === 0) firstDay = 6;
    else firstDay -= 1;

    const calendarDays: (number | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= numDays; i++) calendarDays.push(i);

    const dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    const changeMonth = (amount: number) => {
        setCurrentMonthDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(1);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    return (
        <div className="w-full">
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <div className="relative">
                <Input
                    ref={triggerInputRef}
                    type="text"
                    value={formattedDisplayValue()}
                    placeholder={placeholder}
                    className={classNames("cursor-pointer", inputClassName)}
                    onClick={handleTriggerClick}
                    onMouseEnter={handleTriggerMouseEnter}
                    onMouseLeave={handleTriggerMouseLeave}
                    readOnly={false}
                />
                {(isOpen || isClosing) && createPortal(
                    <div
                        ref={portalContentRef}
                        style={portalStyle}
                        className={classNames(
                            "bg-white shadow-lg rounded-md border border-gray-200 p-4 w-[280px]",
                            dropDirection === "down" ? "origin-top" : "origin-bottom",
                            "transition-all duration-200 ease-out",
                            isClosing
                                ? "opacity-0 scale-y-95"
                                : isOpen && applyOpenStyles
                                    ? "opacity-100 scale-y-100"
                                    : `opacity-0 scale-y-95 ${dropDirection === "down" ? "translate-y-1" : "-translate-y-1"} pointer-events-none`
                        )}
                        onMouseEnter={handleCalendarMouseEnter}
                        onMouseLeave={handleCalendarMouseLeave}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <button onClick={() => changeMonth(-1)} className="p-1.5 rounded hover:bg-gray-100 focus:outline-none"><FaChevronLeft size={12} /></button>
                            <div className="font-semibold text-sm">
                                {currentMonthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                            </div>
                            <button onClick={() => changeMonth(1)} className="p-1.5 rounded hover:bg-gray-100 focus:outline-none"><FaChevronRight size={12} /></button>
                        </div>
                        <div className="grid grid-cols-7 gap-px text-center text-xs">
                            {dayLabels.map(day => <div key={day} className="font-medium text-gray-500 py-1.5">{day}</div>)}
                            {calendarDays.map((day, index) => {
                                if (day === null) return <div key={`empty-${index}`} className="py-1.5"></div>;
                                const currentDate = new Date(year, month, day);
                                const isSelected = value && currentDate.toDateString() === value.toDateString();
                                
                                let isDisabled = false;
                                if (minDate) {
                                    const min = new Date(minDate);
                                    min.setHours(0,0,0,0);
                                    if (currentDate < min) isDisabled = true;
                                }
                                if (maxDate) {
                                    const max = new Date(maxDate);
                                    max.setHours(0,0,0,0);
                                    if (currentDate > max) isDisabled = true;
                                }

                                return (
                                    <button
                                        key={day}
                                        onClick={() => !isDisabled && handleDateSelect(currentDate)}
                                        disabled={isDisabled}
                                        className={classNames(
                                            "py-1.5 rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50",
                                            isDisabled ? "text-gray-300 cursor-not-allowed" : "hover:bg-teal-100",
                                            isSelected ? "bg-primary text-white hover:bg-primary/90" : "text-gray-700",
                                            !isDisabled && !isSelected && new Date(year, month, day).toDateString() === new Date().toDateString() ? "border border-primary text-primary" : ""
                                        )}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
};