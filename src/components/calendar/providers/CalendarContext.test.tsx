import { act, fireEvent, render, screen } from '@testing-library/react';
import { useCalendarContext } from '../hooks/useCalendarContext';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarProvider } from './CalendarContext';

const calendarStateStore = vi.hoisted(() => ({
  isOpen: false,
  isClosing: false,
  isOpening: false,
  openCalendar: vi.fn(),
  closeCalendar: vi.fn(),
  setIsOpening: vi.fn(),
}));
const calendarStateArgsStore = vi.hoisted(
  () =>
    ({
      current: null as {
        onOpen?: () => void;
        onClose?: () => void;
      } | null,
    }) satisfies {
      current: { onOpen?: () => void; onClose?: () => void } | null;
    }
);

const calendarPositionStore = vi.hoisted(() => ({
  portalStyle: { left: '10px', top: '20px' },
  isPositionReady: true,
  dropDirection: 'down' as const,
  calculatePosition: vi.fn(),
}));

const calendarNavigationStore = vi.hoisted(() => ({
  navigateViewDate: vi.fn(),
  navigateYear: vi.fn(),
}));

const calendarHoverStore = vi.hoisted(() => ({
  handleTriggerMouseEnter: vi.fn(),
  handleTriggerMouseLeave: vi.fn(),
  handleCalendarMouseEnter: vi.fn(),
  handleCalendarMouseLeave: vi.fn(),
}));

const calendarKeyboardStore = vi.hoisted(() => ({
  handleInputKeyDown: vi.fn(),
  handleCalendarKeyDown: vi.fn(),
}));

vi.mock('../hooks/useCalendarState', () => ({
  useCalendarState: (args: { onOpen?: () => void; onClose?: () => void }) => {
    calendarStateArgsStore.current = args;
    return calendarStateStore;
  },
}));

vi.mock('../hooks/useCalendarPosition', () => ({
  useCalendarPosition: () => calendarPositionStore,
}));

vi.mock('../hooks/useCalendarNavigation', () => ({
  useCalendarNavigation: () => calendarNavigationStore,
}));

vi.mock('../hooks/useCalendarHover', () => ({
  useCalendarHover: ({
    openCalendar,
    closeCalendar,
  }: {
    openCalendar: () => void;
    closeCalendar: () => void;
  }) => ({
    handleTriggerMouseEnter: () => {
      calendarHoverStore.handleTriggerMouseEnter();
      openCalendar();
    },
    handleTriggerMouseLeave: () => {
      calendarHoverStore.handleTriggerMouseLeave();
      closeCalendar();
    },
    handleCalendarMouseEnter: calendarHoverStore.handleCalendarMouseEnter,
    handleCalendarMouseLeave: calendarHoverStore.handleCalendarMouseLeave,
  }),
}));

vi.mock('../hooks/useCalendarKeyboard', () => ({
  useCalendarKeyboard: () => calendarKeyboardStore,
}));

