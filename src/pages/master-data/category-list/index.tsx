import { FaPlus } from "react-icons/fa";
import {
    Card, Button, Loading, Pagination, SearchBar, Table, TableHead, TableBody, TableRow, TableCell, TableHeader
} from "@/components/ui";
import { AddCategoryModal } from "@/components/ui/modal/add-edit";
import { useMasterDataManagement } from "@/pages/handlers";

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
    } = useMasterDataManagement("item_categories", "Kategori Item");

    return (
        <>
            <Card
                className={
                    isFetching ? "opacity-75 transition-opacity duration-300" : ""
                }
            >
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 text-center flex-grow">
                        Daftar Kategori Item
                    </h1>
                    <Button
                        variant="primary"
                        className="flex items-center"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <FaPlus className="mr-2" />
                        Tambah Kategori Baru
                    </Button>
                </div>

                <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari kategori..."
                />

                {isLoading ? (
                    <Loading />
                ) : isError ? (
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
                                {categories?.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={2}
                                            className="text-center text-gray-500"
                                        >
                                            {debouncedSearch
                                                ? `Tidak ada kategori dengan kata kunci "${debouncedSearch}"`
                                                : "Tidak ada data kategori yang ditemukan"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    categories.map((category) => (
                                        <TableRow
                                            key={category.id}
                                            onClick={() => handleEdit(category)}
                                            className="cursor-pointer hover:bg-blue-50"
                                        >
                                            <TableCell>{category.name}</TableCell>
                                            <TableCell>{category.description}</TableCell>
                                        </TableRow>
                                    ))
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

            <AddCategoryModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleModalSubmit}
                isLoading={addMutation.isPending}
                entityName="Kategori"
            />

            <AddCategoryModal
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
                                    // setIsEditModalOpen(false); // Dihandle oleh hook
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
