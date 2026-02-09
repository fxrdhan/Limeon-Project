import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MenuContent from './MenuContent';

describe('MenuContent', () => {
  it('renders children and indicator container wrapper', () => {
    const { container } = render(
      <MenuContent
        scrollState={{
          isScrollable: true,
          reachedBottom: false,
          scrolledFromTop: true,
        }}
      >
        <div data-testid="menu-child">content</div>
      </MenuContent>
    );

    expect(screen.getByTestId('menu-child')).toBeInTheDocument();
    expect(container.querySelector('.relative')).toBeInTheDocument();
    expect(container.querySelectorAll('div').length).toBeGreaterThan(1);
  });
});
