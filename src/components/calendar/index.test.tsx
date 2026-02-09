import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Calendar from './index';

const providerPropsRef = vi.hoisted(() => ({
  current: null as null | Record<string, unknown>,
}));
const useCalendarContextMock = vi.hoisted(() => vi.fn());
const calendarButtonMock = vi.hoisted(() => vi.fn());
const daysGridMock = vi.hoisted(() => vi.fn());

vi.mock('./providers', () => ({
  CalendarProvider: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => {
    providerPropsRef.current = props;
    return <div data-testid="calendar-provider">{children}</div>;
  },
}));

vi.mock('./hooks', () => ({
  useCalendarContext: useCalendarContextMock,
}));

vi.mock('./components', () => ({
  CalendarButton: (props: Record<string, unknown>) => {
    calendarButtonMock(props);
    return <div data-testid="calendar-button">button</div>;
  },
  CalendarPortal: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="calendar-portal">{children}</div>
  ),
  CalendarHeader: ({
    onNavigatePrev,
    onNavigateNext,
    onMonthChange,
    onYearChange,
  }: {
    onNavigatePrev: () => void;
    onNavigateNext: () => void;
    onMonthChange: (month: number) => void;
    onYearChange: (year: number) => void;
  }) => (
    <div data-testid="calendar-header">
      <button type="button" onClick={onNavigatePrev}>
        prev
      </button>
      <button type="button" onClick={onNavigateNext}>
        next
      </button>
      <button type="button" onClick={() => onMonthChange(11)}>
        month
      </button>
      <button type="button" onClick={() => onYearChange(2028)}>
        year
      </button>
    </div>
  ),
  DaysGrid: (props: Record<string, unknown>) => {
    daysGridMock(props);
    return (
      <div data-testid="days-grid">
        <button
          type="button"
          onClick={() =>
            (props.onDateSelect as (date: Date) => void)(new Date(2026, 1, 20))
          }
        >
          select-day
        </button>
        <button
          type="button"
          onClick={() =>
            (props.onDateHighlight as (date: Date | null) => void)(
              new Date(2026, 1, 21)
            )
          }
        >
          highlight-day
        </button>
      </div>
    );
  },
}));

