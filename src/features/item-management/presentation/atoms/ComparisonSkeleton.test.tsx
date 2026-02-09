import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ComparisonSkeleton from './ComparisonSkeleton';

describe('ComparisonSkeleton', () => {
  it('renders one line by default', () => {
    const { container } = render(<ComparisonSkeleton />);

    expect(
      container.querySelectorAll('.flex.items-center.space-x-1')
    ).toHaveLength(1);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(7);
  });

  it('renders custom line count and className', () => {
    const { container } = render(
      <ComparisonSkeleton lines={3} className="extra-spacing" />
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('extra-spacing');
    expect(
      container.querySelectorAll('.flex.items-center.space-x-1')
    ).toHaveLength(3);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(21);
  });
});
