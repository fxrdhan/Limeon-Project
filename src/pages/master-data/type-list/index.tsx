import { FaPlus } from "react-icons/fa";
import {
    Card,
    Button,
    Pagination,
    SearchBar,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableHeader,
    PageTitle
} from "@/components/modules";
import { AddEditModal } from "@/components/modules";
import { useMasterDataManagement } from "@/handlers";
import { useRef, useEffect } from 'react';

const TypeList = () => {
    const {
        isAddModalOpen,
        setIsAddModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        editingItem: editingType,
        search,
        setSearch,
        data: types,
        totalItems: totalTypes,
        totalPages,
        currentPage,
        itemsPerPage,
        isLoading,
        isError,
        queryError,
        isFetching,
        deleteMutation: deleteTypeMutation,
        openConfirmDialog,
        handleEdit,
        handleModalSubmit,
        handlePageChange,
        handleItemsPerPageChange,
        addMutation: addTypeMutation,
        updateMutation: updateTypeMutation,
        debouncedSearch
    } = useMasterDataManagement("item_types", "Jenis Item", true);

    const searchInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;

    useEffect(() => {
        searchInputRef.current?.focus();
    }, [currentPage, itemsPerPage, debouncedSearch]);

    return (
        <>
            <Card>
                <div className="mb-6">
                    <PageTitle title="Daftar Jenis Item" />
                </div>

                <div className="flex items-center">
                    <SearchBar
                        inputRef={searchInputRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nama atau deskripsi jenis item..."
                        className="flex-grow"
                    />
                    <Button
                        variant="primary"
                        className="flex items-center ml-4 mb-4"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <FaPlus className="mr-2" />
                        Tambah Jenis Item Baru
                    </Button>
                </div>

                {isError ? (
                    <div className="text-center p-6 text-red-500">
                        Error: {queryError?.message || "Gagal memuat data"}
                    </div>
                ) : (
                    <div className={isFetching ? "opacity-50 transition-opacity duration-300" : ""}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader className="w-[15%]">Nama Jenis</TableHeader>
                                    <TableHeader className="w-[85%]">Deskripsi</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading && (!types || types.length === 0) ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-gray-500 py-10">
                                            Memuat data jenis item...
                                        </TableCell>
                                    </TableRow>
                                ) : types && types.length > 0 ? (
                                    types.map((type) => (
                                        <TableRow
                                            key={type.id}
                                            onClick={() => handleEdit(type)}
                                            className="cursor-pointer hover:bg-blue-50"
                                        >
                                            <TableCell>{type.name}</TableCell>
                                            <TableCell>{("description" in type && type.description) ? type.description : "-"}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-gray-500 py-10">
                                            {debouncedSearch
                                                ? `Tidak ada jenis item dengan kata kunci "${debouncedSearch}"`
                                                : "Tidak ada data jenis item yang ditemukan"}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalTypes || 0}
                            itemsPerPage={itemsPerPage || 10}
                            itemsCount={types?.length || 0}
                            onPageChange={handlePageChange}
                            onItemsPerPageChange={handleItemsPerPageChange}
                        />
                    </div>
                )}
            </Card>

            <AddEditModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleModalSubmit}
                isLoading={addTypeMutation.isPending}
                entityName="Jenis Item"
                initialNameFromSearch={debouncedSearch}
            />

            <AddEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={handleModalSubmit}
                initialData={editingType || undefined}
                onDelete={
                    editingType
                        ? (typeId) => {
                            openConfirmDialog({
                                title: "Konfirmasi Hapus",
                                message: `Apakah Anda yakin ingin menghapus jenis item "${editingType.name}"?`,
                                variant: "danger",
                                confirmText: "Ya, Hapus",
                                onConfirm: async () => {
                                    await deleteTypeMutation.mutateAsync(typeId);
                                    // setIsEditModalOpen(false); // Dihandle oleh hook
                                },
                            });
                        }
                        : undefined
                }
                isLoading={updateTypeMutation.isPending}
                isDeleting={deleteTypeMutation.isPending}
                entityName="Jenis Item"
            />
        </>
    );
};

export default TypeList;
