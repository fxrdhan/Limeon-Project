import { RefObject } from 'react';
import { truncateText, shouldTruncateText } from '@/utils/text';
import { DROPDOWN_CONSTANTS } from '../../constants';

interface UseButtonTextProps {
  selectedOption?: { id: string; name: string };
  placeholder?: string;
  isExpanded: boolean;
  buttonRef: RefObject<HTMLButtonElement | null>;
}

export const useButtonText = ({
  selectedOption,
  placeholder = '-- Pilih --',
  isExpanded,
  buttonRef,
}: UseButtonTextProps) => {
  const getDisplayText = (): string => {
    if (!selectedOption) return placeholder;
    if (isExpanded) return selectedOption.name;
    
    const buttonWidth = buttonRef.current?.getBoundingClientRect().width || 200;
    const maxTextWidth = buttonWidth - DROPDOWN_CONSTANTS.BUTTON_PADDING;
    
    return shouldTruncateText(selectedOption.name, maxTextWidth)
      ? truncateText(selectedOption.name, maxTextWidth)
      : selectedOption.name;
  };

  const getTitleText = (): string | undefined => {
    if (!selectedOption || isExpanded || !buttonRef.current) return undefined;
    
    const buttonWidth = buttonRef.current.getBoundingClientRect().width;
    const maxTextWidth = buttonWidth - DROPDOWN_CONSTANTS.BUTTON_PADDING;
    
    return shouldTruncateText(selectedOption.name, maxTextWidth)
      ? selectedOption.name
      : undefined;
  };

  const shouldTruncate = (): boolean => {
    if (!selectedOption || !buttonRef.current) return false;
    
    const buttonWidth = buttonRef.current.getBoundingClientRect().width;
    const maxTextWidth = buttonWidth - DROPDOWN_CONSTANTS.BUTTON_PADDING;
    
    return shouldTruncateText(selectedOption.name, maxTextWidth);
  };

  return {
    displayText: getDisplayText(),
    titleText: getTitleText(),
    shouldTruncate: shouldTruncate(),
  };
};