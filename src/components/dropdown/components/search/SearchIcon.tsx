import React from 'react';
import { TbSearch } from 'react-icons/tb';
import { getSearchIconColor } from '../../utils/dropdownUtils';

interface SearchIconProps {
  searchState: string;
  hasSearchTerm: boolean;
  position?: 'absolute' | 'relative';
}

const SearchIcon: React.FC<SearchIconProps> = ({
  searchState,
  hasSearchTerm,
  position = 'absolute',
}) => {
  const iconColor = getSearchIconColor(searchState);

  if (hasSearchTerm && position === 'absolute') return null;

  const baseClasses = `${iconColor} transition-all duration-300 ease-in-out`;

  const positionClasses =
    position === 'absolute'
      ? 'absolute top-2.5 right-2 opacity-100 transform translate-x-0'
      : 'scale-125 ml-1 mr-1';

  const sizeStyle =
    position === 'relative' ? { width: '16px', minWidth: '16px' } : undefined;

  return (
    <TbSearch
      className={`${baseClasses} ${positionClasses}`}
      size={position === 'absolute' ? 16 : undefined}
      style={sizeStyle}
    />
  );
};

export default SearchIcon;
