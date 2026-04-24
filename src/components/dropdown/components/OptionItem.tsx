import { type FC } from "react";
import OptionRow from "./options/OptionRow";
import { useDropdownContext } from "../hooks/useDropdownContext";
import type { OptionItemProps } from "../types";

const OptionItem: FC<OptionItemProps> = ({
  option,
  index,
  isSelected,
  isHighlighted,
  suppressHighlightBackground,
  isExpanded,
  onHighlight,
  dropdownMenuRef,
}) => {
  const {
    withRadio = false,
    withCheckbox = false,
    isKeyboardNavigation,
    portalStyle,
    onSelect,
    onHoverDetailShow,
    onHoverDetailHide,
  } = useDropdownContext();

  return (
    <OptionRow
      option={option}
      index={index}
      isSelected={isSelected}
      isHighlighted={isHighlighted}
      suppressHighlightBackground={suppressHighlightBackground}
      isKeyboardNavigation={isKeyboardNavigation}
      isExpanded={isExpanded}
      portalWidth={portalStyle?.width}
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
