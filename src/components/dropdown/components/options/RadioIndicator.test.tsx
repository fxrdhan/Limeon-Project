import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RadioIndicator from './RadioIndicator';

describe('RadioIndicator', () => {
  it('shows selected dot when selected and expanded', () => {
    const { container } = render(
      <RadioIndicator isSelected={true} isExpanded={true} />
    );

    const outer = container.firstElementChild;
    expect(outer).toHaveClass('items-start', 'pt-0.5');

    expect(container.querySelector('.border-primary')).toBeInTheDocument();
    expect(
      container.querySelector('.w-2.h-2.rounded-full.bg-primary')
    ).toBeInTheDocument();
  });

  it('shows unselected state without inner dot', () => {
    const { container } = render(
      <RadioIndicator isSelected={false} isExpanded={false} />
    );

    const outer = container.firstElementChild;
    expect(outer).toHaveClass('items-center');

    expect(container.querySelector('.border-slate-300')).toBeInTheDocument();
    expect(
      container.querySelector('.w-2.h-2.rounded-full.bg-primary')
    ).not.toBeInTheDocument();
  });
});
