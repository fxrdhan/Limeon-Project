import { useState, useCallback, useEffect, RefObject } from 'react';
import { shouldTruncateText } from '@/utils/text';
import { DROPDOWN_CONSTANTS } from '../constants';

interface UseTextExpansionProps {
  buttonRef: RefObject<HTMLButtonElement | null>;
  selectedOption?: { id: string; name: string };
  isOpen?: boolean;
}

export const useTextExpansion = ({
  buttonRef,
  selectedOption,
  isOpen = false,
}: UseTextExpansionProps) => {
  const [isButtonTextExpanded, setIsButtonTextExpanded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpandState, setCanExpandState] = useState(false);

  const canExpand = useCallback((): boolean => {
    if (!selectedOption || !buttonRef.current) return false;
    const buttonWidth = buttonRef.current.getBoundingClientRect().width;
    const maxTextWidth = buttonWidth - DROPDOWN_CONSTANTS.BUTTON_PADDING;
    return shouldTruncateText(selectedOption.name, maxTextWidth);
  }, [selectedOption, buttonRef]);

  // Update canExpand state in effect (avoid ref access during render)
  useEffect(() => {
    setCanExpandState(canExpand());
  }, [canExpand]);

  const handleExpansion = useCallback(
    (optionId: string, optionName: string, shouldExpand: boolean) => {
      if (!buttonRef.current) return;
      const buttonWidth = buttonRef.current.getBoundingClientRect().width;
      const maxTextWidth = buttonWidth - DROPDOWN_CONSTANTS.BUTTON_PADDING;
      if (shouldTruncateText(optionName, maxTextWidth) && shouldExpand) {
        setExpandedId(optionId);
      } else if (!shouldExpand) {
        setExpandedId(null);
      }
    },
    [buttonRef]
  );

  const handleButtonExpansion = useCallback(
    (shouldExpand: boolean) => {
      if (selectedOption && buttonRef.current) {
        const buttonWidth = buttonRef.current.getBoundingClientRect().width;
        const maxTextWidth = buttonWidth - DROPDOWN_CONSTANTS.BUTTON_PADDING;
        if (shouldTruncateText(selectedOption.name, maxTextWidth)) {
          setIsButtonTextExpanded(shouldExpand);
        }
      }
    },
    [selectedOption, buttonRef]
  );

  const handleExpansionChange = useCallback(
    (shouldExpand: boolean) => {
      if (canExpand()) {
        setIsExpanded(shouldExpand);
      } else {
        setIsExpanded(false);
      }
    },
    [canExpand]
  );

  // Reset expansion when selectedOption changes or when it can't expand
  useEffect(() => {
    if (!canExpand()) {
      setIsExpanded(false);
      setIsButtonTextExpanded(false);
    }
  }, [canExpand, selectedOption]);

  // Reset expansion when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
      setIsButtonTextExpanded(false);
      setExpandedId(null);
    }
  }, [isOpen]);

  return {
    // Original useTextExpansion API
    isButtonTextExpanded,
    expandedId,
    setExpandedId,
    handleExpansion,
    handleButtonExpansion,
    // Added from useButtonExpansion
    isExpanded,
    canExpand: canExpandState, // Use state instead of calling function during render
    handleExpansionChange,
  };
};
