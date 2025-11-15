import { useCallback, useMemo, useRef, useEffect } from 'react';
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
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const useSearchInput = ({
  value,
  searchMode,
  onChange,
  inputRef,
}: UseSearchInputProps) => {
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

  // Dynamic badge width tracking using CSS variable - no React state updates!
  // This prevents flickering by updating DOM directly without triggering re-renders
  useEffect(() => {
    if (!showTargetedIndicator || !inputRef?.current) {
      // Reset to default padding when no badge
      if (inputRef?.current) {
        inputRef.current.style.removeProperty('--badge-width');
      }
      return;
    }

    const targetElement =
      searchMode.isFilterMode &&
      searchMode.filterSearch &&
      badgesContainerRef.current
        ? badgesContainerRef.current
        : badgeRef.current;

    if (!targetElement || !inputRef.current) {
      return;
    }

    const inputElement = inputRef.current;

    // Update padding immediately with current badge width
    const updatePadding = () => {
      if (targetElement && inputElement) {
        const badgeWidth = targetElement.offsetWidth;
        // Set CSS variable directly - NO React state, NO re-render!
        inputElement.style.setProperty('--badge-width', `${badgeWidth + 16}px`);
      }
    };

    // Initial measurement with RAF for DOM stability
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updatePadding();
      });
    });

    // Watch for badge size changes (hover for X button, font loading, etc.)
    const resizeObserver = new ResizeObserver(() => {
      // Direct DOM update - no setState, no re-render, no flicker!
      requestAnimationFrame(() => {
        updatePadding();
      });
    });

    resizeObserver.observe(targetElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    showTargetedIndicator,
    searchMode.isFilterMode,
    searchMode.filterSearch,
    inputRef,
  ]);

  const handleHoverChange = useCallback(() => {
    // No-op - kept for compatibility
  }, []);

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
    operatorSearchTerm,
    handleInputChange,
    handleHoverChange,
    badgeRef,
    badgesContainerRef,
  };
};
