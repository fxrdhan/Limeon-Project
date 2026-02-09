import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VALIDATION_MESSAGES } from '../../constants';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('shows add-new hint when search has no results and add-new is available', () => {
    render(
      <EmptyState
        searchState="not-found"
        searchTerm="new supplier"
        hasAddNew={true}
      />
    );

    expect(
      screen.getByText(VALIDATION_MESSAGES.NO_OPTIONS)
    ).toBeInTheDocument();
    expect(
      screen.getByText(VALIDATION_MESSAGES.ADD_NEW_HINT)
    ).toBeInTheDocument();
  });

  it('shows plain no-options message when add-new condition is not met', () => {
    render(<EmptyState searchState="idle" searchTerm="" hasAddNew={false} />);

    expect(
      screen.getByText(VALIDATION_MESSAGES.NO_OPTIONS)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(VALIDATION_MESSAGES.ADD_NEW_HINT)
    ).not.toBeInTheDocument();
  });
});