const Probe = () => {
  const ctx = useCalendarContext();

  return (
    <div>
      <input
        data-testid="trigger-input"
        ref={node => {
          if (node) {
            // eslint-disable-next-line react-hooks/immutability
            ctx.triggerInputRef.current = node;
          }
        }}
      />
      <div
        data-testid="portal-content"
        ref={node => {
          if (node) {
            // eslint-disable-next-line react-hooks/immutability
            ctx.portalContentRef.current = node;
          }
        }}
      />

      <button type="button" onClick={ctx.handleTriggerClick}>
        trigger-click
      </button>
      <button
        type="button"
        onClick={() => ctx.handleDateSelect(new Date(2026, 1, 8))}
      >
        select-date
      </button>
      <button type="button" onClick={() => ctx.handleMonthSelect(3)}>
        select-month
      </button>
      <button type="button" onClick={() => ctx.handleYearSelect(2026)}>
        select-year
      </button>
      <button type="button" onClick={() => ctx.navigateViewDate('next')}>
        navigate-view
      </button>
      <button
        type="button"
        onClick={() => ctx.navigateYearWithAnimation('next')}
      >
        navigate-year-animated
      </button>
      <button type="button" onClick={() => ctx.triggerYearAnimation('prev')}>
        trigger-year-animation
      </button>
      <button type="button" onClick={() => ctx.triggerMonthAnimation('prev')}>
        trigger-month-animation
      </button>
      <button type="button" onClick={ctx.handleTriggerMouseEnter}>
        trigger-hover-enter
      </button>
      <button type="button" onClick={ctx.handleTriggerMouseLeave}>
        trigger-hover-leave
      </button>
      <button type="button" onClick={() => ctx.handleMonthSelect(0)}>
        select-month-same
      </button>

      <div data-testid="is-open">{String(ctx.isOpen)}</div>
      <div data-testid="is-closing">{String(ctx.isClosing)}</div>
      <div data-testid="is-opening">{String(ctx.isOpening)}</div>
      <div data-testid="current-view">{ctx.currentView}</div>
      <div data-testid="highlighted-month">{String(ctx.highlightedMonth)}</div>
      <div data-testid="highlighted-date-day">
        {ctx.highlightedDate ? String(ctx.highlightedDate.getDate()) : 'null'}
      </div>
      <div data-testid="nav-direction">{ctx.navigationDirection ?? 'null'}</div>
      <div data-testid="year-nav-direction">
        {ctx.yearNavigationDirection ?? 'null'}
      </div>
    </div>
  );
};

const renderProvider = (
  props: { mode?: 'datepicker' | 'inline'; readOnly?: boolean } = {}
) => {
  const onChange = vi.fn();

  render(
    <CalendarProvider
      value={new Date('2026-01-15T00:00:00.000Z')}
      onChange={onChange}
      mode={props.mode}
      readOnly={props.readOnly}
    >
      <Probe />
    </CalendarProvider>
  );

  return { onChange };
};

