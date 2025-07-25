import Button from "@/components/button";
import EnhancedSearchBar from "@/components/search-bar/EnhancedSearchBar";
import { FaPlus } from "react-icons/fa";
import type { TargetedSearch, SearchColumn } from "@/types/search";

interface SearchToolbarProps<T = unknown> {
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchBarProps: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onTargetedSearch: (targetedSearch: TargetedSearch | null) => void;
    onGlobalSearch: (searchValue: string) => void;
    onClearSearch: () => void;
    searchState: "idle" | "typing" | "found" | "not-found";
    columns: SearchColumn[];
    placeholder?: string;
  };
  search?: string;
  buttonText: string;
  placeholder?: string;
  onAdd: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  // Optional props for items tab specific behavior
  items?: T[];
  onItemSelect?: (item: T) => void;
}

export default function SearchToolbar<T extends { id: string }>({
  searchInputRef,
  searchBarProps,
  search,
  buttonText,
  placeholder,
  onAdd,
  onKeyDown,
  items,
  onItemSelect,
}: SearchToolbarProps<T>) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Use custom onKeyDown if provided
    if (onKeyDown) {
      onKeyDown(e);
      return;
    }

    // Default behavior for items tab
    if (e.key === "Enter" && items && onItemSelect) {
      e.preventDefault();

      if (items.length > 0) {
        const firstItem = items[0];
        onItemSelect(firstItem);
      } else if (search && search.trim() !== "") {
        onAdd();
      }
    }
  };

  return (
    <div className="flex items-center">
      <EnhancedSearchBar
        inputRef={searchInputRef}
        {...searchBarProps}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || searchBarProps.placeholder || "Cari..."}
        className="grow"
      />
      <Button
        variant="primary"
        withGlow
        className="flex items-center ml-4 mb-2"
        onClick={onAdd}
      >
        <FaPlus className="mr-2" />
        {buttonText}
      </Button>
    </div>
  );
}
