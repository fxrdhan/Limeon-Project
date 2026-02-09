import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Switch from './index';

describe('Switch', () => {
  it('renders checked state and toggles to unchecked value on click', () => {
    const onChange = vi.fn();
    render(<Switch checked={true} onChange={onChange} id="switch-id" />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toHaveClass('bg-primary');
    expect(toggle).toHaveAttribute('id', 'switch-id');

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('does not trigger onChange when disabled', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} disabled={true} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-disabled', 'true');
    expect(toggle).toHaveClass('cursor-not-allowed');

    fireEvent.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies small size classes and custom class name', () => {
    render(
      <Switch
        checked={false}
        onChange={vi.fn()}
        size="small"
        className="custom-switch"
      />
    );

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveClass('w-8', 'h-4', 'custom-switch');

    const thumb = toggle.querySelector('span');
    expect(thumb).toHaveClass('h-3', 'w-3', 'translate-x-0');
  });
});
