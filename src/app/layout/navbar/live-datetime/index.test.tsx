import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DateTimeDisplay from './index';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
    button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('@/components/calendar', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="calendar-wrapper">{children}</div>
  ),
}));

vi.mock('react-icons/tb', () => ({
  TbSunFilled: () => <span data-testid="sun-icon">sun</span>,
  TbMoonFilled: () => <span data-testid="moon-icon">moon</span>,
  TbCalendarMonthFilled: () => (
    <span data-testid="calendar-icon">calendar</span>
  ),
}));

describe('DateTimeDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders in 24-hour mode and toggles to 12-hour mode', async () => {
    const now = new Date(2026, 1, 8, 14, 5, 7, 500);
    vi.setSystemTime(now);
    render(<DateTimeDisplay />);

    const expected24Hour = String(now.getHours()).padStart(2, '0');
    const expected12Hour = String(
      now.getHours() === 0
        ? 12
        : now.getHours() > 12
          ? now.getHours() - 12
          : now.getHours()
    ).padStart(2, '0');
    const expectedAmPm = now.getHours() >= 12 ? 'PM' : 'AM';

    expect(screen.getByText('24h')).toBeInTheDocument();
    expect(screen.getByText(expected24Hour)).toBeInTheDocument();
    expect(screen.getByText('05')).toBeInTheDocument();
    expect(screen.getByText('07')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();

    const timeContainer = screen.getByText('24h').closest('div');
    expect(timeContainer).toBeTruthy();
    fireEvent.click(timeContainer!);

    expect(screen.getByText('12h')).toBeInTheDocument();
    expect(screen.getByText(expectedAmPm)).toBeInTheDocument();
    expect(screen.getByText(expected12Hour)).toBeInTheDocument();
  });

  it('updates clock over time and switches day/night icon', async () => {
    vi.setSystemTime(new Date(2026, 1, 8, 5, 59, 59, 900));
    const { unmount } = render(<DateTimeDisplay />);
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument();

    unmount();
    vi.setSystemTime(new Date(2026, 1, 8, 6, 0, 0, 100));
    render(<DateTimeDisplay />);
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
  });
});
