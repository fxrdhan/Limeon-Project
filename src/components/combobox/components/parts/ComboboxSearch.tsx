import SearchBar from '../SearchBar';
import { useComboboxContext } from '../../hooks/useComboboxContext';

const ComboboxSearch = () => {
  const { searchInputRef, leaveTimeoutRef, onSearchKeyDown } =
    useComboboxContext();

  return (
    <SearchBar
      ref={searchInputRef}
      onKeyDown={onSearchKeyDown}
      onFocus={() => {}}
      leaveTimeoutRef={leaveTimeoutRef}
    />
  );
};

export default ComboboxSearch;
