import Button from "@/components/button";
import Pagination from "@/components/pagination";
import SearchBar from "@/components/search-bar";
import PageTitle from "@/components/page-title";
import AddEditModal from "@/components/add-edit/v1";

import { Card } from "@/components/card";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeader,
  TypeListSkeleton,
} from "@/components/table";
import { FaPlus } from "react-icons/fa";
import { useMasterDataManagement } from "@/handlers/masterData";
import { useRef } from "react";
import { useLocation } from "react-router-dom";
import { getSearchState } from "@/utils/search";

const TypeList = () => {
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(
    null,
  ) as React.RefObject<HTMLInputElement>;

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
    debouncedSearch,
    handleKeyDown,
  } = useMasterDataManagement("item_types", "Jenis Item", {
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
          <PageTitle title="Daftar Jenis Item" />
        </div>

        <div className="flex items-center">
          <SearchBar
            inputRef={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari nama atau deskripsi jenis item..."
            className="grow"
            searchState={getSearchState(search, debouncedSearch, types)}
          />
          <Button
            variant="primary"
            className="flex items-center ml-4 mb-4"
            onClick={() => setIsAddModalOpen(true)}
            withGlow
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
          <>
            {isLoading && (!types || types.length === 0) ? (
              <TypeListSkeleton rows={8} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader className="w-[15%]">Nama Jenis</TableHeader>
                    <TableHeader className="w-[85%]">Deskripsi</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {types && types.length > 0 ? (
                    types.map((type, index) => (
                      <TableRow
                        key={type.id}
                        onClick={() => handleEdit(type)}
                        className={`cursor-pointer hover:bg-blue-50 ${
                          index === 0 && debouncedSearch
                            ? "bg-emerald-100/50"
                            : ""
                        }`}
                      >
                        <TableCell>{type.name}</TableCell>
                        <TableCell>
                          {"description" in type && type.description
                            ? type.description
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
                          ? `Tidak ada jenis item dengan kata kunci "${debouncedSearch}"`
                          : "Tidak ada data jenis item yang ditemukan"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalTypes || 0}
              itemsPerPage={itemsPerPage || 10}
              itemsCount={types?.length || 0}
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
        isLoading={addTypeMutation.isPending}
        entityName="Jenis Item"
        initialNameFromSearch={debouncedSearch}
      />

      <AddEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
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
