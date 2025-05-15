import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useConfirmDialog } from "@/components/ui";
import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import type {
    Category,
    ItemType,
    Unit,
    Supplier as SupplierType,
    FieldConfig as FieldConfigSupplier,
    ConfirmDialogOptions as ConfirmDialogOptionsSupplier
} from "@/types";

type MasterDataItem = Category | ItemType | Unit;

export const useMasterDataManagement = (
    tableName: string,
    entityNameLabel: string
) => {
    const { openConfirmDialog } = useConfirmDialog();
    const queryClient = useQueryClient();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!isEditModalOpen && editingItem) {
            timer = setTimeout(() => {
                setEditingItem(null);
            }, 300); // Delay to allow modal close animation
        }
        return () => clearTimeout(timer);
    }, [editingItem, isEditModalOpen]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1); // Reset to first page on new search
        }, 500); // Debounce time

        return () => clearTimeout(timer);
    }, [search]);

    const fetchData = async (page: number, searchTerm: string, limit: number) => {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase.from(tableName).select("id, name, description", { count: "exact" });

        if (searchTerm) {
            query = query.or(
                `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
            );
        }

        const { data, error, count } = await query.order("name").range(from, to);

        if (error) throw error;
        return { data: data || [], totalItems: count || 0 };
    };

    const { data: queryData, isLoading, isError, error, isFetching } = useQuery({
        queryKey: [tableName, currentPage, debouncedSearch, itemsPerPage],
        queryFn: () => fetchData(currentPage, debouncedSearch, itemsPerPage),
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000, // 30 seconds
        refetchOnMount: true,
    });

    const items = queryData?.data || [];
    const totalItems = queryData?.totalItems || 0;
    const queryError = error instanceof Error ? error : null;

    const addMutation = useMutation({
        mutationFn: async (newItem: { name: string; description?: string }) => {
            const { error } = await supabase.from(tableName).insert(newItem);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [tableName] });
            setIsAddModalOpen(false);
        },
        onError: (error: Error) => {
            alert(`Gagal menambahkan ${entityNameLabel}: ${error.message}`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (updatedItem: { id: string; name: string; description?: string }) => {
            const { id, ...updateData } = updatedItem;
            const { error } = await supabase.from(tableName).update(updateData).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [tableName] });
            setIsEditModalOpen(false);
            setEditingItem(null);
        },
        onError: (error: Error) => {
            alert(`Gagal memperbarui ${entityNameLabel}: ${error.message}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (itemId: string) => {
            const { error } = await supabase.from(tableName).delete().eq("id", itemId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [tableName] });
            setIsEditModalOpen(false); // Close edit modal if open
            setEditingItem(null);
        },
        onError: (error: Error) => {
            alert(`Gagal menghapus ${entityNameLabel}: ${error.message}`);
        },
    });

    const handleEdit = (item: MasterDataItem) => {
        setEditingItem(item);
        setIsEditModalOpen(true);
    };

    const handleModalSubmit = useCallback(async (itemData: { id?: string; name: string; description?: string }) => {
        if (itemData.id) {
            await updateMutation.mutateAsync(itemData as { id: string; name: string; description?: string });
        } else {
            await addMutation.mutateAsync(itemData);
        }
    }, [addMutation, updateMutation]);

    const handlePageChange = (newPage: number) => setCurrentPage(newPage);
    const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1); // Reset to first page
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
        isAddModalOpen, setIsAddModalOpen,
        isEditModalOpen, setIsEditModalOpen,
        editingItem, setEditingItem,
        search, setSearch, debouncedSearch,
        currentPage, setCurrentPage,
        itemsPerPage, setItemsPerPage,
        data: items, totalItems, totalPages,
        isLoading, isError, queryError, isFetching,
        addMutation, updateMutation, deleteMutation,
        handleEdit, handleModalSubmit, handlePageChange, handleItemsPerPageChange,
        openConfirmDialog
    };
};

// --- Supplier handlers ---
export const useSupplierHandlers = (
    openConfirmDialog: (options: ConfirmDialogOptionsSupplier) => void
) => {
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierType | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newSupplierImage, setNewSupplierImage] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const fetchSuppliers = async () => {
        const { data, error } = await supabase
            .from("suppliers")
            .select("id, name, address, phone, email, contact_person, image_url")
            .order("name");

        if (error) throw error;
        return data || [];
    };

    const {
        data: suppliers,
        isLoading,
        isError,
        error,
    } = useQuery<SupplierType[]>({
        queryKey: ["suppliers"],
        queryFn: fetchSuppliers,
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
        emptySupplierData
    };
};