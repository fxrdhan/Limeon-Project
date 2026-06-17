import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import Checkbox from '.';

describe('Checkbox', () => {
  it('keeps the input accessible by its visible label', () => {
    render(
      <Checkbox
        label="Memiliki tanggal kadaluarsa"
        checked={false}
        onChange={vi.fn()}
      />
    );

    const input = screen.getByLabelText('Memiliki tanggal kadaluarsa');

    expect(input).toBeInstanceOf(HTMLInputElement);
    expect((input as HTMLInputElement).type).toBe('checkbox');
  });

  it('preserves Enter keyboard toggling on the wrapper label', () => {
    const onChange = vi.fn();

    render(
      <Checkbox
        label="Memiliki tanggal kadaluarsa"
        checked={false}
        onChange={onChange}
        tabIndex={3}
      />
    );

    const label = screen
      .getByText('Memiliki tanggal kadaluarsa')
      .closest('label');

    expect(label).toBeInstanceOf(HTMLLabelElement);

    fireEvent.keyDown(label as HTMLLabelElement, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not toggle from keyboard while disabled', () => {
    const onChange = vi.fn();

    render(
      <Checkbox
        label="Memiliki tanggal kadaluarsa"
        checked={false}
        onChange={onChange}
        disabled
        tabIndex={3}
      />
    );

    const label = screen
      .getByText('Memiliki tanggal kadaluarsa')
      .closest('label');

    fireEvent.keyDown(label as HTMLLabelElement, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });
});
