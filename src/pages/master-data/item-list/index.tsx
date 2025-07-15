import Button from "@/components/button";
import SearchBar from "@/components/search-bar";
import PageTitle from "@/components/page-title";
import Pagination from "@/components/pagination";

import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
} from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);
import { FaPlus } from "react-icons/fa";
import { Card } from "@/components/card";
import type { Item as ItemDataType, UnitConversion } from "@/types";
import AddItemPortal from "@/components/add-edit/v2";
import { useMasterDataManagement } from "@/handlers/masterData";
import { getSearchState } from "@/utils/search";

function ItemList() {
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(
    null,
  ) as React.RefObject<HTMLInputElement>;
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const {
    search,
    setSearch,
    debouncedSearch,
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
  } = useMasterDataManagement("items", "Item", {
    realtime: true,
    searchInputRef,
    isCustomModalOpen: isAddItemModalOpen,
    locationKey: location.key,
  });

  const items = rawItems;

  const [editingItemId, setEditingItemId] = useState<string | undefined>(
    undefined,
  );
  const [currentSearchQueryForModal, setCurrentSearchQueryForModal] = useState<
    string | undefined
  >(undefined);
  const [modalRenderId, setModalRenderId] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const gridRef = useRef<AgGridReact>(null);

  useEffect(() => {
    if (items && items.length > 0 && gridRef.current) {
      setTimeout(() => {
        const columnsToAutoSize = [
          'code', 'barcode', 'category.name', 'type.name', 
          'unit.name', 'unit_conversions', 'base_price', 'sell_price', 'stock'
        ];
        gridRef.current?.api?.autoSizeColumns(columnsToAutoSize);
        setIsInitialLoad(false);
      }, 200);
    }
  }, [items]);

  const columnDefs: ColDef[] = [
    {
      field: "name",
      headerName: "Nama Item",
      filter: true,
      floatingFilter: true,
      minWidth: 200,
      flex: 1,
      cellStyle: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
      tooltipField: "name",
    },
    {
      field: "code",
      headerName: "Kode",
      filter: true,
      floatingFilter: true,
      minWidth: 80,
    },
    {
      field: "barcode",
      headerName: "Barcode",
      filter: true,
      floatingFilter: true,
      minWidth: 100,
      valueGetter: (params) => params.data.barcode || "-",
    },
    {
      field: "category.name",
      headerName: "Kategori",
      filter: true,
      floatingFilter: true,
      minWidth: 100,
    },
    {
      field: "type.name",
      headerName: "Jenis",
      filter: true,
      floatingFilter: true,
      minWidth: 120,
      cellStyle: {
        overflow: "visible",
        textOverflow: "unset",
        whiteSpace: "normal",
      },
    },
    {
      field: "unit.name",
      headerName: "Satuan",
      filter: true,
      floatingFilter: true,
      minWidth: 80,
    },
    {
      field: "unit_conversions",
      headerName: "Satuan Turunan",
      filter: false,
      minWidth: 140,
      valueGetter: (params) => {
        const conversions = params.data.unit_conversions;
        if (conversions && conversions.length > 0) {
          return conversions
            .map((uc: UnitConversion) => uc.unit?.name || "N/A")
            .join(", ");
        }
        return "-";
      },
    },
    {
      field: "base_price",
      headerName: "Harga Pokok",
      filter: "agNumberColumnFilter",
      floatingFilter: true,
      minWidth: 120,
      cellStyle: { textAlign: "right" },
      valueFormatter: (params) =>
        params.value.toLocaleString("id-ID", {
          style: "currency",
          currency: "IDR",
        }),
    },
    {
      field: "sell_price",
      headerName: "Harga Jual",
      filter: "agNumberColumnFilter",
      floatingFilter: true,
      minWidth: 120,
      cellStyle: { textAlign: "right" },
      valueFormatter: (params) =>
        params.value.toLocaleString("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }),
    },
    {
      field: "stock",
      headerName: "Stok",
      filter: "agNumberColumnFilter",
      floatingFilter: true,
      cellStyle: { textAlign: "center" },
    },
  ];

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

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (items.length > 0) {
        const firstItem = items[0] as ItemDataType;
        openAddItemModal(firstItem.id);
      } else if (debouncedSearch.trim() !== "") {
        openAddItemModal(undefined, debouncedSearch);
      }
    }
  };
  // eslint-disable-next-line
  const onRowClicked = (event: any) => {
    handleItemEdit(event.data);
  };

  return (
    <>
      <Card
        className={
          isLoadingState
            ? "opacity-75 transition-opacity duration-300 flex-1 flex flex-col"
            : "flex-1 flex flex-col"
        }
      >
        <div className="mb-6">
          <PageTitle title="Daftar Item" />
        </div>
        <div className="flex items-center">
          <SearchBar
            inputRef={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleItemKeyDown}
            placeholder="Cari nama atau kode item..."
            className="grow"
            searchState={getSearchState(search, debouncedSearch, items)}
          />
          <Button
            variant="primary"
            withGlow
            className="flex items-center ml-4 mb-4"
            onClick={() => openAddItemModal(undefined, debouncedSearch)}
          >
            <FaPlus className="mr-2" />
            Tambah Item Baru
          </Button>
        </div>
        {isErrorState && (
          <div className="text-center p-6 text-red-500">
            Error:{" "}
            {errorState instanceof Error
              ? errorState.message
              : "Gagal memuat data"}
          </div>
        )}
        {!isErrorState && (
          <>
            <div
              style={{
                width: "100%",
                marginTop: "1rem",
                marginBottom: "1rem",
                filter: isInitialLoad ? "blur(8px)" : "none",
                transition: "filter 0.3s ease-out",
              }}
            >
              <AgGridReact
                ref={gridRef}
                theme={themeQuartz}
                rowData={items as ItemDataType[]}
                columnDefs={columnDefs}
                domLayout="autoHeight"
                defaultColDef={{
                  sortable: true,
                  resizable: true,
                  filter: true,
                  cellDataType: false,
                  minWidth: 80,
                }}
                colResizeDefault="shift"
                onRowClicked={onRowClicked}
                rowSelection={{
                  mode: "singleRow",
                  checkboxes: false,
                }}
                suppressMovableColumns={true}
                cellSelection={false}
                suppressScrollOnNewData={true}
                suppressAnimationFrame={true}
                loading={isLoadingState}
                overlayNoRowsTemplate={
                  debouncedSearch
                    ? `<span style="padding: 10px; color: #888;">Tidak ada item dengan nama "${debouncedSearch}"</span>`
                    : '<span style="padding: 10px; color: #888;">Tidak ada data item yang ditemukan</span>'
                }
                rowClass="cursor-pointer"
                animateRows={true}
                loadThemeGoogleFonts={true}
              />
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItemsState}
              itemsPerPage={itemsPerPage}
              itemsCount={items.length}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </>
        )}
      </Card>
      <AddItemPortal
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
    </>
  );
}

export default ItemList;
