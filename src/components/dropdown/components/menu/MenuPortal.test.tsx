import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import MenuPortal from './MenuPortal';

describe('MenuPortal', () => {
  it('returns null when portal is not open and not closing', () => {
    const { container } = render(
      <MenuPortal
        ref={React.createRef<HTMLDivElement>()}
        isOpen={false}
        isClosing={false}
        applyOpenStyles={true}
        dropDirection="down"
        portalStyle={{ left: '10px', top: '20px' }}
        isPositionReady={true}
        onMouseEnter={vi.fn()}
        onMouseLeave={vi.fn()}
      >
        <div>content</div>
      </MenuPortal>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders down-direction menu with event handlers and click propagation blocked', () => {
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();

    render(
      <MenuPortal
        ref={React.createRef<HTMLDivElement>()}
        isOpen={true}
        isClosing={false}
        applyOpenStyles={true}
        dropDirection="down"
        portalStyle={{ left: '12px', top: '22px' }}
        isPositionReady={true}
        isKeyboardNavigation={true}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div>menu-content</div>
      </MenuPortal>
    );

    const menu = screen.getByRole('menu');
    expect(menu).toHaveClass(
      'origin-top',
      'opacity-100',
      'scale-100',
      'cursor-none'
    );
    expect(menu).toHaveStyle({ left: '12px', top: '22px' });

    fireEvent.mouseEnter(menu);
    fireEvent.mouseLeave(menu);
    fireEvent.click(menu);

    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
    expect(screen.getByText('menu-content')).toBeInTheDocument();
  });

  it('renders up-direction style with upward shadow and hidden while positioning', () => {
    render(
      <MenuPortal
        ref={React.createRef<HTMLDivElement>()}
        isOpen={true}
        isClosing={false}
        applyOpenStyles={true}
        dropDirection="up"
        portalStyle={{ left: '5px', top: '8px' }}
        isPositionReady={false}
        onMouseEnter={vi.fn()}
        onMouseLeave={vi.fn()}
      >
        <div>menu-content</div>
      </MenuPortal>
    );

    const menu = screen.getByRole('menu');
    expect(menu).toHaveClass('origin-bottom', 'opacity-0');
    expect(menu).toHaveStyle({
      boxShadow:
        '0 -20px 25px -5px rgba(0, 0, 0, 0.1), 0 -10px 10px -5px rgba(0, 0, 0, 0.04)',
    });
  });
});
