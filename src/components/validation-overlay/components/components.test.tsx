import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ARROW_LEFT_OFFSET, ICON_SIZE, STYLES } from '../constants';
import ValidationArrow from './ValidationArrow';
import ValidationIcon from './ValidationIcon';
import ValidationMessage from './ValidationMessage';
import ValidationOverlayContent from './ValidationOverlayContent';
import ValidationPortal from './ValidationPortal';

vi.mock('motion/react', async () => {
  const react = await vi.importActual<typeof import('react')>('react');
  const createMotionComponent = (tag: string) =>
    react.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) =>
        react.createElement(tag, { ...props, ref }, children)
    );

  return {
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(String(tag)),
      }
    ),
    AnimatePresence: ({ children }: { children: ReactNode }) =>
      react.createElement(react.Fragment, null, children),
  };
});

describe('Validation overlay components', () => {
  it('renders arrow/icon/message with defaults and custom overrides', () => {
    const { container, rerender } = render(<ValidationArrow />);
    const arrow = container.querySelector('div');
    expect(arrow).toHaveClass(STYLES.arrow);
    expect(arrow).toHaveStyle({ left: `${ARROW_LEFT_OFFSET}px` });

    rerender(<ValidationArrow className="custom-arrow" />);
    expect(container.querySelector('div')).toHaveClass('custom-arrow');

    rerender(<ValidationIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toHaveClass(STYLES.icon);
    expect(icon).toHaveAttribute('width', String(ICON_SIZE));

    rerender(<ValidationIcon className="custom-icon" size={20} />);
    const customIcon = container.querySelector('svg');
    expect(customIcon).toHaveClass('custom-icon');
    expect(customIcon).toHaveAttribute('width', '20');

    rerender(<ValidationMessage message="Wajib diisi" />);
    expect(screen.getByText('Wajib diisi')).toHaveClass(STYLES.message);
  });

  it('renders overlay content at target position and portal content in body', () => {
    render(
      <ValidationOverlayContent
        error="Data tidak valid"
        position={{ top: 111, left: 222, width: 320 }}
      />
    );

    const content =
      screen.getByText('Data tidak valid').parentElement?.parentElement;
    expect(content).toHaveClass(STYLES.overlay);
    expect(content).toHaveStyle({ top: '111px', left: '222px' });
    expect(screen.getByText('Data tidak valid')).toBeInTheDocument();

    render(
      <ValidationPortal>
        <div data-testid="portal-child">Portal child</div>
      </ValidationPortal>
    );

    expect(screen.getByTestId('portal-child')).toBeInTheDocument();
    expect(document.body).toContainElement(screen.getByTestId('portal-child'));
  });
});
