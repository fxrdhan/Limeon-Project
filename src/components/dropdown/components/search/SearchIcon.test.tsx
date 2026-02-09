import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SearchIcon from './SearchIcon';

describe('SearchIcon', () => {
  it('does not render for absolute position when search term exists', () => {
    const { container } = render(
      <SearchIcon
        searchState="typing"
        hasSearchTerm={true}
        position="absolute"
      />
    );

    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('renders absolute icon with state classes', () => {
    const { container } = render(
      <SearchIcon
        searchState="found"
        hasSearchTerm={false}
        position="absolute"
      />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-primary');
    expect(icon).toHaveClass('absolute');
  });

  it('renders relative icon with fixed width style', () => {
    const { container } = render(
      <SearchIcon searchState="idle" hasSearchTerm={true} position="relative" />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('scale-125');
    expect(icon).toHaveStyle({
      width: '16px',
      minWidth: '16px',
    });
  });
});
