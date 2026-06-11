import { useEffect, type ChangeEvent } from 'react';
import { KEY_CODES } from '../constants';
import type { EnhancedSearchState } from '../types';
import {
  deleteGroupedPartialTail,
  deleteLastBadgeUnit,
  ensureTrailingHash,
} from '../utils/keyboardPatternDeletion';

interface UseSearchSelectorGlobalDeleteParams {
  value: string;
  searchMode: EnhancedSearchState;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onStepBackDelete?: () => boolean;
}

export const useSearchSelectorGlobalDelete = ({
  value,
  searchMode,
  onChange,
  onStepBackDelete,
}: UseSearchSelectorGlobalDeleteParams) => {
  // When selectors are open, keyboard focus moves away from the main input.
  // Capture Delete globally so users can still delete trailing pattern tokens (e.g. "#(").
  useEffect(() => {
    const isAnySelectorOpen =
      searchMode.showColumnSelector ||
      searchMode.showOperatorSelector ||
      searchMode.showJoinOperatorSelector;

    if (!isAnySelectorOpen) return;

    const onGlobalKeyDown = (e: KeyboardEvent) => {
      const isDeleteKey = e.key === KEY_CODES.DELETE;
      const isBackspaceKey = e.key === KEY_CODES.BACKSPACE;
      if (!isDeleteKey && !isBackspaceKey) return;

      if (isBackspaceKey) {
        const target = e.target;
        if (target instanceof HTMLInputElement && target.value.length > 0) {
          return;
        }
        if (target instanceof HTMLTextAreaElement && target.value.length > 0) {
          return;
        }
        if (target instanceof HTMLElement && target.isContentEditable) {
          return;
        }
      }

      if (onStepBackDelete?.()) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (searchMode.showJoinOperatorSelector) {
        e.preventDefault();
        e.stopPropagation();
        const trimmedValue = value.replace(/\s+#\s*$/, '').trimEnd();
        const newValue = trimmedValue
          ? trimmedValue.endsWith('##')
            ? trimmedValue
            : `${trimmedValue}##`
          : '';
        onChange({
          target: { value: newValue },
        } as ChangeEvent<HTMLInputElement>);
        return;
      }

      if (searchMode.showColumnSelector) {
        const trailingJoinWithHash = value.match(/(.*)\s+#(?:and|or)\s+#\s*$/i);
        const trailingJoinNoHash = value.match(/(.*)\s+#(?:and|or)\s*$/i);
        const trailingJoinMatch = trailingJoinWithHash || trailingJoinNoHash;

        if (trailingJoinMatch) {
          e.preventDefault();
          e.stopPropagation();
          const baseFilter = trailingJoinMatch[1].trimEnd();
          // Step back from choosing next column to choosing join operator.
          // Pattern: ... [Value] #and #  -> ... [Value] #
          const newValue = baseFilter ? ensureTrailingHash(baseFilter) : '';
          onChange({
            target: { value: newValue },
          } as ChangeEvent<HTMLInputElement>);
          return;
        }
      }

      if (value.includes('#(') || value.includes('#)')) {
        const nextValue = deleteGroupedPartialTail(value);
        if (nextValue !== null && nextValue !== value) {
          e.preventDefault();
          e.stopPropagation();
          onChange({
            target: { value: nextValue },
          } as ChangeEvent<HTMLInputElement>);
          return;
        }
      }

      // Fallback: when a selector is open and focus is away from the input,
      // allow Delete to remove one badge unit from the end of the pattern.
      if (value.trimStart().startsWith('#')) {
        const nextValue = deleteLastBadgeUnit(value);
        if (nextValue !== value) {
          e.preventDefault();
          e.stopPropagation();
          onChange({
            target: { value: nextValue },
          } as ChangeEvent<HTMLInputElement>);
        }
      }
    };

    window.addEventListener('keydown', onGlobalKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onGlobalKeyDown, {
        capture: true,
      });
    };
  }, [
    onChange,
    onStepBackDelete,
    searchMode.showColumnSelector,
    searchMode.showJoinOperatorSelector,
    searchMode.showOperatorSelector,
    value,
  ]);
};
