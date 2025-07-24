import { useState, useRef, useCallback } from "react";
import { useUnifiedSearch } from "@/hooks/useUnifiedSearch";
import type { Item as ItemDataType } from "@/types";
import ItemManagementPage from "@/pages/ItemManagementPage";

// Use the new modular architecture
import { useMasterDataManagement } from "@/handlers/masterData";
import { itemSearchColumns } from "@/utils/searchColumns";

// Atomic Design Components
import ItemListTemplate from "@/components/templates/ItemListTemplate";
import ItemSearchToolbar from "@/components/molecules/ItemSearchToolbar";
import ItemDataTable from "@/components/organisms/ItemDataTable";
import { useItemGridColumns } from "@/components/molecules/ItemGridColumns";

function ItemListNew() {
  const searchInputRef = useRef<HTMLInputElement>(
    null,
  ) as React.RefObject<HTMLInputElement>;
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Data management hook for server-side operations
  const {
    currentPage,
    itemsPerPage,
    data: rawItems,
    totalItems: totalItemsState,
    totalPages,
    isLoading: isLoadingState,
    isError: isErrorState,
    queryError: errorState,
    handlePageChange,
    handleItemsPerPageChange,
    setSearch: setDataSearch,
  } = useMasterDataManagement("items", "Item", {
    searchInputRef,
    isCustomModalOpen: isAddItemModalOpen,
  });

  // Stable callback functions to prevent infinite re-renders
  const handleSearch = useCallback((searchValue: string) => {
    setDataSearch(searchValue);
  }, [setDataSearch]);

  const handleClear = useCallback(() => {
    setDataSearch("");
  }, [setDataSearch]);

  // Unified search functionality with hybrid mode
  const {
    search,
    onGridReady,
    isExternalFilterPresent,
    doesExternalFilterPass,
    searchBarProps,
  } = useUnifiedSearch({
    columns: itemSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: rawItems,
    onSearch: handleSearch,
    onClear: handleClear,
  });

  const items = rawItems;

  // Grid columns configuration
  const { columnDefs, columnsToAutoSize } = useItemGridColumns();

  const [editingItemId, setEditingItemId] = useState<string | undefined>(
    undefined,
  );
  const [currentSearchQueryForModal, setCurrentSearchQueryForModal] = useState<
    string | undefined
  >(undefined);
  const [modalRenderId, setModalRenderId] = useState(0);

  const openAddItemModal = (itemId?: string, searchQuery?: string) => {
    // Set the data for the modal
    setEditingItemId(itemId);
    setCurrentSearchQueryForModal(searchQuery);

    // Ensure the modal is not in a closing state and is open
    setIsClosing(false);
    setIsAddItemModalOpen(true);

    // Force re-mount of the modal component by updating its key
    setModalRenderId((prevId) => prevId + 1);
  };

  const closeAddItemModal = () => {
    setIsClosing(true); // Trigger fade-out animation
    setTimeout(() => {
      setIsAddItemModalOpen(false); // Close modal after animation
      setIsClosing(false); // Reset closing state
      setEditingItemId(undefined);
      setCurrentSearchQueryForModal(undefined);
    }, 100); // Adjust timeout to match animation duration
  };

  const handleItemEdit = (item: ItemDataType) => {
    openAddItemModal(item.id);
  };

  const handleItemSelect = (itemId: string) => {
    openAddItemModal(itemId);
  };

  const handleAddItem = (itemId?: string, searchQuery?: string) => {
    openAddItemModal(itemId, searchQuery);
  };

  return (
    <ItemListTemplate
      isLoading={isLoadingState}
      searchToolbar={
        <ItemSearchToolbar
          searchInputRef={searchInputRef}
          searchBarProps={searchBarProps}
          search={search}
          items={items as ItemDataType[]}
          onAddItem={handleAddItem}
          onItemSelect={handleItemSelect}
        />
      }
      dataTable={
        <ItemDataTable
          items={items as ItemDataType[]}
          columnDefs={columnDefs}
          columnsToAutoSize={columnsToAutoSize}
          isLoading={isLoadingState}
          isError={isErrorState}
          error={errorState}
          search={search}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItemsState}
          itemsPerPage={itemsPerPage}
          onRowClick={handleItemEdit}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          onGridReady={onGridReady}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
        />
      }
      modal={
        <ItemManagementPage
          key={`${
            editingItemId ?? "new"
          }-${currentSearchQueryForModal ?? ""}-${modalRenderId}`}
          isOpen={isAddItemModalOpen}
          onClose={closeAddItemModal}
          itemId={editingItemId}
          initialSearchQuery={currentSearchQueryForModal}
          isClosing={isClosing}
          setIsClosing={setIsClosing}
        />
      }
    />
  );
}

export default ItemListNew;