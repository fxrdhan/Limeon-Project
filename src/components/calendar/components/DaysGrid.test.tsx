import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DaysGrid from './DaysGrid';

const useCalendarContextMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks', () => ({
  useCalendarContext: useCalendarContextMock,
}));

vi.mock('motion/react', async () => {
  const react = await vi.importActual<typeof import('react')>('react');
  const createMotionComponent = (tag: string) =>
    react.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) =>
        react.createElement(tag, { ...props, ref }, children)
    );

  return {
    AnimatePresence: ({ children }: { children: ReactNode }) =>
      react.createElement(react.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(String(tag)),
      }
    ),
  };
});

describe('DaysGrid', () => {
  beforeEach(() => {
    useCalendarContextMock.mockReset();
    useCalendarContextMock.mockReturnValue({
      navigationDirection: 'next',
      yearNavigationDirection: null,
      readOnly: false,
    });
  });

  it('renders static grid, applies day states, and handles interactions', () => {
    const onDateSelect = vi.fn();
    const onDateHighlight = vi.fn();
    const displayDate = new Date(2026, 1, 1);

    render(
      <DaysGrid
        displayDate={displayDate}
        value={new Date(2026, 1, 5)}
        highlightedDate={new Date(2026, 1, 6)}
        minDate={new Date(2026, 1, 3)}
        maxDate={new Date(2026, 1, 27)}
        onDateSelect={onDateSelect}
        onDateHighlight={onDateHighlight}
        animated={false}
      />
    );

    expect(screen.getByText('Sen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toHaveClass(
      'calendar__day-button--selected'
    );
    expect(screen.getByRole('button', { name: '6' })).toHaveClass(
      'calendar__day-button--highlighted'
    );
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.mouseEnter(screen.getByRole('button', { name: '6' }));
    fireEvent.mouseLeave(screen.getByRole('button', { name: '6' }));

    expect(onDateSelect).toHaveBeenCalledTimes(1);
    expect(onDateHighlight).toHaveBeenCalledTimes(2);
    expect(onDateHighlight).toHaveBeenLastCalledWith(null);
  });

  it('renders animated grid and blocks interactions in read-only mode', () => {
    useCalendarContextMock.mockReturnValue({
      navigationDirection: 'prev',
      yearNavigationDirection: 'next',
      readOnly: true,
    });

    const onDateSelect = vi.fn();
    const onDateHighlight = vi.fn();

    render(
      <DaysGrid
        displayDate={new Date(2026, 1, 1)}
        value={new Date(2026, 1, 5)}
        highlightedDate={new Date(2026, 1, 6)}
        onDateSelect={onDateSelect}
        onDateHighlight={onDateHighlight}
        animated={true}
      />
    );

    expect(screen.getByText('Sen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).not.toHaveClass(
      'calendar__day-button--selected'
    );

    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.mouseEnter(screen.getByRole('button', { name: '6' }));

    expect(onDateSelect).not.toHaveBeenCalled();
    expect(onDateHighlight).not.toHaveBeenCalled();
  });
});
