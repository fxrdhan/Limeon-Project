import React from 'react';
import { SEARCH_STATES } from '../../constants';
import type { ResolvedComboboxLabels } from '@/types';

interface EmptyStateProps {
  searchState: string;
  searchTerm: string;
  hasAddNew: boolean;
  labels: ResolvedComboboxLabels;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  searchState,
  searchTerm,
  hasAddNew,
  labels,
}) => {
  const isSearchWithAddNew =
    (searchState === SEARCH_STATES.NOT_FOUND ||
      searchState === SEARCH_STATES.TYPING) &&
    hasAddNew &&
    searchTerm.trim() !== '';

  return (
    <div
      className="py-2 px-3 text-sm text-slate-500"
      role="status"
      aria-live="polite"
      data-combobox-empty=""
    >
      {isSearchWithAddNew ? (
        <div>
          <div>{labels.noOptions}</div>
          <div className="text-xs text-slate-400 mt-1">{labels.addNewHint}</div>
        </div>
      ) : (
        labels.noOptions
      )}
    </div>
  );
};

export default EmptyState;
