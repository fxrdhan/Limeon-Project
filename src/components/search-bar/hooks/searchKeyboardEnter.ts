import type { ChangeEvent, KeyboardEvent } from 'react';
import type { EnhancedSearchState } from '../types';

interface HandleSearchEnterKeyParams {
  e: KeyboardEvent<HTMLInputElement>;
  isModalOpen: boolean;
  searchMode: EnhancedSearchState;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClearPreservedState?: () => void;
}

export const handleSearchEnterKey = ({
  e,
  isModalOpen,
  searchMode,
  value,
  onChange,
  onClearPreservedState,
}: HandleSearchEnterKeyParams): boolean => {
  // IMPORTANT: When modal selector is open, let BaseSelector handle Enter key.
  if (isModalOpen) {
    return true;
  }

  // Handle confirmation for any condition after the first (index >= 1).
  const activeIdx = searchMode.activeConditionIndex ?? 0;
  const currentPartialCond = searchMode.partialConditions?.[activeIdx];
  const hasOperator = !!currentPartialCond?.operator;

  if (activeIdx > 0 && hasOperator && searchMode.partialJoin) {
    e.preventDefault();
    e.stopPropagation();

    const currentValue = value.trim();

    const opPattern = new RegExp(`#${currentPartialCond.operator}\\s*$`);
    const hasCondValue = !opPattern.test(currentValue);

    if (
      hasCondValue &&
      !currentValue.endsWith('#') &&
      !currentValue.endsWith('##')
    ) {
      if (currentPartialCond.operator === 'inRange') {
        const inRangeRegex = /#(and|or)\s+(?:#[^\s#]+\s+)?#inRange\s+(.*)$/i;
        const match = currentValue.match(inRangeRegex);
        if (match) {
          const valPart = match[2].trim();
          if (!valPart.includes('#to')) {
            const dashMatch = valPart.match(/^(.+?)-(.+)$/);
            if (dashMatch && dashMatch[1].trim() && dashMatch[2].trim()) {
              onChange({
                target: { value: currentValue + '##' },
              } as ChangeEvent<HTMLInputElement>);
              onClearPreservedState?.();
              return true;
            }

            onChange({
              target: { value: currentValue + ' #to ' },
            } as ChangeEvent<HTMLInputElement>);
            return true;
          }
        }
      }

      onChange({
        target: { value: currentValue + '##' },
      } as ChangeEvent<HTMLInputElement>);
      onClearPreservedState?.();
    }
    return true;
  }

  if (!searchMode.isFilterMode) {
    return false;
  }

  e.preventDefault();
  e.stopPropagation();

  if (
    !searchMode.filterSearch ||
    searchMode.filterSearch.isConfirmed ||
    searchMode.filterSearch.isMultiCondition ||
    searchMode.filterSearch.value.trim() === ''
  ) {
    return true;
  }

  if (
    searchMode.filterSearch.operator === 'inRange' &&
    !searchMode.filterSearch.valueTo
  ) {
    if (value.includes('#to')) {
      return true;
    }

    const valueMatch = value.match(/#[^\s#]+\s+#inRange\s+(.+)$/i);
    if (valueMatch) {
      const typedValue = valueMatch[1].trim();
      const dashMatch = typedValue.match(/^(.+?)-(.+)$/);
      if (dashMatch) {
        const [, firstVal, secondVal] = dashMatch;
        if (firstVal.trim() && secondVal.trim()) {
          onChange({
            target: { value: value.trim() + '##' },
          } as ChangeEvent<HTMLInputElement>);
          return true;
        }
      }
    }

    onChange({
      target: { value: value.trim() + ' #to ' },
    } as ChangeEvent<HTMLInputElement>);
    return true;
  }

  const currentValue = value.trim();
  if (!currentValue.endsWith('#')) {
    onChange({
      target: { value: currentValue + '##' },
    } as ChangeEvent<HTMLInputElement>);
    onClearPreservedState?.();
  }

  return true;
};
