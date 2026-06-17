import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import VatPercentageEditor from './VatPercentageEditor';

describe('VatPercentageEditor', () => {
  it('exposes the edit input label and preserves capped commit behavior', () => {
    const onVatPercentageChange = vi.fn();

    render(
      <VatPercentageEditor
        vatPercentage={11}
        onVatPercentageChange={onVatPercentageChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '11%' }));

    const input = screen.getByRole('spinbutton', { name: 'Persentase PPN' });

    fireEvent.change(input, { target: { value: '125' } });
    fireEvent.blur(input);

    expect(onVatPercentageChange).toHaveBeenCalledTimes(1);
    expect(onVatPercentageChange).toHaveBeenCalledWith(100);
  });
});
