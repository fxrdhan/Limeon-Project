import { FaPlus } from "react-icons/fa";
import {
    Card,
    Button,
    Loading,
    Pagination,
    SearchBar,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableHeader,
} from "@/components/ui";
import { AddCategoryModal } from "@/components/ui/modal/add-edit";
import { useTypeList } from "./handlers";

const TypeList = () => {
    const {
        isAddModalOpen,
        setIsAddModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        editingType,
        search,
        setSearch,
        types,
        totalTypes,
        totalPages,
        currentPage,
        itemsPerPage,
        isLoading,
        isError,
        queryError,
        isFetching,
        deleteTypeMutation,
        openConfirmDialog,
        handleEdit,
        handleModalSubmit,
        handlePageChange,
        handleItemsPerPageChange,
        addTypeMutation,
        updateTypeMutation
    } = useTypeList();

    return (
        <>
            <Card
                className={
                    isFetching ? "opacity-75 transition-opacity duration-300" : ""
                }
            >
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 text-center flex-grow">
                        Daftar Jenis Item
                    </h1>
                    <Button
                        variant="primary"
                        className="flex items-center"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <FaPlus className="mr-2" />
                        Tambah Jenis Item Baru
                    </Button>
                </div>

                <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama atau deskripsi jenis item..."
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
                                    <TableHeader className="w-[15%]">Nama Jenis</TableHeader>
                                    <TableHeader className="w-[85%]">Deskripsi</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {types.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={2}
                                            className="text-center text-gray-500"
                                        >
                                            {search
                                                ? `Tidak ada jenis item dengan nama "${search}"`
                                                : "Tidak ada data jenis item yang ditemukan"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    types.map((type) => (
                                        <TableRow
                                            key={type.id}
                                            onClick={() => handleEdit(type)}
                                            className="cursor-pointer hover:bg-blue-50"
                                        >
                                            <TableCell>{type.name}</TableCell>
                                            <TableCell>{type.description}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalTypes}
                            itemsPerPage={itemsPerPage}
                            itemsCount={types.length}
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
                isLoading={addTypeMutation.isPending}
                entityName="Jenis Item"
            />

            <AddCategoryModal
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
                                confirmText: "Hapus",
                                onConfirm: () => {
                                    deleteTypeMutation.mutate(typeId);
                                    setIsEditModalOpen(false);
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