describe('CalendarProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    calendarStateStore.isOpen = false;
    calendarStateStore.isClosing = false;
    calendarStateStore.isOpening = false;
    calendarPositionStore.isPositionReady = true;
    calendarStateArgsStore.current = null;

    calendarStateStore.openCalendar.mockReset();
    calendarStateStore.closeCalendar.mockReset();
    calendarStateStore.setIsOpening.mockReset();

    calendarPositionStore.calculatePosition.mockReset();
    calendarNavigationStore.navigateViewDate.mockReset();
    calendarNavigationStore.navigateYear.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('opens calendar and calculates position from trigger click when closed', () => {
    renderProvider();

    fireEvent.click(screen.getByRole('button', { name: 'trigger-click' }));

    expect(calendarStateStore.openCalendar).toHaveBeenCalledTimes(1);
    expect(calendarPositionStore.calculatePosition).toHaveBeenCalledTimes(1);
  });

  it('executes onOpen/onClose callbacks from calendar state hook', () => {
    renderProvider();

    act(() => {
      calendarStateArgsStore.current?.onOpen?.();
    });
    expect(screen.getByTestId('current-view')).toHaveTextContent('days');
    expect(screen.getByTestId('highlighted-month')).toHaveTextContent('null');

    act(() => {
      calendarStateArgsStore.current?.onClose?.();
    });
    expect(screen.getByTestId('highlighted-date-day')).toHaveTextContent(
      'null'
    );
  });

  it('closes calendar from trigger click when already open', () => {
    calendarStateStore.isOpen = true;

    renderProvider();

    fireEvent.click(screen.getByRole('button', { name: 'trigger-click' }));

    expect(calendarStateStore.closeCalendar).toHaveBeenCalledTimes(1);
  });

  it('handles date/month/year selection and animation wrappers', () => {
    const { onChange } = renderProvider();

    const triggerInput = screen.getByTestId(
      'trigger-input'
    ) as HTMLInputElement;
    const focusSpy = vi
      .spyOn(triggerInput, 'focus')
      .mockImplementation(() => undefined);

    fireEvent.click(screen.getByRole('button', { name: 'select-date' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const selectedDate = onChange.mock.calls[0][0] as Date;
    expect(selectedDate.getFullYear()).toBe(2026);
    expect(selectedDate.getMonth()).toBe(1);
    expect(selectedDate.getDate()).toBe(8);
    expect(selectedDate.getHours()).toBe(12);
    expect(calendarStateStore.closeCalendar).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(focusSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'select-month' }));
    expect(screen.getByTestId('current-view')).toHaveTextContent('days');
    expect(calendarPositionStore.calculatePosition).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'select-month-same' }));
    expect(screen.getByTestId('highlighted-date-day')).toHaveTextContent('15');

    fireEvent.click(screen.getByRole('button', { name: 'select-year' }));
    expect(screen.getByTestId('current-view')).toHaveTextContent('months');
    expect(screen.getByTestId('highlighted-month')).toHaveTextContent('0');

    fireEvent.click(screen.getByRole('button', { name: 'navigate-view' }));
    expect(calendarNavigationStore.navigateViewDate).toHaveBeenCalledWith(
      'next'
    );
    expect(screen.getByTestId('nav-direction')).toHaveTextContent('next');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('nav-direction')).toHaveTextContent('null');

    fireEvent.click(
      screen.getByRole('button', { name: 'navigate-year-animated' })
    );
    expect(calendarNavigationStore.navigateYear).toHaveBeenCalledWith('next');
    expect(screen.getByTestId('year-nav-direction')).toHaveTextContent('next');

    fireEvent.click(
      screen.getByRole('button', { name: 'trigger-year-animation' })
    );
    expect(screen.getByTestId('year-nav-direction')).toHaveTextContent('prev');

    fireEvent.click(
      screen.getByRole('button', { name: 'trigger-month-animation' })
    );
    expect(screen.getByTestId('nav-direction')).toHaveTextContent('prev');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('year-nav-direction')).toHaveTextContent('null');
  });

  it('routes hover handlers through open/close wrapper callbacks', () => {
    renderProvider();

    fireEvent.click(
      screen.getByRole('button', { name: 'trigger-hover-enter' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'trigger-hover-leave' })
    );

    expect(calendarHoverStore.handleTriggerMouseEnter).toHaveBeenCalledTimes(1);
    expect(calendarHoverStore.handleTriggerMouseLeave).toHaveBeenCalledTimes(1);
    expect(calendarStateStore.openCalendar).toHaveBeenCalled();
    expect(calendarStateStore.closeCalendar).toHaveBeenCalled();
  });

  it('runs opening timer effect and handles click-outside close rules', () => {
    calendarStateStore.isOpen = true;
    calendarStateStore.isOpening = true;

    renderProvider();

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(calendarStateStore.setIsOpening).toHaveBeenCalledWith(false);

    const triggerInput = screen.getByTestId('trigger-input');
    const portalContent = screen.getByTestId('portal-content');

    fireEvent.mouseDown(triggerInput);
    fireEvent.mouseDown(portalContent);

    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    document.body.appendChild(menu);
    fireEvent.mouseDown(menu);

    expect(calendarStateStore.closeCalendar).not.toHaveBeenCalled();

    fireEvent.mouseDown(document.body);
    expect(calendarStateStore.closeCalendar).toHaveBeenCalledTimes(1);
  });

  it('uses inline and readOnly behavior without closing on date selection', () => {
    const { onChange } = renderProvider({ mode: 'inline', readOnly: true });

    expect(screen.getByTestId('is-open')).toHaveTextContent('true');
    expect(screen.getByTestId('is-closing')).toHaveTextContent('false');
    expect(screen.getByTestId('is-opening')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'select-date' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(calendarStateStore.closeCalendar).not.toHaveBeenCalled();
    expect(calendarPositionStore.calculatePosition).not.toHaveBeenCalled();
  });
});
