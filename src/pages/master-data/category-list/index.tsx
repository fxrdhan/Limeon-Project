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
    PageTitle,
    AddEditModal
} from "@/components/modules";
import { useMasterDataManagement } from "@/handlers";
import { useRef, useEffect } from 'react';

const CategoryList = () => {
    const {
        isAddModalOpen,
        setIsAddModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        editingItem: editingCategory,
        search,
        setSearch,
        data: categories,
        totalItems: totalCategories,
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
        addMutation,
        updateMutation,
        deleteMutation,
        openConfirmDialog,
        debouncedSearch,
    } = useMasterDataManagement("item_categories", "Kategori Item", true);

    const searchInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;

    useEffect(() => {
        searchInputRef.current?.focus();
    }, [currentPage, itemsPerPage, debouncedSearch]);

    return (
        <>
            <Card
                className={
                    isFetching ? "opacity-75 transition-opacity duration-300" : ""
                }
            >
                <div className="mb-6">
                    <PageTitle title="Daftar Kategori Item" />
                </div>

                <div className="flex items-center">
                    <SearchBar
                        inputRef={searchInputRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari kategori..."
                        className="flex-grow"
                    />
                    <Button
                        variant="primary"
                        className="flex items-center ml-4 mb-4"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <FaPlus className="mr-2" />
                        Tambah Kategori Baru
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
                                    <TableHeader className="w-[15%]">Nama Kategori</TableHeader>
                                    <TableHeader className="w-[85%]">Deskripsi</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading && (!categories || categories.length === 0) ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={2}
                                            className="text-center text-gray-500 py-10"
                                        >
                                            Memuat data kategori...
                                        </TableCell>
                                    </TableRow>
                                ) : categories && categories.length > 0 ? (
                                    categories.map((category) => (
                                        <TableRow
                                            key={category.id}
                                            onClick={() => handleEdit(category)}
                                            className="cursor-pointer hover:bg-blue-50"
                                        >
                                            <TableCell>{category.name}</TableCell>
                                            <TableCell>{("description" in category && category.description) ? category.description : "-"}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={2}
                                            className="text-center text-gray-500 py-10"
                                        >
                                            {debouncedSearch
                                                ? `Tidak ada kategori dengan kata kunci "${debouncedSearch}"`
                                                : "Tidak ada data kategori yang ditemukan"}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalCategories || 0}
                            itemsPerPage={itemsPerPage || 10}
                            itemsCount={categories?.length || 0}
                            onPageChange={handlePageChange}
                            onItemsPerPageChange={handleItemsPerPageChange}
                        />
                    </>
                )}
            </Card>

            <AddEditModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleModalSubmit}
                isLoading={addMutation.isPending}
                entityName="Kategori"
                initialNameFromSearch={debouncedSearch}
            />

            <AddEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={handleModalSubmit}
                initialData={editingCategory || undefined}
                onDelete={
                    editingCategory
                        ? (categoryId) => {
                            openConfirmDialog({
                                title: "Konfirmasi Hapus",
                                message: `Apakah Anda yakin ingin menghapus kategori item "${editingCategory.name}"?`,
                                variant: "danger",
                                confirmText: "Ya, Hapus",
                                onConfirm: async () => {
                                    await deleteMutation.mutateAsync(categoryId);
                                },
                            });
                        }
                        : undefined
                }
                isLoading={updateMutation.isPending}
                isDeleting={deleteMutation.isPending}
                entityName="Kategori"
            />
        </>
    );
};

export default CategoryList;
