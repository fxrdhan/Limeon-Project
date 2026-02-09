import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarPortal from './CalendarPortal';

const useCalendarContextMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks', () => ({
  useCalendarContext: useCalendarContextMock,
}));

describe('CalendarPortal', () => {
  beforeEach(() => {
    useCalendarContextMock.mockReset();
  });

  it('returns null when closed or position is not ready', () => {
    useCalendarContextMock.mockReturnValue({
      isOpen: false,
      isClosing: false,
      isOpening: false,
      isPositionReady: true,
    });

    const { rerender, container } = render(
      <CalendarPortal>
        <div>content</div>
      </CalendarPortal>
    );

    expect(container.firstChild).toBeNull();

    useCalendarContextMock.mockReturnValue({
      isOpen: true,
      isClosing: false,
      isOpening: false,
      isPositionReady: false,
    });

    rerender(
      <CalendarPortal>
        <div>content</div>
      </CalendarPortal>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders portal with drop direction classes and hover handlers', () => {
    const handleCalendarKeyDown = vi.fn();
    const handleCalendarMouseEnter = vi.fn();
    const handleCalendarMouseLeave = vi.fn();

    useCalendarContextMock.mockReturnValue({
      isOpen: true,
      isClosing: false,
      isOpening: true,
      isPositionReady: true,
      portalStyle: { top: '120px', left: '240px' },
      dropDirection: 'up',
      portalContentRef: { current: null },
      handleCalendarKeyDown,
      handleCalendarMouseEnter,
      handleCalendarMouseLeave,
      trigger: 'hover',
    });

    render(
      <CalendarPortal>
        <div>calendar-content</div>
      </CalendarPortal>
    );

    const portal = screen
      .getByText('calendar-content')
      .closest('.calendar__container');
    expect(portal).toHaveClass(
      'calendar__container',
      'calendar__container--drop-up',
      'calendar__container--opening'
    );
    expect(portal).toHaveStyle({ top: '120px', left: '240px' });

    fireEvent.keyDown(portal!, { key: 'Escape' });
    fireEvent.mouseEnter(portal!);
    fireEvent.mouseLeave(portal!);

    expect(handleCalendarKeyDown).toHaveBeenCalledTimes(1);
    expect(handleCalendarMouseEnter).toHaveBeenCalledTimes(1);
    expect(handleCalendarMouseLeave).toHaveBeenCalledTimes(1);
  });
});
