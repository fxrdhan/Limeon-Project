import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ScrollIndicators from './ScrollIndicators';

describe('ScrollIndicators', () => {
  it('renders nothing when content is not scrollable', () => {
    const { container } = render(
      <ScrollIndicators
        isScrollable={false}
        scrolledFromTop={false}
        reachedBottom={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders top and bottom indicators based on scroll state', () => {
    const { container, rerender } = render(
      <ScrollIndicators
        isScrollable={true}
        scrolledFromTop={true}
        reachedBottom={false}
      />
    );

    expect(container.querySelectorAll('div')).toHaveLength(2);

    rerender(
      <ScrollIndicators
        isScrollable={true}
        scrolledFromTop={false}
        reachedBottom={true}
      />
    );

    expect(container.querySelectorAll('div')).toHaveLength(0);
  });
});
