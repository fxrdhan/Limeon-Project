import { useState, useCallback, useEffect, RefObject } from 'react';
import { shouldTruncateText } from '@/utils/text';
import { DROPDOWN_CONSTANTS } from '../../constants';

interface UseButtonExpansionProps {
  selectedOption?: { id: string; name: string };
  buttonRef: RefObject<HTMLButtonElement | null>;
  isOpen?: boolean;
}

export const useButtonExpansion = ({
  selectedOption,
  buttonRef,
  isOpen = false,
}: UseButtonExpansionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const canExpand = useCallback((): boolean => {
    if (!selectedOption || !buttonRef.current) return false;

    const buttonWidth = buttonRef.current.getBoundingClientRect().width;
    const maxTextWidth = buttonWidth - DROPDOWN_CONSTANTS.BUTTON_PADDING;

    return shouldTruncateText(selectedOption.name, maxTextWidth);
  }, [selectedOption, buttonRef]);

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
    }
  }, [canExpand, selectedOption]);

  // Reset expansion when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
    }
  }, [isOpen]);

  return {
    isExpanded,
    canExpand: canExpand(),
    handleExpansionChange,
  };
};
