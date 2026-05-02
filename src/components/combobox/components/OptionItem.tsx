import { type FC } from 'react';
import OptionRow from './options/OptionRow';
import { useComboboxContext } from '../hooks/useComboboxContext';
import type { OptionItemProps } from '../types';

const OptionItem: FC<OptionItemProps> = ({
  option,
  index,
  optionId,
  optionCount,
  isSelected,
  isHighlighted,
  suppressHighlightBackground,
  activeBackgroundLayoutId,
  isExpanded,
  onHighlight,
  dropdownMenuRef,
}) => {
  const {
    withRadio = false,
    withCheckbox = false,
    isKeyboardNavigation,
    portalStyle,
    searchTerm,
    onSelect,
    onHoverDetailShow,
    onHoverDetailHide,
  } = useComboboxContext();

  return (
    <OptionRow
      option={option}
      index={index}
      optionId={optionId}
      optionCount={optionCount}
      isSelected={isSelected}
      isHighlighted={isHighlighted}
      suppressHighlightBackground={suppressHighlightBackground}
      activeBackgroundLayoutId={activeBackgroundLayoutId}
      isKeyboardNavigation={isKeyboardNavigation}
      isExpanded={isExpanded}
      portalWidth={portalStyle?.width}
      searchTerm={searchTerm}
      withRadio={withRadio}
      withCheckbox={withCheckbox}
      onSelect={onSelect}
      onHighlight={onHighlight}
      dropdownMenuRef={dropdownMenuRef}
      onHoverDetailShow={onHoverDetailShow}
      onHoverDetailHide={onHoverDetailHide}
    />
  );
};

export default OptionItem;
