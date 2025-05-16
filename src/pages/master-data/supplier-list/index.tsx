import { FaPlus } from "react-icons/fa";
import {
    Button,
    Loading,
    Card,
    CardHeader,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableHeader,
} from "@/components/modules";
import DetailEditModal from "@/components/modules/modal/supplier";
import { useConfirmDialog } from "@/components/modules/dialog-box";
import { useSupplierHandlers } from "@/pages/handlers";

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
        emptySupplierData
    } = useSupplierHandlers(openConfirmDialog);

    return (
        <Card>
            <CardHeader className="mb-6 px-0">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800 text-center flex-grow">
                        Daftar Supplier
                    </h1>
                    <Button
                        variant="primary"
                        className="flex items-center"
                        onClick={openAddSupplierModal}
                    >
                        <FaPlus className="mr-2" />
                        Tambah Supplier Baru
                    </Button>
                </div>
            </CardHeader>

            {isLoading && <Loading message="Memuat supplier..." />}
            {isError && (
                <div className="text-center text-red-500">
                    Error: {queryError?.message || "Gagal memuat data"}
                </div>
            )}

            {!isLoading && !isError && (
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
                        {suppliers && suppliers.length > 0 ? (
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
                                <TableCell colSpan={4} className="text-center text-gray-500">
                                    Belum ada data supplier.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}

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
