import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/modules';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { classNames } from '@/lib/classNames';

export type CustomDateValueType = Date | null;

interface PortalledDatepickerProps {
    value: CustomDateValueType;
    onChange: (date: CustomDateValueType) => void;
    label?: string;
    inputClassName?: string;
    placeholder?: string;
    minDate?: Date;
    maxDate?: Date;
}

export const PortalledDatepicker: React.FC<PortalledDatepickerProps> = ({
    value,
    onChange,
    label,
    inputClassName,
    placeholder = "Pilih tanggal",
    minDate,
    maxDate,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
    const triggerInputRef = useRef<HTMLInputElement>(null);
    const portalContentRef = useRef<HTMLDivElement>(null);
    const [currentMonthDate, setCurrentMonthDate] = useState(value || new Date());

    const calculatePosition = useCallback(() => {
        if (triggerInputRef.current) {
            const rect = triggerInputRef.current.getBoundingClientRect();
            setPortalStyle({
                position: 'fixed',
                top: `${rect.bottom + window.scrollY + 5}px`,
                left: `${rect.left + window.scrollX}px`,
                zIndex: 1050,
            });
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setCurrentMonthDate(value || new Date());
            calculatePosition();
            window.addEventListener('scroll', calculatePosition, true);
            window.addEventListener('resize', calculatePosition);
        }
        return () => {
            window.removeEventListener('scroll', calculatePosition, true);
            window.removeEventListener('resize', calculatePosition);
        };
    }, [isOpen, calculatePosition, value]);

    const handleTriggerClick = () => setIsOpen(prev => !prev);

    const handleDateSelect = (date: Date) => {
        onChange(date);
        setIsOpen(false);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && 
                portalContentRef.current && !portalContentRef.current.contains(event.target as Node) &&
                triggerInputRef.current && !triggerInputRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

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
    let firstDay = firstDayOfMonth(year, month); // Sunday is 0, Saturday is 6
    if (firstDay === 0) firstDay = 6; // Make Sunday last day of week (index 6)
    else firstDay -= 1; // Adjust Monday to be 0

    const calendarDays: (number | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= numDays; i++) calendarDays.push(i);

    const dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    const changeMonth = (amount: number) => {
        setCurrentMonthDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(1); // Avoid issues with month lengths
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    return (
        <div className="w-full">
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <Input
                ref={triggerInputRef}
                type="text"
                value={formattedDisplayValue()}
                readOnly
                placeholder={placeholder}
                className={classNames("cursor-pointer", inputClassName)}
                onClick={handleTriggerClick}
            />
            {isOpen && createPortal(
                <div ref={portalContentRef} style={portalStyle} className="bg-white shadow-lg rounded-md border border-gray-200 p-4 w-[280px]"> {/* Adjusted width */}
                    <div className="flex justify-between items-center mb-3">
                        <button onClick={() => changeMonth(-1)} className="p-1.5 rounded hover:bg-gray-100 focus:outline-none"><FaChevronLeft size={12} /></button>
                        <div className="font-semibold text-sm">
                            {currentMonthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                        </div>
                        <button onClick={() => changeMonth(1)} className="p-1.5 rounded hover:bg-gray-100 focus:outline-none"><FaChevronRight size={12} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-px text-center text-xs"> {/* gap-px for thin lines */}
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
    );
};