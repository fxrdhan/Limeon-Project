import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VatPercentageEditor from './VatPercentageEditor';

describe('VatPercentageEditor', () => {
  it('enters edit mode and caps value at 100 on blur', () => {
    const onVatPercentageChange = vi.fn();
    render(
      <VatPercentageEditor
        vatPercentage={11}
        onVatPercentageChange={onVatPercentageChange}
      />
    );

    fireEvent.click(screen.getByText('11%'));

    const input = screen.getByDisplayValue('11');
    fireEvent.change(input, { target: { value: '120' } });
    fireEvent.blur(input);

    expect(onVatPercentageChange).toHaveBeenCalledWith(100);
  });

  it('commits value with Enter and Escape keys', () => {
    const onVatPercentageChange = vi.fn();
    render(
      <VatPercentageEditor
        vatPercentage={5}
        onVatPercentageChange={onVatPercentageChange}
      />
    );

    fireEvent.click(screen.getByText('5%'));
    const firstInput = screen.getByDisplayValue('5');
    fireEvent.change(firstInput, { target: { value: '15' } });
    fireEvent.keyDown(firstInput, { key: 'Enter' });

    fireEvent.click(screen.getByText('5%'));
    const secondInput = screen.getByDisplayValue('5');
    fireEvent.change(secondInput, { target: { value: '25' } });
    fireEvent.keyDown(secondInput, { key: 'Escape' });

    expect(onVatPercentageChange).toHaveBeenNthCalledWith(1, 15);
    expect(onVatPercentageChange).toHaveBeenNthCalledWith(2, 25);
  });

  it('ignores invalid numeric input', () => {
    const onVatPercentageChange = vi.fn();
    render(
      <VatPercentageEditor
        vatPercentage={10}
        onVatPercentageChange={onVatPercentageChange}
      />
    );

    fireEvent.click(screen.getByText('10%'));
    const input = screen.getByDisplayValue('10');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(onVatPercentageChange).not.toHaveBeenCalled();
  });

  it('ignores unrelated keys while editing', () => {
    const onVatPercentageChange = vi.fn();
    render(
      <VatPercentageEditor
        vatPercentage={8}
        onVatPercentageChange={onVatPercentageChange}
      />
    );

    fireEvent.click(screen.getByText('8%'));
    const input = screen.getByDisplayValue('8');
    fireEvent.keyDown(input, { key: 'Tab' });

    expect(onVatPercentageChange).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('8')).toBeInTheDocument();
  });
});
