import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
    useQuery,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";

export const useItemListManagement = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const queryClient = useQueryClient();

    useEffect(() => {
        queryClient.invalidateQueries({
            queryKey: ["items"],
            refetchType: "all",
        });
    }, [queryClient]);

    const fetchItems = async (
        page: number,
        searchTerm: string,
        limit: number
    ) => {
        const from = (page - 1) * limit;
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
                unit_id
            `);

        let countQuery = supabase.from("items").select("id", { count: "exact" });

        if (searchTerm) {
            itemsQuery = itemsQuery.or(
                `name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`
            );
            countQuery = countQuery.or(
                `name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`
            );
        }

        const [itemsResult, countResult, categoriesRes, typesRes, unitsRes] =
            await Promise.all([
                itemsQuery.order("name").range(from, to),
                countQuery,
                supabase.from("item_categories").select("id, name"),
                supabase.from("item_types").select("id, name"),
                supabase.from("item_units").select("id, name"),
            ]);

        if (itemsResult.error) throw itemsResult.error;
        if (countResult.error) throw countResult.error;

        const categories = categoriesRes.data || [];
        const types = typesRes.data || [];
        const units = unitsRes.data || [];

        const completedData = (itemsResult.data || []).map((item) => ({
            id: item.id,
            name: item.name,
            code: item.code,
            barcode: item.barcode,
            base_price: item.base_price,
            sell_price: item.sell_price,
            stock: item.stock,
            unit_conversions:
                typeof item.unit_conversions === "string"
                    ? JSON.parse(item.unit_conversions || "[]")
                    : item.unit_conversions || [],
            category: {
                name:
                    categories?.find((cat) => cat.id === item.category_id)?.name || "",
            },
            type: { name: types?.find((t) => t.id === item.type_id)?.name || "" },
            unit: { name: units?.find((u) => u.id === item.unit_id)?.name || "" },
        }));

        return { items: completedData, totalItems: countResult.count || 0 };
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const { data, isLoading, isError, error, isFetching } = useQuery({
        queryKey: ["items", currentPage, debouncedSearch, itemsPerPage],
        queryFn: () => fetchItems(currentPage, debouncedSearch, itemsPerPage),
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000,
        refetchOnMount: true,
    });

    const items = data?.items || [];
    const totalItems = data?.totalItems || 0;

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handleItemsPerPageChange = (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
        navigate,
        search,
        setSearch,
        debouncedSearch,
        currentPage,
        itemsPerPage,
        items,
        totalItems,
        isLoading,
        isError,
        error,
        isFetching,
        handlePageChange,
        handleItemsPerPageChange,
        totalPages,
    };
};