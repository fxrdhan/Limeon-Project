import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import Checkbox from './index';

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

describe('Checkbox', () => {
  it('toggles value through input change and Enter keyboard interaction', () => {
    const onChange = vi.fn();

    render(
      <Checkbox
        id="agree"
        label="I agree"
        checked={false}
        onChange={onChange}
        className="custom-checkbox"
      />
    );

    const input = screen.getByRole('checkbox');
    fireEvent.click(input);

    const label = screen.getByText('I agree').closest('label');
    expect(label).toBeTruthy();
    fireEvent.keyDown(label!, { key: 'Enter' });

    expect(onChange).toHaveBeenNthCalledWith(1, true);
    expect(onChange).toHaveBeenNthCalledWith(2, true);
    expect(label).toHaveClass('cursor-pointer', 'custom-checkbox');
  });

  it('does not toggle when disabled and applies disabled styles', () => {
    const onChange = vi.fn();

    render(
      <Checkbox
        id="disabled-check"
        label="Disabled"
        checked={true}
        onChange={onChange}
        disabled={true}
      />
    );

    const input = screen.getByRole('checkbox');
    const label = screen.getByText('Disabled').closest('label');

    fireEvent.click(input);
    fireEvent.keyDown(label!, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toBeDisabled();
    expect(label).toHaveClass('opacity-60', 'cursor-not-allowed');
  });

  it('sets input tab index to -1 when label tabIndex is provided', () => {
    render(
      <Checkbox
        id="tabbed"
        label="Tabbed"
        checked={false}
        onChange={vi.fn()}
        tabIndex={0}
      />
    );

    const input = screen.getByRole('checkbox');
    const label = screen.getByText('Tabbed').closest('label');

    expect(label).toHaveAttribute('tabindex', '0');
    expect(input).toHaveAttribute('tabindex', '-1');
  });
});
