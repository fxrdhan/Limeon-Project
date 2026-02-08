import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import SearchIcon from './SearchIcon';
import type { EnhancedSearchState } from '../types';

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: React.forwardRef<
      HTMLDivElement,
      React.HTMLAttributes<HTMLDivElement> & {
        initial?: unknown;
        animate?: unknown;
        exit?: unknown;
        transition?: unknown;
        layout?: boolean;
      }
    >(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )),
  },
}));

vi.mock('react-icons/tb', () => ({
  TbChartCircles: () => <span data-testid="icon-chart">chart</span>,
  TbFilter: () => <span data-testid="icon-filter">filter</span>,
  TbFilterX: () => <span data-testid="icon-filterx">filterx</span>,
  TbHash: () => <span data-testid="icon-hash">hash</span>,
  TbSearch: () => <span data-testid="icon-search">search</span>,
}));

const baseSearchMode = (
  partial: Partial<EnhancedSearchState> = {}
): EnhancedSearchState => ({
  showColumnSelector: false,
  showOperatorSelector: false,
  showJoinOperatorSelector: false,
  isFilterMode: false,
  ...partial,
});

describe('SearchIcon', () => {
  it('renders default search icon in inactive layout', () => {
    const { container } = render(
      <SearchIcon
        searchMode={baseSearchMode()}
        searchState="idle"
        displayValue=""
      />
    );

    expect(screen.getByTestId('icon-search')).toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain('absolute left-3');
  });

  it('renders hash icon for column selector mode', () => {
    render(
      <SearchIcon
        searchMode={baseSearchMode({ showColumnSelector: true })}
        searchState="idle"
        displayValue="#"
      />
    );

    expect(screen.getByTestId('icon-hash')).toBeInTheDocument();
  });

  it('renders join icon for join selector mode', () => {
    render(
      <SearchIcon
        searchMode={baseSearchMode({ showJoinOperatorSelector: true })}
        searchState="idle"
        displayValue="#"
      />
    );

    expect(screen.getByTestId('icon-chart')).toBeInTheDocument();
  });

  it('renders filter icon for filter mode and active typing layout', () => {
    const { container } = render(
      <SearchIcon
        searchMode={baseSearchMode({ isFilterMode: true })}
        searchState="typing"
        displayValue="query"
      />
    );

    expect(screen.getByTestId('icon-filter')).toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain('relative');
  });

  it('renders error icon when showError is true', () => {
    render(
      <SearchIcon
        searchMode={baseSearchMode()}
        searchState="found"
        displayValue="aspirin"
        showError
      />
    );

    expect(screen.getByTestId('icon-filterx')).toBeInTheDocument();
  });
});
