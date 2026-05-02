import SearchBar from '../SearchBar';
import { useComboboxContext } from '../../hooks/useComboboxContext';
import type { ComboboxSearchProps } from '../../types';

const ComboboxSearch = ({ className, style, render }: ComboboxSearchProps) => {
  const { searchInputRef, leaveTimeoutRef, onSearchKeyDown } =
    useComboboxContext();

  return (
    <SearchBar
      ref={searchInputRef}
      onKeyDown={onSearchKeyDown}
      onFocus={() => {}}
      leaveTimeoutRef={leaveTimeoutRef}
      className={className}
      style={style}
      render={render}
    />
  );
};

export default ComboboxSearch;
