import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FefoTooltip from './FefoTooltip';

const mockRect: DOMRect = {
  x: 50,
  y: 100,
  width: 20,
  height: 14,
  top: 100,
  right: 70,
  bottom: 114,
  left: 50,
  toJSON: () => ({}),
};

describe('FefoTooltip', () => {
  it('shows and hides default tooltip text on hover', () => {
    const { container } = render(<FefoTooltip />);
    const iconContainer =
      container.querySelector('.cursor-help')?.parentElement;

    expect(iconContainer).toBeTruthy();
    if (!iconContainer) return;

    iconContainer.getBoundingClientRect = () => mockRect;

    fireEvent.mouseEnter(iconContainer);
    const tooltip = screen.getByText(
      /First Expired First Out: Barang dengan tanggal kadaluarsa terdekat/i
    );

    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveStyle({
      top: '90px',
      left: '60px',
    });

    fireEvent.mouseLeave(iconContainer);
    expect(tooltip).not.toBeInTheDocument();
  });

  it('renders custom tooltip text', () => {
    const customText = 'Gunakan batch paling dekat expired terlebih dulu.';
    const { container } = render(<FefoTooltip tooltipText={customText} />);
    const iconContainer =
      container.querySelector('.cursor-help')?.parentElement;

    expect(iconContainer).toBeTruthy();
    if (!iconContainer) return;

    iconContainer.getBoundingClientRect = () => mockRect;
    fireEvent.mouseEnter(iconContainer);

    expect(screen.getByText(customText)).toBeInTheDocument();
  });
});
