import OptionItem from '../OptionItem';
import { useComboboxContext } from '../../hooks/useComboboxContext';
import type { ComboboxListItemProps } from '../../types';

const ComboboxListItem = ({
  option,
  index,
  className,
  style,
  render,
}: ComboboxListItemProps) => {
  const {
    filteredOptions,
    value,
    withCheckbox,
    highlightedIndex,
    expandedId,
    getOptionId,
    dropdownMenuRef,
    onSetHighlightedIndex,
    onSetIsKeyboardNavigation,
  } = useComboboxContext();
  const resolvedIndex =
    index ?? filteredOptions.findIndex(item => item.id === option.id);

  if (resolvedIndex < 0) {
    return null;
  }

  const isSelected = withCheckbox
    ? Array.isArray(value) && value.includes(option.id)
    : value === option.id;

  return (
    <div data-dropdown-option-frame data-dropdown-option-index={resolvedIndex}>
      <OptionItem
        option={option}
        index={resolvedIndex}
        optionId={getOptionId(option.id)}
        optionCount={filteredOptions.length}
        isSelected={isSelected}
        isHighlighted={highlightedIndex === resolvedIndex}
        suppressHighlightBackground={false}
        isExpanded={expandedId === option.id}
        onHighlight={(nextIndex, event) => {
          onSetIsKeyboardNavigation(false);
          onSetHighlightedIndex(nextIndex, event);
        }}
        dropdownMenuRef={dropdownMenuRef}
        className={className}
        style={style}
        render={render}
      />
    </div>
  );
};

export default ComboboxListItem;
