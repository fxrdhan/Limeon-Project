import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DateTimeDisplay from './index';

vi.mock('@/components/calendar', () => ({
  default: ({
    children,
    onChange,
  }: {
    children: ReactNode;
    onChange: (value: Date | null) => void;
  }) => (
    <div>
      <button
        data-testid="calendar-change"
        onClick={() => onChange(new Date('2026-01-03T00:00:00'))}
      >
        change-date
      </button>
      {children}
    </div>
  ),
}));

describe('DateTimeDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 24h clock and toggles to 12h/24h format', () => {
    vi.setSystemTime(new Date('2026-01-02T13:05:06'));
    render(<DateTimeDisplay />);

    expect(screen.getByText('24h')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText('05')).toBeInTheDocument();
    expect(screen.getByText('06')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Click to switch to 12-hour format'));
    expect(screen.getByText('12h')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('PM')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Click to switch to 24-hour format'));
    expect(screen.getByText('24h')).toBeInTheDocument();
  });

  it('handles midnight AM format and updates on timer ticks', () => {
    vi.setSystemTime(new Date('2026-01-02T00:00:00'));
    render(<DateTimeDisplay />);

    fireEvent.click(screen.getByTitle('Click to switch to 12-hour format'));
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('AM')).toBeInTheDocument();

    act(() => {
      vi.setSystemTime(new Date('2026-01-02T00:00:01'));
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('02')).toBeInTheDocument();
  });

  it('accepts calendar date updates', () => {
    vi.setSystemTime(new Date('2026-01-02T20:10:30'));
    render(<DateTimeDisplay />);

    fireEvent.click(screen.getByTestId('calendar-change'));

    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('24h')).toBeInTheDocument();
  });

  it('keeps 12 as noon in 12-hour mode', () => {
    vi.setSystemTime(new Date('2026-01-02T12:10:00'));
    render(<DateTimeDisplay />);

    fireEvent.click(screen.getByTitle('Click to switch to 12-hour format'));
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('PM')).toBeInTheDocument();
  });
});