describe('Calendar', () => {
  beforeEach(() => {
    providerPropsRef.current = null;
    calendarButtonMock.mockReset();
    daysGridMock.mockReset();
    useCalendarContextMock.mockReset();
  });

  it('renders inline mode and handles month/year/navigation wrapper logic', () => {
    const navigateViewDate = vi.fn();
    const triggerYearAnimation = vi.fn();
    const triggerMonthAnimation = vi.fn();
    const handleDateSelect = vi.fn();
    const setHighlightedDate = vi.fn();
    const setDisplayDate = vi.fn();
    const calculatePosition = vi.fn();

    useCalendarContextMock.mockReturnValue({
      value: new Date(2026, 1, 8),
      displayDate: new Date(2026, 0, 8),
      highlightedDate: null,
      minDate: new Date(2026, 0, 1),
      maxDate: new Date(2026, 11, 31),
      size: 'md',
      trigger: 'hover',
      navigateViewDate,
      triggerYearAnimation,
      triggerMonthAnimation,
      handleDateSelect,
      setHighlightedDate,
      setDisplayDate,
      calculatePosition,
      triggerInputRef: { current: null },
      handleTriggerClick: vi.fn(),
      handleInputKeyDown: vi.fn(),
      handleTriggerMouseEnter: vi.fn(),
      handleTriggerMouseLeave: vi.fn(),
    });

    render(
      <Calendar
        mode="inline"
        size="md"
        value={new Date(2026, 1, 8)}
        onChange={vi.fn()}
        portalWidth="400px"
      />
    );

    expect(providerPropsRef.current).toEqual(
      expect.objectContaining({
        mode: 'inline',
        trigger: 'hover',
        readOnly: false,
      })
    );

    const inlineContainer = document.querySelector(
      '.calendar-container-inline'
    );
    expect(inlineContainer).toHaveStyle({ width: '400px', minWidth: '400px' });

    fireEvent.click(screen.getByRole('button', { name: 'prev' }));
    fireEvent.click(screen.getByRole('button', { name: 'next' }));
    fireEvent.click(screen.getByRole('button', { name: 'month' }));
    fireEvent.click(screen.getByRole('button', { name: 'year' }));
    fireEvent.click(screen.getByRole('button', { name: 'select-day' }));
    fireEvent.click(screen.getByRole('button', { name: 'highlight-day' }));

    expect(navigateViewDate).toHaveBeenNthCalledWith(1, 'prev');
    expect(navigateViewDate).toHaveBeenNthCalledWith(2, 'next');
    expect(triggerMonthAnimation).toHaveBeenCalledWith('next');
    expect(triggerYearAnimation).toHaveBeenCalledWith('next');
    expect(setDisplayDate).toHaveBeenCalledTimes(2);
    expect(calculatePosition).toHaveBeenCalledTimes(2);
    expect(handleDateSelect).not.toHaveBeenCalled();
    expect(setHighlightedDate).toHaveBeenCalledTimes(1);
  });

  it('renders datepicker with default button and allows date selection', () => {
    const handleDateSelect = vi.fn();

    useCalendarContextMock.mockReturnValue({
      value: new Date(2026, 1, 8),
      displayDate: new Date(2026, 1, 8),
      highlightedDate: null,
      minDate: undefined,
      maxDate: undefined,
      size: 'md',
      trigger: 'click',
      navigateViewDate: vi.fn(),
      triggerYearAnimation: vi.fn(),
      triggerMonthAnimation: vi.fn(),
      handleDateSelect,
      setHighlightedDate: vi.fn(),
      setDisplayDate: vi.fn(),
      calculatePosition: vi.fn(),
      triggerInputRef: { current: null },
      handleTriggerClick: vi.fn(),
      handleInputKeyDown: vi.fn(),
      handleTriggerMouseEnter: vi.fn(),
      handleTriggerMouseLeave: vi.fn(),
    });

    render(
      <Calendar
        mode="datepicker"
        value={new Date(2026, 1, 8)}
        onChange={vi.fn()}
        label="Tanggal"
        placeholder="Pilih tanggal"
      />
    );

    expect(calendarButtonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Tanggal',
        placeholder: 'Pilih tanggal',
      })
    );
    expect(screen.getByTestId('calendar-portal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'select-day' }));
    expect(handleDateSelect).toHaveBeenCalledTimes(1);
  });

  it('uses hover trigger with custom children and enforces readOnly wrapper', () => {
    const handleTriggerClick = vi.fn();
    const handleTriggerMouseEnter = vi.fn();
    const handleTriggerMouseLeave = vi.fn();
    const handleInputKeyDown = vi.fn();
    const handleDateSelect = vi.fn();

    useCalendarContextMock.mockReturnValue({
      value: new Date(2026, 1, 8),
      displayDate: new Date(2026, 1, 8),
      highlightedDate: null,
      minDate: undefined,
      maxDate: undefined,
      size: 'md',
      trigger: 'hover',
      navigateViewDate: vi.fn(),
      triggerYearAnimation: vi.fn(),
      triggerMonthAnimation: vi.fn(),
      handleDateSelect,
      setHighlightedDate: vi.fn(),
      setDisplayDate: vi.fn(),
      calculatePosition: vi.fn(),
      triggerInputRef: { current: null },
      handleTriggerClick,
      handleInputKeyDown,
      handleTriggerMouseEnter,
      handleTriggerMouseLeave,
    });

    render(
      <Calendar
        mode="datepicker"
        trigger="hover"
        value={new Date()}
        onChange={vi.fn()}
      >
        <span>Open Calendar</span>
      </Calendar>
    );

    expect(providerPropsRef.current).toEqual(
      expect.objectContaining({
        trigger: 'hover',
        readOnly: true,
      })
    );

    const trigger = screen
      .getByText('Open Calendar')
      .closest('.calendar__custom-trigger');
    fireEvent.mouseEnter(trigger!);
    fireEvent.mouseLeave(trigger!);
    fireEvent.keyDown(trigger!, { key: 'Enter' });
    fireEvent.click(trigger!);
    fireEvent.click(screen.getByRole('button', { name: 'select-day' }));

    expect(handleTriggerMouseEnter).toHaveBeenCalledTimes(1);
    expect(handleTriggerMouseLeave).toHaveBeenCalledTimes(1);
    expect(handleInputKeyDown).toHaveBeenCalledTimes(1);
    expect(handleTriggerClick).not.toHaveBeenCalled();
    expect(handleDateSelect).not.toHaveBeenCalled();

    expect(daysGridMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        value: null,
      })
    );
  });
});
