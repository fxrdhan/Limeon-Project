import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { EnhancedSearchState } from '../types';
import {
  buildFilterValue,
  buildColumnValue,
  getOperatorSearchTerm,
} from '../utils/searchUtils';

interface UseSearchInputProps {
  value: string;
  searchMode: EnhancedSearchState;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const useSearchInput = ({
  value,
  searchMode,
  onChange,
}: UseSearchInputProps) => {
  const [textWidth, setTextWidth] = useState(0);
  const [badgeWidth, setBadgeWidth] = useState(0);
  const textMeasureRef = useRef<HTMLSpanElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const badgesContainerRef = useRef<HTMLDivElement>(null);

  const operatorSearchTerm = useMemo(
    () => getOperatorSearchTerm(value),
    [value]
  );

  const showTargetedIndicator = useMemo(
    () =>
      (searchMode.isFilterMode && !!searchMode.filterSearch) ||
      (searchMode.showOperatorSelector && !!searchMode.selectedColumn) ||
      (!!searchMode.selectedColumn && !searchMode.showColumnSelector),
    [
      searchMode.isFilterMode,
      searchMode.filterSearch,
      searchMode.showOperatorSelector,
      searchMode.selectedColumn,
      searchMode.showColumnSelector,
    ]
  );

  const displayValue = useMemo(() => {
    if (searchMode.isFilterMode && searchMode.filterSearch) {
      return searchMode.filterSearch.value;
    }
    if (searchMode.showOperatorSelector && searchMode.selectedColumn) {
      return `#${operatorSearchTerm}`;
    }
    if (searchMode.selectedColumn && !searchMode.showColumnSelector) {
      return '';
    }
    if (value.startsWith('#') && !searchMode.isFilterMode) {
      return value;
    }
    return value;
  }, [
    value,
    searchMode.isFilterMode,
    searchMode.filterSearch,
    searchMode.showOperatorSelector,
    searchMode.selectedColumn,
    searchMode.showColumnSelector,
    operatorSearchTerm,
  ]);

  useEffect(() => {
    if (textMeasureRef.current && displayValue) {
      setTextWidth(textMeasureRef.current.offsetWidth);
    }
  }, [displayValue]);

  useEffect(() => {
    if (showTargetedIndicator) {
      // Force recalculation every time by using a small delay
      const timeoutId = setTimeout(() => {
        if (
          searchMode.isFilterMode &&
          searchMode.filterSearch &&
          badgesContainerRef.current
        ) {
          setBadgeWidth(badgesContainerRef.current.offsetWidth);
        } else if (badgeRef.current) {
          setBadgeWidth(badgeRef.current.offsetWidth);
        }
      }, 10); // Slightly longer delay for DOM updates

      return () => clearTimeout(timeoutId);
    } else {
      setBadgeWidth(0);
    }
  }, [
    showTargetedIndicator,
    searchMode.isFilterMode,
    searchMode.filterSearch,
    searchMode.selectedColumn,
    searchMode.showColumnSelector,
    searchMode.showOperatorSelector,
  ]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      if (searchMode.isFilterMode && searchMode.filterSearch) {
        const newValue = buildFilterValue(searchMode.filterSearch, inputValue);
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
      } else if (searchMode.showOperatorSelector && searchMode.selectedColumn) {
        const columnName = searchMode.selectedColumn.field;
        const cleanInputValue = inputValue.startsWith('#')
          ? inputValue.substring(1)
          : inputValue;

        if (cleanInputValue === '') {
          const newValue = buildColumnValue(columnName, 'plain');
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        } else {
          const newValue = `#${columnName} #${cleanInputValue}`;
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      } else if (
        searchMode.selectedColumn &&
        !searchMode.showColumnSelector &&
        !searchMode.showOperatorSelector
      ) {
        const columnName = searchMode.selectedColumn.field;

        if (inputValue === ' ') {
          const newValue = buildColumnValue(columnName, 'space');
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        } else if (inputValue === ':') {
          const newValue = buildColumnValue(columnName, 'colon');
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        } else if (inputValue.trim() !== '') {
          const newValue = `#${columnName}:${inputValue}`;
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        } else {
          const newValue = buildColumnValue(columnName, 'plain');
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      } else {
        onChange(e);
      }
    },
    [searchMode, onChange]
  );

  return {
    displayValue,
    showTargetedIndicator,
    textWidth,
    badgeWidth,
    operatorSearchTerm,
    handleInputChange,
    textMeasureRef,
    badgeRef,
    badgesContainerRef,
  };
};
