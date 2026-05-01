import React from 'react';
import { TbPlus } from 'react-icons/tb';

interface AddNewButtonProps {
  searchTerm: string;
  onAddNew: (term: string) => void;
}

const AddNewButton: React.FC<AddNewButtonProps> = ({
  searchTerm,
  onAddNew,
}) => {
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddNew(searchTerm);
  };

  return (
    <button
      type="button"
      aria-label="Tambah data baru"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors duration-150 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary/30"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <TbPlus
        className="scale-150 text-danger transition-all duration-300 ease-in-out"
        aria-hidden="true"
      />
    </button>
  );
};

export default AddNewButton;
