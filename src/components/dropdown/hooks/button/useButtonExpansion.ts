import { useState, useCallback, RefObject } from 'react';
import { shouldTruncateText } from '@/utils/text';
import { DROPDOWN_CONSTANTS } from '../../constants';

interface UseButtonExpansionProps {
  selectedOption?: { id: string; name: string };
  buttonRef: RefObject<HTMLButtonElement | null>;
}

export const useButtonExpansion = ({
  selectedOption,
  buttonRef,
}: UseButtonExpansionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const canExpand = useCallback((): boolean => {
    if (!selectedOption || !buttonRef.current) return false;
    
    const buttonWidth = buttonRef.current.getBoundingClientRect().width;
    const maxTextWidth = buttonWidth - DROPDOWN_CONSTANTS.BUTTON_PADDING;
    
    return shouldTruncateText(selectedOption.name, maxTextWidth);
  }, [selectedOption, buttonRef]);

  const handleExpansionChange = useCallback((shouldExpand: boolean) => {
    if (canExpand()) {
      setIsExpanded(shouldExpand);
    } else {
      setIsExpanded(false);
    }
  }, [canExpand]);

  return {
    isExpanded,
    canExpand: canExpand(),
    handleExpansionChange,
  };
};