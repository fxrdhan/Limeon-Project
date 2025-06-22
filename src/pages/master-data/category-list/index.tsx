import Button from "@/components/button";
import Pagination from "@/components/pagination";
import SearchBar from "@/components/search-bar";
import PageTitle from "@/components/page-title";
import AddEditModal from "@/components/add-edit/v1";

import { FaPlus } from "react-icons/fa";
import { Card } from "@/components/card";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeader,
  CategoryListSkeleton,
} from "@/components/table";
import { useMasterDataManagement } from "@/handlers/masterData";
import { useRef } from "react";
import { useLocation } from "react-router-dom";

const CategoryList = () => {
  const searchInputRef = useRef<HTMLInputElement>(
    null,
  ) as React.RefObject<HTMLInputElement>;
  const location = useLocation();

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
    handleKeyDown,
  } = useMasterDataManagement("item_categories", "Kategori Item", {
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
          <PageTitle title="Daftar Kategori Item" />
        </div>

        <div className="flex items-center">
          <SearchBar
            inputRef={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari nama atau deskripsi kategori item..."
            className="grow"
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
            {isLoading && (!categories || categories.length === 0) ? (
              <CategoryListSkeleton rows={8} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader className="w-[15%]">Nama Kategori</TableHeader>
                    <TableHeader className="w-[85%]">Deskripsi</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories && categories.length > 0 ? (
                    categories.map((category, index) => (
                      <TableRow
                        key={category.id}
                        onClick={() => handleEdit(category)}
                        className={`cursor-pointer hover:bg-blue-50 ${
                          index === 0 && debouncedSearch ? "bg-emerald-100/50" : ""
                        }`}
                      >
                        <TableCell>{category.name}</TableCell>
                        <TableCell>
                          {"description" in category && category.description
                            ? category.description
                            : "-"}
                        </TableCell>
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
            )}
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
        onClose={handleCloseAddModal}
        onSubmit={handleModalSubmit}
        isLoading={addMutation.isPending}
        entityName="Kategori"
        initialNameFromSearch={debouncedSearch}
      />

      <AddEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
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
