import { useCallback, useRef, useState } from 'react';

export const useItemMasterTabSelectorState = () => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tabSelectorContainerRef = useRef<HTMLDivElement>(null);
  const isTabSwitchingRef = useRef(false);
  const [isTabSelectorExpanded, setIsTabSelectorExpanded] = useState(false);
  const [tabSelectorCollapseSignal, setTabSelectorCollapseSignal] = useState(0);

  const handleTabSelectorExpandedChange = useCallback((expanded: boolean) => {
    setIsTabSelectorExpanded(expanded);
  }, []);

  const handleSearchSelectorOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setTabSelectorCollapseSignal(signal => signal + 1);
    }
  }, []);

  return {
    searchInputRef,
    tabSelectorContainerRef,
    isTabSwitchingRef,
    isTabSelectorExpanded,
    tabSelectorCollapseSignal,
    handleTabSelectorExpandedChange,
    handleSearchSelectorOpenChange,
  };
};
