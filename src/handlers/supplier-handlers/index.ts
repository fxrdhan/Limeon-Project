import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    useQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import type {
    Supplier as SupplierType,
    FieldConfig as FieldConfigSupplier,
    ConfirmDialogOptions as ConfirmDialogOptionsSupplier
} from "@/types";

export const useSupplierHandlers = (
    openConfirmDialog: (options: ConfirmDialogOptionsSupplier) => void
) => {
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierType | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newSupplierImage, setNewSupplierImage] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const queryClient = useQueryClient();

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchSuppliers = async (searchTerm: string) => {
        let query = supabase
            .from("suppliers")
            .select("id, name, address, phone, email, contact_person, image_url");

        if (searchTerm) {
            const fuzzySearchPattern = `%${searchTerm.toLowerCase().split('').join('%')}%`;
            query = query.or(`name.ilike.${fuzzySearchPattern},address.ilike.${fuzzySearchPattern},phone.ilike.${fuzzySearchPattern}`);
        } else {
            query = query.order("name");
        }
        const { data, error } = await query;

        if (error) throw error;

        const suppliersData = data || [];

        if (searchTerm && suppliersData.length > 0) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            suppliersData.sort((a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();

                const isAExactMatch = nameA === lowerSearchTerm;
                const isBExactMatch = nameB === lowerSearchTerm;
                if (isAExactMatch && !isBExactMatch) return -1;
                if (!isAExactMatch && isBExactMatch) return 1;

                const aStartsWith = nameA.startsWith(lowerSearchTerm);
                const bStartsWith = nameB.startsWith(lowerSearchTerm);
                if (aStartsWith && !bStartsWith) return -1;
                if (!aStartsWith && bStartsWith) return 1;

                return nameA.localeCompare(nameB);
            });
        }
        return suppliersData;
    };

    const {
        data: suppliers,
        isLoading,
        isError,
        error,
        isFetching,
    } = useQuery<SupplierType[]>({
        queryKey: ["suppliers", debouncedSearch],
        queryFn: () => fetchSuppliers(debouncedSearch),
        staleTime: 30 * 1000,
        refetchOnMount: true,
    });

    const queryError = error instanceof Error ? error : null;

    const updateSupplier = async (updatedData: Partial<SupplierType>) => {
        if (!selectedSupplier) return;

        const { error } = await supabase
            .from("suppliers")
            .update(updatedData)
            .eq("id", selectedSupplier.id);

        if (error) throw error;
    };

    const createSupplier = async (newSupplier: Partial<SupplierType>) => {
        const dataToInsert = {
            ...newSupplier,
            image_url: newSupplierImage,
        };

        const { data, error } = await supabase
            .from("suppliers")
            .insert([dataToInsert])
            .select();

        if (error) throw error;
        return data[0];
    };

    const updateSupplierMutation = useMutation<void, Error, Partial<SupplierType>>({
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
            console.log("Supplier berhasil dihapus, cache diinvalidasi.");
        },
        onError: (error: Error) => {
            console.error("Error deleting supplier:", error);
            alert(`Gagal menghapus supplier: ${error.message}`);
        },
    });

    const updateSupplierImageMutation = useMutation<
        void,
        Error,
        { supplierId: string; imageBase64: string }
    >({
        mutationFn: async ({
            supplierId,
            imageBase64,
        }: {
            supplierId: string;
            imageBase64: string;
        }) => {
            const { error } = await supabase
                .from("suppliers")
                .update({
                    image_url: imageBase64,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", supplierId);
            if (error) throw error;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            setSelectedSupplier((prev) =>
                prev ? { ...prev, image_url: variables.imageBase64 } : null
            );
        },
        onError: (error) => {
            console.error("Error updating supplier image:", error);
            alert(`Gagal memperbarui foto supplier: ${error.message}`);
        },
    });

    const deleteSupplierImageMutation = useMutation<void, Error, string>({
        mutationFn: async (supplierId: string) => {
            const { error } = await supabase
                .from("suppliers")
                .update({ image_url: null, updated_at: new Date().toISOString() })
                .eq("id", supplierId);
            if (error) throw error;
        },
        onSuccess: (_data, supplierId) => {
            queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            setSelectedSupplier((prev) =>
                prev ? { ...prev, image_url: null } : null
            );
            console.log(`Image for supplier ${supplierId} deleted.`);
        },
        onError: (error) => {
            console.error("Error deleting supplier image:", error);
            alert(`Gagal menghapus gambar supplier: ${error.message}`);
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

    const handleNewSupplierImageUpload = (imageBase64: string) => {
        setNewSupplierImage(imageBase64);
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

    return {
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
        deleteSupplierMutation,
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
    };
};