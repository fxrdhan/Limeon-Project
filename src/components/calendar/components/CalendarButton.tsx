import React from 'react';
import classNames from 'classnames';
import { CALENDAR_CONSTANTS } from '../constants';
import { useCalendarTriggerContext } from '../hooks';
import { formatDateOnlyValue, formatDisplayValue } from '../utils';
import type { CalendarButtonProps } from '../types';

const CalendarButton: React.FC<CalendarButtonProps> = ({
  id,
  name,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  value,
  placeholder = 'Pilih tanggal',
  inputClassName,
  label,
  readOnly,
}) => {
  const {
    triggerInputRef,
    handleTriggerClick,
    handleInputKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    trigger,
    isOpen,
    triggerId,
    portalId,
  } = useCalendarTriggerContext();
  const inputId = id ?? triggerId;
  const displayInputReadOnly = true;

  const handleMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.detail !== 1 ||
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey
    ) {
      return;
    }

    const input = e.currentTarget;

    if (input.disabled || document.activeElement === input) {
      return;
    }

    e.preventDefault();

    const inputLength = input.value.length;
    input.focus({ preventScroll: true });
    input.setSelectionRange(inputLength, inputLength);
  };

  return (
    <div className="calendar__button-wrapper">
      {label && (
        <label className="calendar__button-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="calendar__button-input-wrapper">
        {name && (
          <input
            type="hidden"
            name={name}
            value={value ? formatDateOnlyValue(value) : ''}
            readOnly
          />
        )}
        <input
          ref={triggerInputRef as React.RefObject<HTMLInputElement>}
          id={inputId}
          type="text"
          value={formatDisplayValue(value)}
          placeholder={placeholder}
          className={classNames(
            'p-2.5 border rounded-xl',
            'px-3 text-sm font-medium text-slate-800',
            'h-[2.5rem]',
            'placeholder:text-slate-400',
            'border-slate-300',
            'focus:outline-hidden focus:border-primary focus:ring-3 focus:ring-emerald-200',
            'disabled:bg-slate-100 disabled:cursor-not-allowed read-only:bg-slate-100 read-only:cursor-default',
            'disabled:focus:ring-0 disabled:focus:border-slate-300 read-only:focus:ring-0 read-only:focus:border-slate-300',
            'transition-all ease-in-out',
            'w-full',
            'calendar__button-input',
            inputClassName
          )}
          style={
            {
              '--calendar-input-transition-duration': `${CALENDAR_CONSTANTS.INPUT_TRANSITION_DURATION}ms`,
            } as React.CSSProperties
          }
          onClick={trigger === 'click' ? handleTriggerClick : undefined}
          onMouseDown={handleMouseDown}
          onMouseEnter={
            trigger === 'hover' ? handleTriggerMouseEnter : undefined
          }
          onMouseLeave={
            trigger === 'hover' ? handleTriggerMouseLeave : undefined
          }
          onKeyDown={handleInputKeyDown}
          role="combobox"
          aria-label={ariaLabel ?? (label ? undefined : placeholder)}
          aria-labelledby={ariaLabelledBy}
          aria-controls={isOpen ? portalId : undefined}
          aria-expanded={isOpen}
          aria-readonly={readOnly ? true : undefined}
          readOnly={displayInputReadOnly}
        />
      </div>
    </div>
  );
};

export default CalendarButton;
