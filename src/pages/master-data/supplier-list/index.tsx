import { FaPlus } from "react-icons/fa";
import {
    Button,
    Card,
    CardHeader,
    Table,
    SearchBar,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableHeader,
    Pagination,
    PageTitle,
    useConfirmDialog
} from "@/components/modules";
import DetailEditModal from "./add-edit-supplier";
import { useSupplierHandlers } from "@/handlers";

const SupplierList = () => {
    const { openConfirmDialog } = useConfirmDialog();
    const {
        selectedSupplier,
        isEditModalOpen,
        isAddModalOpen,
        suppliers,
        isLoading,
        isError,
        queryError,
        isFetching,
        updateSupplierMutation,
        createSupplierMutation,
        updateSupplierImageMutation,
        deleteSupplierImageMutation,
        openSupplierDetail,
        openAddSupplierModal,
        closeEditModal,
        closeAddModal,
        handleDelete,
        handleNewSupplierImageUpload,
        supplierFields,
        transformSupplierForModal,
        emptySupplierData,
        search,
        setSearch,
        debouncedSearch,
        currentPage,
        itemsPerPage,
        totalItems,
        totalPages,
        handlePageChange,
        handleItemsPerPageChange
    } = useSupplierHandlers(openConfirmDialog);

    return (
        <Card>
            <CardHeader className="mb-6 px-0">
                <PageTitle title="Daftar Supplier" />
            </CardHeader>

            <div className="flex items-center">
                <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari supplier..."
                    className="flex-grow"
                />
                <Button
                    variant="primary"
                    className="flex items-center ml-4 mb-4"
                    onClick={openAddSupplierModal}
                >
                    <FaPlus className="mr-2" />
                    Tambah Supplier Baru
                </Button>
            </div>
            {isError && !isLoading && (
                <div className="text-center text-red-500">
                    Error: {queryError?.message || "Gagal memuat data"}
                </div>
            )}
            
            <div
                className={`${
                    isFetching ? "opacity-50 transition-opacity duration-300" : ""
                }`}
            >
                {!isError && (
                    <>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader className="w-[20%]">Nama Supplier</TableHeader>
                                    <TableHeader className="w-[60%]">Alamat</TableHeader>
                                    <TableHeader className="w-[10%]">Telepon</TableHeader>
                                    <TableHeader className="w-[10%]">Kontak Person</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading && (!suppliers || suppliers.length === 0) ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-gray-500 py-10">
                                            Memuat data supplier...
                                        </TableCell>
                                    </TableRow>
                                ) : suppliers && suppliers.length > 0 ? (
                                    suppliers.map((supplier) => (
                                        <TableRow
                                            key={supplier.id}
                                            onClick={() => openSupplierDetail(supplier)}
                                            className="cursor-pointer hover:bg-blue-50"
                                        >
                                            <TableCell>{supplier.name}</TableCell>
                                            <TableCell>{supplier.address || "-"}</TableCell>
                                            <TableCell>{supplier.phone || "-"}</TableCell>
                                            <TableCell>{supplier.contact_person || "-"}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-gray-500 py-10">
                                            {debouncedSearch
                                                ? `Tidak ada supplier dengan kata kunci "${debouncedSearch}"`
                                                : "Belum ada data supplier."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            itemsCount={suppliers?.length || 0}
                            onPageChange={handlePageChange}
                            onItemsPerPageChange={handleItemsPerPageChange}
                        />
                    </>
                )}
            </div>

            <DetailEditModal
                title={selectedSupplier?.name || ""}
                data={transformSupplierForModal(selectedSupplier)}
                fields={supplierFields}
                isOpen={isEditModalOpen}
                onClose={closeEditModal}
                onSave={async (
                    updatedData: Record<string, string | number | boolean | null>
                ) => {
                    if (selectedSupplier) {
                        await updateSupplierMutation.mutateAsync(updatedData);
                    }
                    return Promise.resolve();
                }}
                onImageSave={async (data: {
                    supplierId?: string;
                    imageBase64: string;
                }) => {
                    const idToUse = data.supplierId || selectedSupplier?.id;
                    if (idToUse) {
                        await updateSupplierImageMutation.mutateAsync({
                            supplierId: idToUse,
                            imageBase64: data.imageBase64,
                        });
                    }
                }}
                onImageDelete={async (supplierId?: string) => {
                    if (supplierId) {
                        await deleteSupplierImageMutation.mutateAsync(supplierId);
                    }
                }}
                onDeleteRequest={() => {
                    if (selectedSupplier) handleDelete(selectedSupplier);
                }}
                deleteButtonLabel="Hapus Supplier"
                imageUrl={selectedSupplier?.image_url || undefined}
                imagePlaceholder={
                    selectedSupplier
                        ? `https://picsum.photos/seed/${selectedSupplier.id}/400/300`
                        : undefined
                }
                mode="edit"
            />

            <DetailEditModal
                title="Tambah Supplier Baru"
                data={emptySupplierData}
                fields={supplierFields}
                isOpen={isAddModalOpen}
                onClose={closeAddModal}
                onSave={async (newSupplierData) => {
                    await createSupplierMutation.mutateAsync(newSupplierData);
                    return Promise.resolve();
                }}
                onImageSave={(data: { imageBase64: string }) => {
                    handleNewSupplierImageUpload(data.imageBase64);
                    return Promise.resolve();
                }}
                imagePlaceholder="https://via.placeholder.com/400x300?text=Foto+Supplier"
                mode="add"
            />
        </Card>
    );
};

export default SupplierList;
