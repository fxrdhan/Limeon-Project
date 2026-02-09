import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SmartInput from './index';

describe('SmartInput', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders label, custom class, and error message', () => {
    render(
      <SmartInput
        fieldName="name"
        value="Paracetamol"
        onChange={vi.fn()}
        label="Nama Obat"
        error="Wajib diisi"
        className="custom-input"
      />
    );

    expect(screen.getByText('Nama Obat')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Paracetamol')).toHaveClass('custom-input');
    expect(screen.getByText('Wajib diisi')).toBeInTheDocument();
  });

  it('delegates focus, blur, and change events to both form sync and external handlers', async () => {
    const onChange = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const fieldHandlers = {
      onFocus: vi.fn(),
      onBlur: vi.fn(),
      onChange: vi.fn(),
    };
    const smartFormSync = {
      getFieldHandlers: vi.fn(() => fieldHandlers),
      hasPendingUpdate: vi.fn(() => false),
    };

    render(
      <SmartInput
        fieldName="name"
        value="Awal"
        onChange={onChange}
        smartFormSync={smartFormSync}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    );

    const user = userEvent.setup();
    const input = screen.getByDisplayValue('Awal');
    await user.click(input);
    fireEvent.change(input, { target: { value: 'Baru' } });
    await user.tab();

    expect(smartFormSync.getFieldHandlers).toHaveBeenCalledWith('name');
    expect(fieldHandlers.onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByDisplayValue('Baru')).toBeInTheDocument();
  });

  it('keeps local value while focused and syncs prop value after blur', () => {
    const { rerender } = render(
      <SmartInput fieldName="name" value="A" onChange={vi.fn()} />
    );

    const input = screen.getByDisplayValue('A');
    fireEvent.focus(input);

    rerender(<SmartInput fieldName="name" value="B" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('A')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'A-edit' } });
    expect(screen.getByDisplayValue('A-edit')).toBeInTheDocument();

    fireEvent.blur(input);
    rerender(<SmartInput fieldName="name" value="B" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('B')).toBeInTheDocument();
  });
});
