import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DaysGrid from './DaysGrid';

const useCalendarContextMock = vi.hoisted(() => vi.fn());
const capturedMotionProps = vi.hoisted(
  () =>
    ({
      current: null as Record<string, unknown> | null,
    }) as { current: Record<string, unknown> | null }
);

vi.mock('../hooks', () => ({
  useCalendarContext: useCalendarContextMock,
}));

vi.mock('motion/react', async () => {
  const react = await vi.importActual<typeof import('react')>('react');
  const createMotionComponent = (tag: string) =>
    react.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) => {
        if (tag === 'div') capturedMotionProps.current = props;
        return react.createElement(tag, { ...props, ref }, children);
      }
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
    capturedMotionProps.current = null;
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

  it('applies month/year animation direction branches and today styling', () => {
    useCalendarContextMock.mockReturnValue({
      navigationDirection: 'prev',
      yearNavigationDirection: null,
      readOnly: false,
    });

    const today = new Date();
    render(
      <DaysGrid
        displayDate={new Date(today.getFullYear(), today.getMonth(), 1)}
        onDateSelect={vi.fn()}
        onDateHighlight={vi.fn()}
        animated={true}
      />
    );

    expect(capturedMotionProps.current?.initial).toEqual({ x: '-100%', y: 0 });
    expect(capturedMotionProps.current?.exit).toEqual({ x: '100%', y: 0 });
    expect(
      screen.getByRole('button', { name: String(today.getDate()) })
    ).toHaveClass('calendar__day-button--today');
  });

  it('uses neutral animation values when no navigation direction is active', () => {
    useCalendarContextMock.mockReturnValue({
      navigationDirection: null,
      yearNavigationDirection: null,
      readOnly: false,
    });

    render(
      <DaysGrid
        displayDate={new Date(2026, 0, 1)}
        onDateSelect={vi.fn()}
        onDateHighlight={vi.fn()}
        animated={true}
      />
    );

    expect(capturedMotionProps.current?.initial).toBe(false);
    expect(capturedMotionProps.current?.exit).toEqual({ x: 0, y: 0 });
  });

  it('covers remaining animation direction branches for year prev and month next', () => {
    useCalendarContextMock.mockReturnValue({
      navigationDirection: 'next',
      yearNavigationDirection: 'prev',
      readOnly: false,
    });

    const { rerender } = render(
      <DaysGrid
        displayDate={new Date(2026, 0, 1)}
        onDateSelect={vi.fn()}
        onDateHighlight={vi.fn()}
        animated={true}
      />
    );

    expect(capturedMotionProps.current?.initial).toEqual({ y: '-100%', x: 0 });
    expect(capturedMotionProps.current?.exit).toEqual({ y: '100%', x: 0 });

    useCalendarContextMock.mockReturnValue({
      navigationDirection: 'next',
      yearNavigationDirection: null,
      readOnly: false,
    });
    rerender(
      <DaysGrid
        displayDate={new Date(2026, 0, 1)}
        onDateSelect={vi.fn()}
        onDateHighlight={vi.fn()}
        animated={true}
      />
    );
    expect(capturedMotionProps.current?.initial).toEqual({ x: '100%', y: 0 });
    expect(capturedMotionProps.current?.exit).toEqual({ x: '-100%', y: 0 });

    useCalendarContextMock.mockReturnValue({
      navigationDirection: 'idle' as unknown as 'next',
      yearNavigationDirection: null,
      readOnly: false,
    });
    rerender(
      <DaysGrid
        displayDate={new Date(2026, 0, 1)}
        onDateSelect={vi.fn()}
        onDateHighlight={vi.fn()}
        animated={true}
      />
    );
    expect(capturedMotionProps.current?.initial).toEqual({ x: 0, y: 0 });
  });
});
