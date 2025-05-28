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
} from "@/components/modules";
import DetailEditModal from "./modal";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";
import type {
    Supplier as SupplierType,
    FieldConfig as FieldConfigSupplier,
} from "@/types";
import { useMasterDataManagement } from "@/handlers";
import { StorageService } from "@/lib/storageUtils";

const SupplierList = () => {
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierType | null>(
        null
    );
    const [, setNewSupplierImage] = useState<string | null>(null);

    const {
        handlePageChange,
        itemsPerPage,
        isAddModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        setIsAddModalOpen,
        handleItemsPerPageChange,
        search,
        setSearch,
        debouncedSearch,
        setDebouncedSearch,
        currentPage,
        setCurrentPage,
        queryClient,
        openConfirmDialog,
        totalItems,
        queryError,
        data: suppliersData,
        isLoading,
        isError,
        isFetching
    } = useMasterDataManagement("suppliers", "Supplier", true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, setCurrentPage, setDebouncedSearch]);

    const suppliers = suppliersData || [];
    const currentTotalItems = totalItems || 0;
    const updateSupplier = async (updatedData: Partial<SupplierType>) => {
        if (!selectedSupplier || !selectedSupplier.id) {
            console.error("Tidak dapat memperbarui: selectedSupplier atau ID-nya hilang.");
            return;
        }
        const { ...dataToUpdate } = updatedData;

        const { error } = await supabase
            .from("suppliers")
            .update(dataToUpdate)
            .eq("id", selectedSupplier.id);
        if (error) throw error;
    };

    const createSupplier = async (newSupplier: Partial<SupplierType>) => {
        const dataToInsert = { ...newSupplier };
        const { data, error } = await supabase
            .from("suppliers")
            .insert([dataToInsert])
            .select();
        if (error) throw error;
        return data[0];
    };

    const updateSupplierMutation = useMutation<
        void,
        Error,
        Partial<SupplierType>
    >({
        mutationFn: updateSupplier,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            if (selectedSupplier) {
                setSelectedSupplier((prev) =>
                    prev ? { ...prev, ...variables } : null
                );
            }
        },
        onError: (error) => {
            console.error("Error updating supplier:", error);
            alert(`Gagal memperbarui supplier: ${error.message}`);
        },
    });

    const createSupplierMutation = useMutation<
        SupplierType,
        Error,
        Partial<SupplierType>
    >({
        mutationFn: createSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            setIsAddModalOpen(false);
            setNewSupplierImage(null);
        },
        onError: (error) => {
            console.error("Error creating supplier:", error);
            alert(`Gagal membuat supplier baru: ${error.message}`);
        },
    });

    const deleteSupplierMutation = useMutation({
        mutationFn: async (supplierId: string) => {
            const { error } = await supabase
                .from("suppliers")
                .delete()
                .eq("id", supplierId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            setIsEditModalOpen(false);
            setSelectedSupplier(null);
        },
        onError: (error: Error) => {
            console.error("Error deleting supplier:", error);
            alert(`Gagal menghapus supplier: ${error.message}`);
        },
    });

    const updateSupplierImageMutation = useMutation<
        string | undefined, // Specify that mutationFn returns the new image URL or undefined
        Error,
        { supplierId: string; file: File }
    >({
        mutationFn: async ({
            supplierId,
            file,
        }: {
            supplierId: string;
            file: File;
        }) => {
            const { data: supplierData } = await supabase
                .from("suppliers")
                .select("image_url")
                .eq("id", supplierId)
                .single();

            if (supplierData?.image_url) {
                const oldPath = StorageService.extractPathFromUrl(supplierData.image_url, 'suppliers');
                if (oldPath) {
                    await StorageService.deleteSupplierImage(oldPath);
                }
            }

            const { publicUrl } = await StorageService.uploadSupplierImage(supplierId, file);

            const { error } = await supabase
                .from("suppliers")
                .update({
                    image_url: publicUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", supplierId);
            if (error) throw error;
            return publicUrl; // Return the new public URL
        },
        onSuccess: (newImageUrl) => { // newImageUrl is the publicUrl returned by mutationFn
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            // Update selectedSupplier state with the new image URL
            if (newImageUrl && selectedSupplier) {
                setSelectedSupplier(prev => {
                    if (!prev) return null;
                    return { ...prev, image_url: newImageUrl };
                });
            }
        },
        onError: (error) => {
            console.error("Error updating supplier image:", error);
            alert(`Gagal memperbarui foto supplier: ${error.message}`);
        },
    });

    const openSupplierDetail = (supplier: SupplierType) => {
        setSelectedSupplier(supplier);
        setIsEditModalOpen(true);
    };

    const openAddSupplierModal = () => {
        setIsAddModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        setNewSupplierImage(null);
    };

    const handleDelete = (supplier: SupplierType) => {
        openConfirmDialog({
            title: "Konfirmasi Hapus",
            message: `Apakah Anda yakin ingin menghapus supplier "${supplier.name}"? Tindakan ini tidak dapat diurungkan.`,
            variant: "danger",
            confirmText: "Hapus",
            onConfirm: () => deleteSupplierMutation.mutate(supplier.id),
        });
    };

    const supplierFields: FieldConfigSupplier[] = [
        { key: "name", label: "Nama Supplier", type: "text", editable: true },
        { key: "address", label: "Alamat", type: "textarea", editable: true },
        { key: "phone", label: "Telepon", type: "tel", editable: true },
        { key: "email", label: "Email", type: "email", editable: true },
        {
            key: "contact_person",
            label: "Kontak Person",
            type: "text",
            editable: true,
        },
    ];

    const transformSupplierForModal = (
        supplier: SupplierType | null
    ): Record<string, string | number | boolean | null> => {
        if (!supplier) return {};
        return {
            id: supplier.id,
            name: supplier.name,
            address: supplier.address ?? "",
            phone: supplier.phone ?? "",
            email: supplier.email ?? "",
            contact_person: supplier.contact_person ?? "",
        };
    };

    const emptySupplierData = {
        name: "",
        address: "",
        phone: "",
        email: "",
        contact_person: "",
    };

    const totalPages = Math.ceil(currentTotalItems / itemsPerPage);

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
                className={`${isFetching ? "opacity-50 transition-opacity duration-300" : ""
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
                                        <TableCell
                                            colSpan={4}
                                            className="text-center text-gray-500 py-10"
                                        >
                                            Memuat data supplier...
                                        </TableCell>
                                    </TableRow>
                                ) : suppliers && suppliers.length > 0 ? (
                                    suppliers
                                        .filter(
                                            (supplier): supplier is SupplierType =>
                                                typeof supplier === "object" &&
                                                supplier !== null &&
                                                "address" in supplier &&
                                                "name" in supplier &&
                                                "id" in supplier
                                        )
                                        .map((supplier) => (
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
                                        <TableCell
                                            colSpan={4}
                                            className="text-center text-gray-500 py-10"
                                        >
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
                            totalItems={currentTotalItems}
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
                onFieldSave={async (key: string, value: unknown) => {
                    if (selectedSupplier && selectedSupplier.id) {
                        const dataToUpdate: Partial<SupplierType> = { id: selectedSupplier.id, [key]: value };
                        await updateSupplierMutation.mutateAsync(dataToUpdate);
                    }
                }}
                onImageSave={async (data: {
                    supplierId?: string;
                    file: File;
                }) => {
                    const idToUse = data.supplierId || selectedSupplier?.id;
                    if (idToUse) {
                        await updateSupplierImageMutation.mutateAsync({
                            supplierId: idToUse,
                            file: data.file,
                        });
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
                onImageSave={(data: { file: File }) => {
                    console.log("Image uploaded for new supplier:", data.file);
                    return Promise.resolve();
                }}
                imagePlaceholder="https://via.placeholder.com/400x300?text=Foto+Supplier"
                mode="add"
            />
        </Card>
    );
};

export default SupplierList;
