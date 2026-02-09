import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CheckboxIcon } from './CheckboxIcon';
import { CheckboxInput } from './CheckboxInput';
import { CheckboxLabel } from './CheckboxLabel';

vi.mock('motion/react', async () => {
  const react = await vi.importActual<typeof import('react')>('react');
  const createMotionComponent = (tag: string) =>
    react.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) =>
        react.createElement(tag, { ...props, ref }, children)
    );

  return {
    AnimatePresence: ({ children }: { children: ReactNode }) =>
      react.createElement(react.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(String(tag)),
      }
    ),
  };
});

describe('Checkbox components', () => {
  it('toggles from CheckboxInput when enabled and ignores input changes when disabled', () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <CheckboxInput
        id="input-enabled"
        checked={false}
        onChange={onChange}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(
      <CheckboxInput
        id="input-disabled"
        checked={true}
        onChange={onChange}
        disabled={true}
      />
    );

    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('renders CheckboxLabel only when label exists', () => {
    const { rerender } = render(<CheckboxLabel label="Visible label" />);
    expect(screen.getByText('Visible label')).toBeInTheDocument();

    rerender(<CheckboxLabel label="" />);
    expect(screen.queryByText('Visible label')).not.toBeInTheDocument();
  });

  it('shows checked indicator and hover classes based on disabled state', () => {
    const { container, rerender } = render(
      <CheckboxIcon checked={true} disabled={false} className="custom-icon" />
    );

    const iconWrapper = container.querySelector('.custom-icon');
    expect(iconWrapper).toHaveClass('group-hover:!border-primary');
    expect(container.querySelector('.text-white')).toBeInTheDocument();

    rerender(<CheckboxIcon checked={false} disabled={true} />);

    const disabledWrapper = container.querySelector('.relative');
    expect(disabledWrapper?.className).not.toContain(
      'group-hover:!border-primary'
    );
    expect(container.querySelector('.text-white')).not.toBeInTheDocument();
  });
});
