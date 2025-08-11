import { type FC } from 'react';
import { truncateText, shouldTruncateText } from '@/utils/text';
import { DROPDOWN_CONSTANTS } from '../constants';
import OptionContainer from './options/OptionContainer';
import RadioIndicator from './options/RadioIndicator';
import OptionText from './options/OptionText';
import { useDropdownContext } from '../hooks/useDropdownContext';
import type { OptionItemProps } from '../types';

const OptionItem: FC<OptionItemProps> = ({
  option,
  index,
  isSelected,
  isHighlighted,
  isExpanded,
  onHighlight,
  dropdownMenuRef,
}) => {
  const {
    withRadio = false,
    isKeyboardNavigation,
    buttonRef,
    portalStyle,
    onSelect,
    onExpansion,
    onHoverDetailShow,
    onHoverDetailHide,
  } = useDropdownContext();

  // Use portal width if available, otherwise fall back to button width
  const buttonWidth = buttonRef.current?.getBoundingClientRect().width || 200;
  const portalWidth = portalStyle?.width
    ? typeof portalStyle.width === 'string'
      ? parseInt(portalStyle.width.replace('px', ''))
      : Number(portalStyle.width)
    : buttonWidth;

  const maxTextWidth =
    portalWidth -
    (withRadio
      ? DROPDOWN_CONSTANTS.BUTTON_PADDING +
        DROPDOWN_CONSTANTS.RADIO_EXTRA_PADDING
      : DROPDOWN_CONSTANTS.BUTTON_PADDING);
  const shouldTruncate = shouldTruncateText(option.name, maxTextWidth);
  const shouldExpand = isExpanded && shouldTruncate;
  const displayText =
    shouldTruncate && !shouldExpand
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
      option={option}
      onHoverDetailShow={onHoverDetailShow}
      onHoverDetailHide={onHoverDetailHide}
    >
      {withRadio && (
        <RadioIndicator isSelected={isSelected} isExpanded={shouldExpand} />
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
