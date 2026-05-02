import MenuContent from '../menu/MenuContent';
import EmptyState from '../menu/EmptyState';
import { useComboboxContext } from '../../hooks/useComboboxContext';
import ComboboxListItem from './ComboboxListItem';
import type { ComboboxListProps } from '../../types';

const ComboboxList = ({
  children,
  className,
  style,
  render,
}: ComboboxListProps) => {
  const {
    isOpen,
    filteredOptions,
    highlightedIndex,
    withCheckbox,
    listboxId,
    activeDescendantId,
    searchState,
    searchTerm,
    onAddNew,
    onKeyDown,
    onScroll,
    searchList,
    scrollState,
    optionsContainerRef,
  } = useComboboxContext();

  const usesDefaultContent = children === undefined;
  const content = usesDefaultContent
    ? filteredOptions.map((option, index) => (
        <ComboboxListItem key={option.id} option={option} index={index} />
      ))
    : children;

  const listProps = {
    id: listboxId,
    ref: optionsContainerRef,
    role: 'listbox',
    'aria-label': 'Daftar pilihan',
    'aria-multiselectable': withCheckbox ? true : undefined,
    'aria-activedescendant': activeDescendantId,
    'data-list-empty': filteredOptions.length === 0 ? '' : undefined,
    'data-popup-open': isOpen ? '' : undefined,
    tabIndex: -1,
    className: `relative p-1 max-h-60 overflow-y-auto focus:outline-hidden ${className ?? ''}`,
    style,
    onScroll,
    onKeyDown: !searchList ? onKeyDown : undefined,
    children: (
      <>
        {content}
        {usesDefaultContent && filteredOptions.length === 0 && (
          <EmptyState
            searchState={searchState}
            searchTerm={searchTerm}
            hasAddNew={!!onAddNew}
          />
        )}
      </>
    ),
  };
  const state = {
    open: isOpen,
    empty: filteredOptions.length === 0,
    highlightedIndex,
  };

  return (
    <MenuContent scrollState={scrollState}>
      {render ? render(listProps, state) : <div {...listProps} />}
    </MenuContent>
  );
};

export default ComboboxList;
