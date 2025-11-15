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

  // Use getDerivedStateFromProps pattern to reset badgeWidth
  const [badgeState, setBadgeState] = useState({
    showIndicator: false,
    width: 0,
  });
  if (showTargetedIndicator !== badgeState.showIndicator) {
    setBadgeState({
      showIndicator: showTargetedIndicator,
      width: showTargetedIndicator ? badgeState.width : 0,
    });
  }
  const badgeWidth = badgeState.width;
  const setBadgeWidth = (width: number) => {
    setBadgeState(prev => ({ ...prev, width }));
  };

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

  useEffect(() => {
    if (textMeasureRef.current && displayValue) {
      setTextWidth(textMeasureRef.current.offsetWidth);
    }
  }, [displayValue]);

  // Use ResizeObserver to track actual badge width (including hover state)
  // badgeWidth auto-resets to 0 when showTargetedIndicator becomes false (getDerivedStateFromProps)
  useEffect(() => {
    if (!showTargetedIndicator) {
      return;
    }

    const targetElement =
      searchMode.isFilterMode &&
      searchMode.filterSearch &&
      badgesContainerRef.current
        ? badgesContainerRef.current
        : badgeRef.current;

    if (!targetElement) {
      // Set initial width asynchronously to avoid setState in effect
      setTimeout(() => {
        setBadgeWidth(100); // Reasonable initial width
      }, 0);
      return;
    }

    // Measure immediately with triple RAF for complete DOM stabilization + animation start
    const measureWidth = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (targetElement) {
              setBadgeWidth(targetElement.offsetWidth);
            }
          });
        });
      });
    };

    // Set initial width asynchronously, then measure precisely
    setTimeout(() => {
      setBadgeWidth(100); // Initial estimate
      measureWidth();
    }, 0);

    // Watch for any size changes (hover, font loading, layout shifts, animation complete)
    const resizeObserver = new ResizeObserver(() => {
      // Update immediately without RAF for instant response
      if (targetElement) {
        setBadgeWidth(targetElement.offsetWidth);
      }
    });

    resizeObserver.observe(targetElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    showTargetedIndicator,
    searchMode.isFilterMode,
    searchMode.filterSearch,
    searchMode.selectedColumn,
    searchMode.showColumnSelector,
    searchMode.showOperatorSelector,
  ]);

  // Dummy handler for compatibility (not used anymore, ResizeObserver handles it)
  const handleHoverChange = useCallback(() => {
    // ResizeObserver will automatically detect width changes on hover
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
    textWidth,
    badgeWidth,
    operatorSearchTerm,
    handleInputChange,
    handleHoverChange,
    textMeasureRef,
    badgeRef,
    badgesContainerRef,
  };
};
