import React, { RefObject } from 'react';
import { truncateText, shouldTruncateText } from '@/utils/text';
import { DROPDOWN_CONSTANTS } from '../constants';
import OptionContainer from './options/OptionContainer';
import RadioIndicator from './options/RadioIndicator';
import OptionText from './options/OptionText';

interface OptionItemProps {
  option: { id: string; name: string };
  index: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isExpanded: boolean;
  withRadio?: boolean;
  isKeyboardNavigation: boolean;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onSelect: (optionId: string) => void;
  onHighlight: (index: number) => void;
  onExpansion: (optionId: string, optionName: string, shouldExpand: boolean) => void;
  dropdownMenuRef: RefObject<HTMLDivElement | null>;
}

const OptionItem: React.FC<OptionItemProps> = ({
  option,
  index,
  isSelected,
  isHighlighted,
  isExpanded,
  withRadio = false,
  isKeyboardNavigation,
  buttonRef,
  onSelect,
  onHighlight,
  onExpansion,
  dropdownMenuRef,
}) => {
  const buttonWidth = buttonRef.current?.getBoundingClientRect().width || 200;
  const maxTextWidth = buttonWidth - (withRadio 
    ? DROPDOWN_CONSTANTS.BUTTON_PADDING + DROPDOWN_CONSTANTS.RADIO_EXTRA_PADDING 
    : DROPDOWN_CONSTANTS.BUTTON_PADDING
  );
  const shouldTruncate = shouldTruncateText(option.name, maxTextWidth);
  const shouldExpand = isExpanded && shouldTruncate;
  const displayText = shouldTruncate && !shouldExpand
    ? truncateText(option.name, maxTextWidth)
    : option.name;

  return (
    <OptionContainer
      optionId={option.id}
      index={index}
      isHighlighted={isHighlighted}
      isExpanded={shouldExpand}
      isKeyboardNavigation={isKeyboardNavigation}
      onSelect={onSelect}
      onHighlight={onHighlight}
      onExpansion={onExpansion}
      dropdownMenuRef={dropdownMenuRef}
      optionName={option.name}
    >
      {withRadio && (
        <RadioIndicator
          isSelected={isSelected}
          isExpanded={shouldExpand}
        />
      )}
      <OptionText
        text={shouldExpand ? option.name : displayText}
        isSelected={isSelected}
        isHighlighted={isHighlighted}
        isExpanded={shouldExpand}
        shouldTruncate={shouldTruncate}
        title={option.name}
      />
    </OptionContainer>
  );
};

export default OptionItem;