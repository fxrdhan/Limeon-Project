import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarButton from './CalendarButton';

const useCalendarContextMock = vi.hoisted(() => vi.fn());
const inputMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks', () => ({
  useCalendarContext: useCalendarContextMock,
}));

vi.mock('@/components/input', () => ({
  default: (props: Record<string, unknown>) => {
    inputMock(props);
    return (
      <input
        data-testid="calendar-input"
        value={String(props.value ?? '')}
        readOnly
      />
    );
  },
}));

describe('CalendarButton', () => {
  beforeEach(() => {
    useCalendarContextMock.mockReset();
    inputMock.mockReset();
    useCalendarContextMock.mockReturnValue({
      triggerInputRef: { current: null },
      handleTriggerClick: vi.fn(),
      handleInputKeyDown: vi.fn(),
      handleTriggerMouseEnter: vi.fn(),
      handleTriggerMouseLeave: vi.fn(),
      trigger: 'click',
    });
  });

  it('renders label and formatted value, and handles click trigger', () => {
    const handleTriggerClick = vi.fn();
    const handleInputKeyDown = vi.fn();

    useCalendarContextMock.mockReturnValue({
      triggerInputRef: { current: null },
      handleTriggerClick,
      handleInputKeyDown,
      handleTriggerMouseEnter: vi.fn(),
      handleTriggerMouseLeave: vi.fn(),
      trigger: 'click',
    });

    render(
      <CalendarButton
        value={new Date('2026-02-08T00:00:00.000Z')}
        label="Tanggal"
        placeholder="Pilih tanggal"
        inputClassName="custom-input"
      />
    );

    expect(screen.getByText('Tanggal')).toBeInTheDocument();
    expect(inputMock).toHaveBeenCalledWith(
      expect.objectContaining({
        placeholder: 'Pilih tanggal',
        className: expect.stringContaining('custom-input'),
      })
    );

    const wrapper = screen.getByText('Tanggal')
      .nextElementSibling as HTMLElement;
    fireEvent.click(wrapper);
    fireEvent.keyDown(wrapper, { key: 'Enter' });

    expect(handleTriggerClick).toHaveBeenCalledTimes(1);
    expect(handleInputKeyDown).toHaveBeenCalledTimes(1);
  });

  it('handles hover trigger and empty value formatting', () => {
    const handleTriggerMouseEnter = vi.fn();
    const handleTriggerMouseLeave = vi.fn();

    useCalendarContextMock.mockReturnValue({
      triggerInputRef: { current: null },
      handleTriggerClick: vi.fn(),
      handleInputKeyDown: vi.fn(),
      handleTriggerMouseEnter,
      handleTriggerMouseLeave,
      trigger: 'hover',
    });

    render(<CalendarButton value={null} />);

    const input = screen.getByTestId('calendar-input');
    expect(input).toHaveValue('');

    const wrapper = input.closest(
      '.calendar__button-input-wrapper'
    ) as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseLeave(wrapper);

    expect(handleTriggerMouseEnter).toHaveBeenCalledTimes(1);
    expect(handleTriggerMouseLeave).toHaveBeenCalledTimes(1);
  });
});
