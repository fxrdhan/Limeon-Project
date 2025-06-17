import Button from "@/components/modules/button";
import Pagination from "@/components/modules/pagination";
import SearchBar from "@/components/modules/search-bar";
import PageTitle from "@/components/modules/page-title";
import AddEditModal from "@/components/modules/add-edit/v1";

import { Card } from "@/components/modules/card";
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableHeader,
} from "@/components/modules/table";
import { FaPlus } from "react-icons/fa";
import { useMasterDataManagement } from "@/handlers/masterData";
import { useRef } from 'react';
import { useLocation } from "react-router-dom";

const UnitList = () => {
    const searchInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;
    const location = useLocation();

    const {
        isAddModalOpen,
        setIsAddModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        editingItem: editingUnit,
        search,
        setSearch,
        data: units,
        totalItems: totalUnits,
        isLoading,
        isError,
        queryError,
        isFetching,
        handleEdit,
        handleModalSubmit,
        handlePageChange,
        handleItemsPerPageChange,
        totalPages,
        currentPage,
        itemsPerPage,
        addMutation: addUnitMutation,
        updateMutation: updateUnitMutation,
        deleteMutation: deleteUnitMutation,
        openConfirmDialog,
        debouncedSearch,
        handleKeyDown,
    } = useMasterDataManagement("item_units", "Satuan", {
        realtime: true,
        searchInputRef,
        locationKey: location.key,
    });

    const handleCloseAddModal = () => {
        setIsAddModalOpen(false);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
    };

    return (
        <>
            <Card
                className={
                    isFetching ? "opacity-75 transition-opacity duration-300" : ""
                }
            >
                <div className="mb-6">
                    <PageTitle title="Daftar Satuan Item" />
                </div>

                <div className="flex items-center">
                    <SearchBar
                        inputRef={searchInputRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Cari nama atau deskripsi satuan..."
                        className="grow"
                    />
                    <Button
                        variant="primary"
                        className="flex items-center ml-4 mb-4"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <FaPlus className="mr-2" />
                        Tambah Satuan Baru
                    </Button>
                </div>

                {isError ? (
                    <div className="text-center p-6 text-red-500">
                        Error: {queryError?.message || "Gagal memuat data"}
                    </div>
                ) : (
                    <>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader className="w-[15%]">Nama Satuan</TableHeader>
                                    <TableHeader className="w-[85%]">Deskripsi</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading && (!units || units.length === 0) ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={2}
                                            className="text-center text-gray-500 py-10"
                                        >
                                            Memuat data satuan...
                                        </TableCell>
                                    </TableRow>
                                ) : units && units.length > 0 ? (
                                    units.map((unit, index) => (
                                        <TableRow
                                            key={unit.id}
                                            onClick={() => handleEdit(unit)}
                                            className={`cursor-pointer hover:bg-blue-50 ${
                                                index === 0 && debouncedSearch
                                                    ? "bg-teal-100/50"
                                                    : ""
                                            }`}
                                        >
                                            <TableCell>{unit.name}</TableCell>
                                            <TableCell>{("description" in unit && unit.description) ? unit.description : "-"}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={2}
                                            className="text-center text-gray-500 py-10"
                                        >
                                            {debouncedSearch
                                                ? `Tidak ada satuan dengan kata kunci "${debouncedSearch}"`
                                                : "Tidak ada data satuan yang ditemukan"}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalUnits || 0}
                            itemsPerPage={itemsPerPage || 10}
                            itemsCount={units?.length || 0}
                            onPageChange={handlePageChange}
                            onItemsPerPageChange={handleItemsPerPageChange}
                        />
                    </>
                )}
            </Card>

            <AddEditModal
                isOpen={isAddModalOpen}
                onClose={handleCloseAddModal}
                onSubmit={handleModalSubmit}
                isLoading={addUnitMutation.isPending}
                entityName="Satuan"
                initialNameFromSearch={debouncedSearch}
            />

            <AddEditModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                onSubmit={handleModalSubmit}
                initialData={editingUnit || undefined}
                onDelete={
                    editingUnit
                        ? (itemId) => {
                            openConfirmDialog({
                                title: "Konfirmasi Hapus",
                                message: `Apakah Anda yakin ingin menghapus satuan "${editingUnit.name}"?`,
                                variant: "danger",
                                confirmText: "Ya, Hapus",
                                onConfirm: async () => {
                                    await deleteUnitMutation.mutateAsync(itemId);
                                },
                            });
                        } : undefined
                }
                isLoading={updateUnitMutation.isPending}
                isDeleting={deleteUnitMutation.isPending}
                entityName="Satuan"
            />
        </>
    );
};

export default UnitList;
