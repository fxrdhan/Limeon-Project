import { useState, useCallback, RefObject } from 'react';
import { shouldTruncateText } from '@/utils/text';
import { DROPDOWN_CONSTANTS } from '../constants';

export const useTextExpansion = (
  buttonRef: RefObject<HTMLButtonElement | null>,
  selectedOption?: { id: string; name: string }
) => {
  const [isButtonTextExpanded, setIsButtonTextExpanded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  return {
    isButtonTextExpanded,
    expandedId,
    setExpandedId,
    handleExpansion,
    handleButtonExpansion,
  };
};
