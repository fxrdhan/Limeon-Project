import React from 'react';
import { PharmaComboboxSelect } from '@/components/combobox';
import { CalendarHeader } from './components';
import { CALENDAR_SIZE_PRESETS } from './constants';
import { useCalendarContentContext, useCalendarPortalContext } from './hooks';
import { CalendarPrimitive } from './primitive';
import { formatDateOnlyValue } from './utils';
import type { CalendarHeaderSelectRenderProps, CalendarProps } from './types';
import './style.scss';

export type { CalendarProps } from './types';

type PharmaCalendarContentProps = Pick<
  CalendarProps,
  | 'aria-label'
  | 'aria-labelledby'
  | 'children'
  | 'id'
  | 'inputClassName'
  | 'label'
  | 'name'
  | 'placeholder'
>;

const getHeaderSelectPopupClassName = (className: string) =>
  className === 'calendar__month-select'
    ? 'w-[120px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl'
    : 'w-[100px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl';

const createCalendarHeaderSelectRenderer =
  (popupContainerRef?: React.RefObject<Element | DocumentFragment | null>) =>
  ({
    className,
    label,
    items,
    value,
    onValueChange,
    isItemDisabled,
    itemToStringLabel,
    itemToStringValue,
    placeholder,
    disabled,
  }: CalendarHeaderSelectRenderProps) => (
    <PharmaComboboxSelect
      className={className}
      label={label}
      items={items}
      value={value}
      onValueChange={onValueChange}
      isItemDisabled={isItemDisabled}
      itemToStringLabel={itemToStringLabel}
      itemToStringValue={itemToStringValue}
      placeholder={placeholder}
      searchable={false}
      indicator="none"
      disabled={disabled}
      popupClassName={getHeaderSelectPopupClassName(className)}
      popupContainerRef={popupContainerRef}
      popupMatchAnchorWidth={false}
    />
  );

const renderHiddenDateInput = (
  name: string | undefined,
  value: CalendarProps['value'],
  disabled?: boolean
) =>
  name ? (
    <input
      type="hidden"
      name={name}
      value={value ? formatDateOnlyValue(value) : ''}
      disabled={disabled}
      readOnly
    />
  ) : null;

const PharmaCalendarContent: React.FC<PharmaCalendarContentProps> = ({
  id,
  name,
  label,
  inputClassName,
  placeholder,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  children,
}) => {
  const calendarContent = useCalendarContentContext();
  const {
    value,
    displayDate,
    highlightedDate,
    isInline,
    size,
    navigationDirection,
    yearNavigationDirection,
    gridTabIndex,
  } = calendarContent.view;
  const { minDate, maxDate } = calendarContent.bounds;
  const { readOnly, disabled } = calendarContent.interaction;
  const {
    handleDateSelect,
    handleDateHighlight,
    handleNavigatePrev,
    handleNavigateNext,
    handleMonthChange,
    handleYearChange,
  } = calendarContent.actions;
  const { getDayButtonId, portalContentRef, portalWidth } =
    calendarContent.portal;
  const { handleCalendarKeyDown } = useCalendarPortalContext();
  const renderInlineHeaderSelect = React.useMemo(
    () => createCalendarHeaderSelectRenderer(),
    []
  );
  const renderPortalHeaderSelect = React.useMemo(
    () => createCalendarHeaderSelectRenderer(portalContentRef),
    [portalContentRef]
  );

  const hiddenDateInput = renderHiddenDateInput(name, value, disabled);

  const renderCalendarContent = () => (
    <CalendarPrimitive.AnimatedGrid
      displayDate={displayDate}
      value={value}
      highlightedDate={highlightedDate}
      minDate={minDate}
      maxDate={maxDate}
      onDateSelect={handleDateSelect}
      onDateHighlight={handleDateHighlight}
      getDayButtonId={getDayButtonId}
      gridTabIndex={gridTabIndex}
      onGridKeyDown={isInline ? handleCalendarKeyDown : undefined}
      navigationDirection={navigationDirection}
      yearNavigationDirection={yearNavigationDirection}
      readOnly={readOnly}
      disabled={disabled}
    />
  );

  if (isInline) {
    const sizeConfig = CALENDAR_SIZE_PRESETS[size];
    const width = portalWidth || `${sizeConfig.width}px`;
    return (
      <div
        className="calendar-container-inline"
        style={{
          width: width,
          maxWidth: '100%',
        }}
      >
        {hiddenDateInput}
        <CalendarHeader
          displayDate={displayDate}
          onNavigatePrev={handleNavigatePrev}
          onNavigateNext={handleNavigateNext}
          onMonthChange={handleMonthChange}
          onYearChange={handleYearChange}
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          renderMonthSelect={renderInlineHeaderSelect}
          renderYearSelect={renderInlineHeaderSelect}
        />
        {renderCalendarContent()}
      </div>
    );
  }

  return (
    <>
      {children ? (
        <>
          {hiddenDateInput}
          <CalendarPrimitive.Trigger id={id}>
            {children}
          </CalendarPrimitive.Trigger>
        </>
      ) : (
        <CalendarPrimitive.Button
          value={value}
          id={id}
          name={name}
          placeholder={placeholder}
          inputClassName={inputClassName}
          label={label}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          readOnly={readOnly}
          disabled={disabled}
        />
      )}

      <CalendarPrimitive.Portal>
        <CalendarHeader
          displayDate={displayDate}
          onNavigatePrev={handleNavigatePrev}
          onNavigateNext={handleNavigateNext}
          onMonthChange={handleMonthChange}
          onYearChange={handleYearChange}
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          renderMonthSelect={renderPortalHeaderSelect}
          renderYearSelect={renderPortalHeaderSelect}
        />
        {renderCalendarContent()}
      </CalendarPrimitive.Portal>
    </>
  );
};

export const PharmaCalendar: React.FC<CalendarProps> = ({
  id,
  name,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  mode = 'datepicker',
  size = 'md',
  trigger,
  value,
  onChange,
  label,
  inputClassName,
  placeholder,
  minDate,
  maxDate,
  portalWidth,
  readOnly,
  disabled,
  children,
}) => {
  return (
    <CalendarPrimitive.Root
      mode={mode}
      size={size}
      trigger={trigger}
      value={value}
      onChange={onChange}
      minDate={minDate}
      maxDate={maxDate}
      portalWidth={portalWidth}
      readOnly={readOnly}
      disabled={disabled}
    >
      <PharmaCalendarContent
        id={id}
        name={name}
        label={label}
        inputClassName={inputClassName}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
      >
        {children}
      </PharmaCalendarContent>
    </CalendarPrimitive.Root>
  );
};

export const Calendar = PharmaCalendar;
export default PharmaCalendar;
