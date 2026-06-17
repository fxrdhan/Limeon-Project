import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import Switch from '.';

describe('Switch', () => {
  it('calls onChange with the next checked state when enabled', () => {
    const onChange = vi.fn();

    render(<Switch checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('uses native disabled behavior and does not call onChange when disabled', () => {
    const onChange = vi.fn();

    render(<Switch checked={false} disabled onChange={onChange} />);

    const switchButton = screen.getByRole('switch');

    expect(switchButton).toBeInstanceOf(HTMLButtonElement);
    expect((switchButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(switchButton);

    expect(onChange).not.toHaveBeenCalled();
  });
});
