import OptionItem from '../OptionItem';
import { useComboboxContext } from '../../hooks/useComboboxContext';
import type { ComboboxOption } from '@/types';

interface ComboboxListItemProps {
  option: ComboboxOption;
  index?: number;
}

const ComboboxListItem = ({ option, index }: ComboboxListItemProps) => {
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
    <OptionItem
      option={option}
      index={resolvedIndex}
      optionId={getOptionId(option.id)}
      optionCount={filteredOptions.length}
      isSelected={isSelected}
      isHighlighted={highlightedIndex === resolvedIndex}
      suppressHighlightBackground={false}
      isExpanded={expandedId === option.id}
      onHighlight={nextIndex => {
        onSetIsKeyboardNavigation(false);
        onSetHighlightedIndex(nextIndex);
      }}
      dropdownMenuRef={dropdownMenuRef}
    />
  );
};

export default ComboboxListItem;
