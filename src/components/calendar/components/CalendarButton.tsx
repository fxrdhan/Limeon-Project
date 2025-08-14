import React from 'react';
import classNames from 'classnames';
import Input from '@/components/input';
import { useCalendarContext } from '../hooks';
import { DATE_FORMAT_CONFIG } from '../constants';
import type { CalendarButtonProps } from '../types';

const CalendarButton: React.FC<CalendarButtonProps> = ({
  value,
  placeholder = 'Pilih tanggal',
  inputClassName,
  label,
}) => {
  const {
    triggerInputRef,
    handleTriggerClick,
    handleInputKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    trigger,
  } = useCalendarContext();

  const formattedDisplayValue = () => {
    if (value) {
      return value.toLocaleDateString(
        DATE_FORMAT_CONFIG.locale,
        DATE_FORMAT_CONFIG.dayMonthYear
      );
    }
    return '';
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
          className={classNames('cursor-pointer', inputClassName)}
          onClick={trigger === 'click' ? handleTriggerClick : undefined}
          onMouseEnter={
            trigger === 'hover' ? handleTriggerMouseEnter : undefined
          }
          onMouseLeave={
            trigger === 'hover' ? handleTriggerMouseLeave : undefined
          }
          onKeyDown={handleInputKeyDown}
          onChange={e => e.preventDefault()}
        />
      </div>
    </div>
  );
};

export default CalendarButton;
