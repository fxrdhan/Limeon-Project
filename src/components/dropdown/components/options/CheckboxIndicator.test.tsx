import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CheckboxIndicator from './CheckboxIndicator';

describe('CheckboxIndicator', () => {
  it('shows selected styles and check icon when selected and expanded', () => {
    const { container } = render(
      <CheckboxIndicator isSelected={true} isExpanded={true} />
    );

    const outer = container.firstElementChild;
    expect(outer).toHaveClass('items-start', 'pt-0.5');

    expect(
      container.querySelector('.border-primary.bg-primary')
    ).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows unselected styles and no icon when not selected and collapsed', () => {
    const { container } = render(
      <CheckboxIndicator isSelected={false} isExpanded={false} />
    );

    const outer = container.firstElementChild;
    expect(outer).toHaveClass('items-center');

    expect(
      container.querySelector('.border-slate-300.bg-white')
    ).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
