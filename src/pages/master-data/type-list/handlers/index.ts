import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { ItemType } from "@/types";
import { useConfirmDialog } from "@/components/ui/dialog-box";
import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";

export const useTypeList = () => {
    const { openConfirmDialog } = useConfirmDialog();
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<ItemType | null>(null);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!isEditModalOpen && editingType) {
            timer = setTimeout(() => {
                setEditingType(null);
            }, 300);
        }
        return () => clearTimeout(timer);
    }, [editingType, isEditModalOpen]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const fetchTypes = async (
        page: number,
        searchTerm: string,
        limit: number
    ) => {
        try {
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            let query = supabase
                .from("item_types")
                .select("id, name, description", { count: "exact" });

            if (searchTerm) {
                query = query.or(
                    `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
                );
            }

            const { data, error, count } = await query.order("name").range(from, to);

            if (error) throw error;

            return { types: data || [], totalTypes: count || 0 };
        } catch (error) {
            console.error("Error fetching item types:", error);
            throw error;
        }
    };

    const { data, isLoading, isError, error, isFetching } = useQuery({
        queryKey: ["types", currentPage, debouncedSearch, itemsPerPage],
        queryFn: () => fetchTypes(currentPage, debouncedSearch, itemsPerPage),
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000,
        refetchOnMount: true,
    });

    const types = data?.types || [];
    const totalTypes = data?.totalTypes || 0;
    const totalPages = Math.ceil(totalTypes / itemsPerPage);
    const queryError = error instanceof Error ? error : null;

    const deleteTypeMutation = useMutation({
        mutationFn: async (typeId: string) => {
            const { error } = await supabase
                .from("item_types")
                .delete()
                .eq("id", typeId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["types"] });
            console.log("Jenis item berhasil dihapus, cache diinvalidasi.");
        },
        onError: (error) => {
            console.error("Error deleting item type:", error);
            alert(`Gagal menghapus jenis item: ${error.message}`);
        },
    });

    const addTypeMutation = useMutation({
        mutationFn: async (newType: { name: string; description: string }) => {
            const { error } = await supabase.from("item_types").insert(newType);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["types"] });
            setIsAddModalOpen(false);
        },
        onError: (error) => {
            alert(`Gagal menambahkan jenis item: ${error.message}`);
        },
    });

    const updateTypeMutation = useMutation({
        mutationFn: async (updatedType: {
            id: string;
            name: string;
            description: string;
        }) => {
            const { id, ...updateData } = updatedType;
            const { error } = await supabase
                .from("item_types")
                .update(updateData)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["types"] });
            setIsEditModalOpen(false);
            setEditingType(null);
        },
        onError: (error) => {
            alert(`Gagal memperbarui jenis item: ${error.message}`);
        },
    });

    const handleEdit = (type: ItemType) => {
        setEditingType(type);
        setIsEditModalOpen(true);
    };

    const handleModalSubmit = async (typeData: {
        id?: string;
        name: string;
        description: string;
    }) => {
        if (typeData.id) {
            await updateTypeMutation.mutateAsync(
                typeData as { id: string; name: string; description: string }
            );
        } else {
            await addTypeMutation.mutateAsync(typeData);
        }
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handleItemsPerPageChange = (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    return {
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
    };
};
