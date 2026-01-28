import React from 'react';
import { SEARCH_STATES, VALIDATION_MESSAGES } from '../../constants';

interface EmptyStateProps {
  searchState: string;
  searchTerm: string;
  hasAddNew: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  searchState,
  searchTerm,
  hasAddNew,
}) => {
  const isSearchWithAddNew =
    (searchState === SEARCH_STATES.NOT_FOUND ||
      searchState === SEARCH_STATES.TYPING) &&
    hasAddNew &&
    searchTerm.trim() !== '';

  return (
    <div className="py-2 px-3 text-sm text-slate-500">
      {isSearchWithAddNew ? (
        <div>
          <div>{VALIDATION_MESSAGES.NO_OPTIONS}</div>
          <div className="text-xs text-slate-400 mt-1">
            {VALIDATION_MESSAGES.ADD_NEW_HINT}
          </div>
        </div>
      ) : (
        VALIDATION_MESSAGES.NO_OPTIONS
      )}
    </div>
  );
};

export default EmptyState;
