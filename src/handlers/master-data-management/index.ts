import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useConfirmDialog } from "@/components/modules";
import { fuzzyMatch, getScore } from "@/lib/search";
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
    Item as ItemDataType,
    Supplier,
    UnitConversion,
    UnitData
} from "@/types";

type MasterDataItem = Category | ItemType | Unit | ItemDataType | Supplier;

export const useMasterDataManagement = (
    tableName: string,
    entityNameLabel: string,
    realtime: boolean = false
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

        if (tableName === "items") {
            const to = from + limit - 1;
            let itemsQuery = supabase.from("items").select(`
                id,
                name,
                code,
                barcode,
                base_price,
                sell_price,
                stock,
                unit_conversions,
                category_id,
                type_id,
                unit_id,
                item_categories (name),
                item_types (name),
                item_units (name)
            `);

            let countQuery = supabase.from("items").select("id", { count: "exact" });

            if (searchTerm) {
                const fuzzySearchPattern = `%${searchTerm.toLowerCase().split('').join('%')}%`;
                itemsQuery = itemsQuery.or(
                    `name.ilike.${fuzzySearchPattern},code.ilike.${fuzzySearchPattern},barcode.ilike.${fuzzySearchPattern}`
                );
                countQuery = countQuery.or(
                    `name.ilike.${fuzzySearchPattern},code.ilike.${fuzzySearchPattern},barcode.ilike.${fuzzySearchPattern}`
                );
            }

            const [itemsResult, countResult, allUnitsForConversionRes] = await Promise.all([
                itemsQuery.order("name").range(from, to),
                countQuery,
                supabase.from("item_units").select("id, name")
            ]);

            if (itemsResult.error) throw itemsResult.error;
            if (countResult.error) throw countResult.error;
            if (allUnitsForConversionRes.error) throw allUnitsForConversionRes.error;

            const allUnitsForConversion: UnitData[] = allUnitsForConversionRes.data || [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const completedData = (itemsResult.data || []).map((item: any) => {
                let parsedConversions: UnitConversion[] = [];
                if (typeof item.unit_conversions === 'string') {
                    try {
                        parsedConversions = JSON.parse(item.unit_conversions || "[]");
                    } catch (e) {
                        console.error("Error parsing unit_conversions for item:", item.id, e);
                    }
                } else if (Array.isArray(item.unit_conversions)) {
                    parsedConversions = item.unit_conversions;
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mappedConversions: UnitConversion[] = parsedConversions.map((conv: any) => {
                    const unitDetail = allUnitsForConversion.find(u => u.name === conv.unit_name);
                    return {
                        id: conv.id || Date.now().toString() + Math.random(),
                        conversion_rate: conv.conversion_rate || conv.conversion || 0,
                        unit_name: conv.unit_name || 'Unknown',
                        to_unit_id: unitDetail ? unitDetail.id : '',
                        unit: unitDetail ? { id: unitDetail.id, name: unitDetail.name } : { id: '', name: conv.unit_name || 'Unknown Unit' },
                        conversion: conv.conversion_rate || conv.conversion || 0,
                        basePrice: conv.basePrice ?? 0,
                        sellPrice: conv.sellPrice ?? 0,
                    };
                });

                return {
                    id: item.id,
                    name: item.name,
                    code: item.code,
                    barcode: item.barcode,
                    base_price: item.base_price,
                    sell_price: item.sell_price,
                    stock: item.stock,
                    unit_conversions: mappedConversions,
                    category: { name: item.item_categories?.name || "" },
                    type: { name: item.item_types?.name || "" },
                    unit: { name: item.item_units?.name || "" },
                } as ItemDataType;
            });

            // Terapkan filter dan sort fuzzy jika searchTerm ada
            let filteredData = completedData;
            if (searchTerm) {
                const searchTermLower = searchTerm.toLowerCase();
                filteredData = completedData.filter(item =>
                    fuzzyMatch(item.name, searchTermLower) ||
                    (item.code && fuzzyMatch(item.code, searchTermLower)) ||
                    (item.barcode && fuzzyMatch(item.barcode, searchTermLower))
                ).sort((a, b) => {
                    const scoreA = getScore(a, searchTermLower);
                    const scoreB = getScore(b, searchTermLower);
                    if (scoreA !== scoreB) return scoreB - scoreA;
                    return a.name.localeCompare(b.name);
                });
            }

            return { data: filteredData, totalItems: countResult.count || 0 };
        } else {
            const to = from + limit - 1;
            let query = supabase
                .from(tableName)
                .select("*", { count: "exact" });

            if (searchTerm) {
                const fuzzySearchPattern = `%${searchTerm
                    .toLowerCase()
                    .split("")
                    .join("%")}%`;
                query = query.ilike("name", fuzzySearchPattern);
            }

            const { data, error, count } = await query
                .order("name")
                .range(from, to);

            if (error) throw error;
            return { data: (data || []) as MasterDataItem[], totalItems: count || 0 };
        }
    };

    const {
        data: queryData,
        isLoading,
        isError,
        error,
        isFetching,
    } = useQuery({
        queryKey: [tableName, currentPage, debouncedSearch, itemsPerPage],
        queryFn: () => fetchData(currentPage, debouncedSearch, itemsPerPage),
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000,
        refetchOnMount: true,
    });

    const currentData = queryData?.data || [];
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
        mutationFn: async (updatedItem: {
            id: string;
            name: string;
            description?: string;
        }) => {
            const { id, ...updateData } = updatedItem;
            const { error } = await supabase
                .from(tableName)
                .update(updateData)
                .eq("id", id);
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
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq("id", itemId);
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

    const handleModalSubmit = useCallback(
        async (itemData: { id?: string; name: string; description?: string }) => {
            if (itemData.id) {
                await updateMutation.mutateAsync(
                    itemData as { id: string; name: string; description?: string }
                );
            } else {
                await addMutation.mutateAsync(itemData);
            }
        },
        [addMutation, updateMutation]
    );

    const handlePageChange = (newPage: number) => setCurrentPage(newPage);
    const handleItemsPerPageChange = (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    useEffect(() => {
        if (!realtime) return;

        const channel = supabase
            .channel(`public:${tableName}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: tableName },
                (payload) => {
                    console.log(`Realtime update on ${tableName}:`, payload);
                    queryClient.invalidateQueries({ queryKey: [tableName] });
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Subscribed to realtime updates for ${tableName}`);
                }
                if (err) {
                    console.error(`Realtime subscription error for ${tableName}:`, err);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tableName, queryClient, realtime]);

    return {
        isAddModalOpen,
        setIsAddModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        editingItem,
        setEditingItem,
        search,
        setSearch,
        debouncedSearch,
        setDebouncedSearch,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        data: currentData,
        totalItems,
        totalPages,
        isLoading,
        isError,
        queryError,
        isFetching,
        addMutation,
        updateMutation,
        deleteMutation,
        handleEdit,
        handleModalSubmit,
        handlePageChange,
        handleItemsPerPageChange,
        openConfirmDialog,
        queryClient
    };
};
