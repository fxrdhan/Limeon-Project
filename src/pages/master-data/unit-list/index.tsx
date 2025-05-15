import { FaPlus } from "react-icons/fa";
import {
    Card,
    Button,
    Loading,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableHeader,
    Pagination,
    SearchBar,
} from "@/components/ui";
import { AddCategoryModal } from "@/components/ui/modal/add-edit";
import { useUnitManagement } from "./handlers";

const UnitList = () => {
    const {
        isAddModalOpen,
        setIsAddModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        editingUnit,
        search,
        setSearch,
        units,
        totalItems,
        isLoading,
        isError,
        queryError,
        isFetching,
        handleDelete,
        handleEdit,
        handleModalSubmit,
        handlePageChange,
        handleItemsPerPageChange,
        totalPages,
        currentPage,
        itemsPerPage,
        addUnitMutation,
        updateUnitMutation,
        deleteUnitMutation
    } = useUnitManagement();

    return (
        <>
            <Card
                className={
                    isFetching ? "opacity-75 transition-opacity duration-300" : ""
                }
            >
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 text-center flex-grow">
                        Daftar Satuan Item
                    </h1>
                    <Button
                        variant="primary"
                        className="flex items-center"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <FaPlus className="mr-2" />
                        Tambah Satuan Baru
                    </Button>
                </div>

                <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama atau deskripsi satuan..."
                />

                {isLoading ? (
                    <Loading message="Memuat satuan..." />
                ) : isError ? (
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
                                {units.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={2}
                                            className="text-center text-gray-500"
                                        >
                                            {search
                                                ? `Tidak ada satuan dengan nama "${search}"`
                                                : "Tidak ada data satuan yang ditemukan"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    units.map((unit) => (
                                        <TableRow
                                            key={unit.id}
                                            onClick={() => handleEdit(unit)}
                                            className="cursor-pointer hover:bg-blue-50"
                                        >
                                            <TableCell>{unit.name}</TableCell>
                                            <TableCell>{unit.description || "-"}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            itemsCount={units.length}
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
                isLoading={addUnitMutation.isPending}
                entityName="Satuan"
            />

            <AddCategoryModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={handleModalSubmit}
                initialData={editingUnit || undefined}
                onDelete={
                    editingUnit
                        ? (unitId) =>
                            handleDelete({
                                id: unitId,
                                name: editingUnit.name,
                                description: editingUnit.description,
                            })
                        : undefined
                }
                isLoading={updateUnitMutation.isPending}
                isDeleting={deleteUnitMutation.isPending}
                entityName="Satuan"
            />
        </>
    );
};

export default UnitList;
