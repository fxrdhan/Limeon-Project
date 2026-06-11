import type { ChangeEvent, KeyboardEvent } from 'react';
import type { EnhancedSearchState } from '../types';
import {
  deleteGroupedPartialTail,
  deleteLastBadgeUnit,
} from '../utils/keyboardPatternDeletion';
import { PatternBuilder } from '../utils/PatternBuilder';

type EditValueTarget = 'value' | 'valueTo';

interface HandleSearchDeleteKeyParams {
  e: KeyboardEvent<HTMLInputElement>;
  isModalOpen: boolean;
  searchMode: EnhancedSearchState;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClearSearch?: () => void;
  onClearPreservedState?: () => void;
  onStepBackDelete?: () => boolean;
  editConditionValue?: (
    conditionIndex: number,
    target: EditValueTarget
  ) => void;
  clearConditionPart?: (
    conditionIndex: number,
    target: 'column' | 'operator' | 'value' | 'valueTo'
  ) => void;
}

export const handleSearchDeleteKey = ({
  e,
  isModalOpen,
  searchMode,
  value,
  onChange,
  onClearSearch,
  onClearPreservedState,
  onStepBackDelete,
  editConditionValue,
  clearConditionPart,
}: HandleSearchDeleteKeyParams): boolean => {
  if (!isModalOpen && e.currentTarget.value.length > 0) {
    return true;
  }

  if (onStepBackDelete?.()) {
    e.preventDefault();
    e.stopPropagation();
    return true;
  }

  if (searchMode.showJoinOperatorSelector) {
    e.preventDefault();
    e.stopPropagation();
    const trimmedValue = value.replace(/\s+#\s*$/, '').trimEnd();
    if (!trimmedValue) {
      onChange({
        target: { value: '' },
      } as ChangeEvent<HTMLInputElement>);
      return true;
    }
    onChange({
      target: {
        value: trimmedValue.endsWith('##') ? trimmedValue : `${trimmedValue}##`,
      },
    } as ChangeEvent<HTMLInputElement>);
    return true;
  }

  // Confirmed single-condition: step back to operator selection (or enter in-badge edit for inRange).
  if (
    searchMode.isFilterMode &&
    searchMode.filterSearch?.isConfirmed &&
    !searchMode.filterSearch?.isMultiCondition
  ) {
    e.preventDefault();
    e.stopPropagation();

    if (
      searchMode.filterSearch.operator === 'inRange' &&
      searchMode.filterSearch.valueTo
    ) {
      if (editConditionValue) {
        editConditionValue(0, 'valueTo');
      } else if (clearConditionPart) {
        clearConditionPart(0, 'valueTo');
      }
      return true;
    }

    if (
      searchMode.filterSearch.operator === 'inRange' &&
      searchMode.filterSearch.value
    ) {
      if (editConditionValue) {
        editConditionValue(0, 'value');
      } else if (clearConditionPart) {
        clearConditionPart(0, 'value');
      }
      return true;
    }

    const field = searchMode.filterSearch.field;
    onChange({
      target: { value: `#${field} #` },
    } as ChangeEvent<HTMLInputElement>);
    return true;
  }

  if (value.trimStart().startsWith('#')) {
    e.preventDefault();
    e.stopPropagation();

    const nextValue = deleteLastBadgeUnit(value);
    if (nextValue !== value) {
      onChange({
        target: { value: nextValue },
      } as ChangeEvent<HTMLInputElement>);
    }
    return true;
  }

  if (
    (value.includes('#(') || value.includes('#)')) &&
    !searchMode.filterSearch?.filterGroup
  ) {
    const nextValue = deleteGroupedPartialTail(value);
    if (nextValue !== null && nextValue !== value) {
      e.preventDefault();
      onChange({
        target: { value: nextValue },
      } as ChangeEvent<HTMLInputElement>);
      return true;
    }
  }

  if (
    searchMode.isFilterMode &&
    searchMode.filterSearch?.operator === 'inRange' &&
    searchMode.filterSearch?.waitingForValueTo &&
    searchMode.filterSearch?.value &&
    !searchMode.filterSearch?.isMultiCondition
  ) {
    e.preventDefault();
    if (clearConditionPart) {
      clearConditionPart(0, 'value');
    }
    return true;
  }

  const activeIdx = searchMode.activeConditionIndex ?? 0;
  const currentPartialCond = searchMode.partialConditions?.[activeIdx];
  const currentOp = currentPartialCond?.operator;

  if (
    activeIdx > 0 &&
    currentOp &&
    searchMode.partialJoin &&
    !searchMode.isFilterMode
  ) {
    e.preventDefault();

    const hasGroupTokens = value.includes('#(') || value.includes('#)');
    if (hasGroupTokens) {
      const escapedOp = currentOp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const opRegex = new RegExp(`#${escapedOp}\\s*$`, 'i');
      if (opRegex.test(value)) {
        const newValue = value.replace(opRegex, '#').replace(/\s+$/, ' ');
        onChange({
          target: { value: newValue },
        } as ChangeEvent<HTMLInputElement>);
        return true;
      }
    }

    const conditions = (searchMode.partialConditions || []).map(c => ({
      field: c.column?.field || c.field,
      operator: c.operator,
      value: c.value,
      valueTo: c.valueTo,
    }));

    if (conditions[activeIdx]) {
      conditions[activeIdx].operator = undefined;
      conditions[activeIdx].value = undefined;
      conditions[activeIdx].valueTo = undefined;
    }

    const newValue = PatternBuilder.buildNConditions(
      conditions,
      searchMode.joins || [],
      searchMode.filterSearch?.isMultiColumn || false,
      searchMode.filterSearch?.column?.field || '',
      {
        confirmed: false,
        openSelector: true,
        stopAfterIndex: activeIdx,
      }
    );

    onClearPreservedState?.();

    onChange({
      target: { value: newValue },
    } as ChangeEvent<HTMLInputElement>);
    return true;
  }

  const trailingJoinRegex = /(.*)\s+#(?:and|or)\s+#\s*$/i;
  if (value.match(trailingJoinRegex)) {
    e.preventDefault();
    const match = value.match(trailingJoinRegex);
    if (match) {
      const baseFilter = match[1];
      const newValue = `${baseFilter}##`;
      onChange({
        target: { value: newValue },
      } as ChangeEvent<HTMLInputElement>);
    }
    return true;
  }

  if (
    searchMode.isFilterMode &&
    searchMode.filterSearch?.value === '' &&
    !searchMode.filterSearch?.isMultiCondition
  ) {
    if (
      searchMode.filterSearch.operator === 'contains' &&
      !searchMode.filterSearch.isExplicitOperator
    ) {
      if (onClearSearch) {
        onClearSearch();
      } else {
        onChange({
          target: { value: '' },
        } as ChangeEvent<HTMLInputElement>);
      }
      return true;
    }

    e.preventDefault();
    const columnName = searchMode.filterSearch.field;
    onChange({
      target: { value: `#${columnName} #` },
    } as ChangeEvent<HTMLInputElement>);
    return true;
  }

  if (searchMode.showOperatorSelector && searchMode.selectedColumn) {
    e.preventDefault();

    if (
      searchMode.partialJoin &&
      searchMode.activeConditionIndex &&
      searchMode.activeConditionIndex > 0
    ) {
      e.preventDefault();

      const hasGroupTokens = value.includes('#(') || value.includes('#)');
      if (hasGroupTokens && searchMode.selectedColumn?.field) {
        const escapedField = searchMode.selectedColumn.field.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );
        const columnRegex = new RegExp(`#${escapedField}\\s*#\\s*$`, 'i');
        if (columnRegex.test(value)) {
          const newValue = value.replace(columnRegex, '#').replace(/\s+$/, ' ');
          onChange({
            target: { value: newValue },
          } as ChangeEvent<HTMLInputElement>);
          return true;
        }
      }

      const conditions = (searchMode.partialConditions || []).map(c => ({
        field: c.column?.field || c.field,
        operator: c.operator,
        value: c.value,
        valueTo: c.valueTo,
      }));

      const prevActiveIdx = searchMode.activeConditionIndex - 1;
      const basePattern = PatternBuilder.buildNConditions(
        conditions.slice(0, prevActiveIdx + 1),
        (searchMode.joins || []).slice(0, prevActiveIdx),
        searchMode.filterSearch?.isMultiColumn || false,
        searchMode.filterSearch?.column?.field || '',
        {
          confirmed: false,
          openSelector: false,
        }
      );

      const preservedJoin =
        searchMode.joins?.[prevActiveIdx] || searchMode.partialJoin || 'AND';
      const newValue = `${basePattern} #${preservedJoin.toLowerCase()} #`;

      onChange({
        target: { value: newValue },
      } as ChangeEvent<HTMLInputElement>);
      return true;
    }

    if (onClearSearch) {
      onClearSearch();
    } else {
      onChange({
        target: { value: '' },
      } as ChangeEvent<HTMLInputElement>);
    }
    return true;
  }

  return false;
};
