import { useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
    Card,
    Button,
    SearchBar,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableHeader,
    Pagination,
    PageTitle,
} from "@/components/modules";
import { FaPlus } from "react-icons/fa";
import type { Item as ItemDataType, UnitConversion } from "@/types";
import AddItemPortal from "./add-edit";
import { useMasterDataManagement } from "@/handlers/masterData";

function ItemList() {
    const location = useLocation();
    const searchInputRef = useRef<HTMLInputElement>(
        null
    ) as React.RefObject<HTMLInputElement>;
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

    const {
        search,
        setSearch,
        
        debouncedSearch,
        currentPage,
        itemsPerPage,
        data: items,
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

    const [editingItemId, setEditingItemId] = useState<string | undefined>(
        undefined
    );
    const [currentSearchQueryForModal, setCurrentSearchQueryForModal] = useState<
        string | undefined
    >(undefined);
    const pageWrapperRef = useRef<HTMLDivElement>(null);

    const openAddItemModal = (itemId?: string, searchQuery?: string) => {
        setEditingItemId(itemId);
        setCurrentSearchQueryForModal(searchQuery);
        setIsAddItemModalOpen(true);
    };

    const closeAddItemModal = () => {
        setIsAddItemModalOpen(false);
        setEditingItemId(undefined);
        setCurrentSearchQueryForModal(undefined);
    };

    return (
        <>
            <div ref={pageWrapperRef} className="h-full flex flex-col">
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
                            placeholder="Cari nama atau kode item..."
                            className="flex-grow"
                        />
                        <Button
                            variant="primary"
                            className="flex items-center ml-4 mb-4 focus:outline-none focus:border-none focus:shadow-[0_0_5px_theme(colors.primary),0_0_15px_theme(colors.primary),0_0_30px_theme(colors.primary)] rounded-lg transition-shadow duration-300"
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
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableHeader className="w-[23%]">Nama Item</TableHeader>
                                        <TableHeader className="w-[6%]">Kode</TableHeader>
                                        <TableHeader className="w-[8%]">Barcode</TableHeader>
                                        <TableHeader className="w-[8%]">Kategori</TableHeader>
                                        <TableHeader className="w-[14%]">Jenis</TableHeader>
                                        <TableHeader className="w-[6%]">Satuan</TableHeader>
                                        <TableHeader className="w-[10%]">
                                            Satuan Turunan
                                        </TableHeader>
                                        <TableHeader className="w-[10%] text-right">
                                            Harga Pokok
                                        </TableHeader>
                                        <TableHeader className="w-[10%] text-right">
                                            Harga Jual
                                        </TableHeader>
                                        <TableHeader className="w-[5%] text-center">
                                            Stok
                                        </TableHeader>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {isLoadingState && items.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={10}
                                                className="text-center text-gray-500 py-10"
                                            >
                                                Memuat data item...
                                            </TableCell>
                                        </TableRow>
                                    ) : items.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={10}
                                                className="text-center text-gray-500 py-10"
                                            >
                                                {debouncedSearch
                                                    ? `Tidak ada item dengan nama "${debouncedSearch}"`
                                                    : "Tidak ada data item yang ditemukan"}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        (items as ItemDataType[]).map((item) => (
                                            <TableRow
                                                key={item.id}
                                                onClick={() => openAddItemModal(item.id)}
                                                className="cursor-pointer hover:bg-blue-50"
                                            >
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>{item.code}</TableCell>
                                                <TableCell>{item.barcode || "-"}</TableCell>
                                                <TableCell>{item.category.name}</TableCell>
                                                <TableCell>{item.type.name}</TableCell>
                                                <TableCell>{item.unit.name}</TableCell>
                                                <TableCell>
                                                    {item.unit_conversions &&
                                                        item.unit_conversions.length > 0
                                                        ? item.unit_conversions
                                                            .map(
                                                                (uc: UnitConversion) => uc.unit?.name || "N/A"
                                                            )
                                                            .join(", ")
                                                        : "-"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.base_price.toLocaleString("id-ID", {
                                                        style: "currency",
                                                        currency: "IDR",
                                                    })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.sell_price.toLocaleString("id-ID", {
                                                        style: "currency",
                                                        currency: "IDR",
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 0,
                                                    })}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {item.stock}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
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
                    isOpen={isAddItemModalOpen}
                    onClose={closeAddItemModal}
                    itemId={editingItemId}
                    initialSearchQuery={currentSearchQueryForModal}
                />
            </div>
        </>
    );
}

export default ItemList;
