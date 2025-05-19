import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useConfirmDialog } from "@/components/modules";
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
            }, 300);
        }
        return () => clearTimeout(timer);
    }, [editingItem, isEditModalOpen]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 500);

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
        staleTime: 30 * 1000,
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
            setIsEditModalOpen(false);
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
        setCurrentPage(1);
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