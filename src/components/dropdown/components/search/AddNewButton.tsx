import React from 'react';
import { FaPlus } from 'react-icons/fa6';
import { getSearchIconColor } from '../../utils/dropdownUtils';

interface AddNewButtonProps {
  searchTerm: string;
  searchState: string;
  onAddNew: (term: string) => void;
}

const AddNewButton: React.FC<AddNewButtonProps> = ({
  searchTerm,
  searchState,
  onAddNew,
}) => {
  const iconColor = getSearchIconColor(searchState);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddNew(searchTerm);
  };

  return (
    <FaPlus
      className={`${iconColor} transition-all duration-300 ease-in-out cursor-pointer mr-1 ml-1 scale-150`}
      style={{ width: '16px', minWidth: '16px' }}
      onClick={handleClick}
    />
  );
};

export default AddNewButton;