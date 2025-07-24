import Button from "@/components/button";
import EnhancedSearchBar from "@/components/search-bar/EnhancedSearchBar";
import { FaPlus } from "react-icons/fa";
import type { Item as ItemDataType } from "@/types";
import type { TargetedSearch, SearchColumn } from "@/types/search";

interface ItemSearchToolbarProps {
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
  search: string;
  items: ItemDataType[];
  onAddItem: (itemId?: string, searchQuery?: string) => void;
  onItemSelect: (itemId: string) => void;
}

export default function ItemSearchToolbar({
  searchInputRef,
  searchBarProps,
  search,
  items,
  onAddItem,
  onItemSelect,
}: ItemSearchToolbarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (items.length > 0) {
        const firstItem = items[0] as ItemDataType;
        onItemSelect(firstItem.id);
      } else if (search.trim() !== "") {
        onAddItem(undefined, search);
      }
    }
  };

  return (
    <div className="flex items-center">
      <EnhancedSearchBar
        inputRef={searchInputRef}
        {...searchBarProps}
        onKeyDown={handleKeyDown}
        placeholder="Cari di semua kolom atau ketik # untuk pencarian kolom spesifik..."
        className="grow"
      />
      <Button
        variant="primary"
        withGlow
        className="flex items-center ml-4 mb-4"
        onClick={() => onAddItem(undefined, search)}
      >
        <FaPlus className="mr-2" />
        Tambah Item Baru
      </Button>
    </div>
  );
}