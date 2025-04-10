import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from './supabase';

// Fungsi-fungsi fetcher yang akan di-prefetch
const fetchCategories = async () => {
    const { data, error } = await supabase
        .from("item_categories")
        .select("*")
        .order("name");

    if (error) throw error;
    return data || [];
};

const fetchTypes = async () => {
    const { data, error } = await supabase
        .from("item_types")
        .select("id, name, description")
        .order("name");
    if (error) throw error;
    return data || [];
};

const fetchUnits = async (page = 1, limit = 10) => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
        .from("item_units")
        .select("id, name, description", { count: 'exact' })
        .order("name")
        .range(from, to);

    if (error) throw error;
    return { units: data || [], totalItems: count || 0 };
};

const fetchItems = async (page = 1, searchTerm = '', limit = 10) => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let itemsQuery = supabase
        .from("items")
        .select(`
      id,
      name,
      code,
      base_price,
      sell_price,
      stock,
      category_id,
      type_id,
      unit_id
    `);

    let countQuery = supabase
        .from("items")
        .select('id', { count: 'exact' });

    if (searchTerm) {
        itemsQuery = itemsQuery.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
        countQuery = countQuery.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
    }

    const [itemsResult, countResult, categoriesRes, typesRes, unitsRes] = await Promise.all([
        itemsQuery.order('name').range(from, to),
        countQuery,
        supabase.from("item_categories").select("id, name"),
        supabase.from("item_types").select("id, name"),
        supabase.from("item_units").select("id, name")
    ]);

    if (itemsResult.error) throw itemsResult.error;
    if (countResult.error) throw countResult.error;

    const categories = categoriesRes.data || [];
    const types = typesRes.data || [];
    const units = unitsRes.data || [];

    const completedData = (itemsResult.data || []).map(item => ({
        id: item.id,
        name: item.name,
        code: item.code,
        base_price: item.base_price,
        sell_price: item.sell_price,
        stock: item.stock,
        category: { name: categories?.find(cat => cat.id === item.category_id)?.name || "" },
        type: { name: types?.find(t => t.id === item.type_id)?.name || "" },
        unit: { name: units?.find(u => u.id === item.unit_id)?.name || "" }
    }));

    return { items: completedData, totalItems: countResult.count || 0 };
};

const fetchSuppliers = async () => {
    const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, address, phone, email, contact_person, image_url')
        .order('name');

    if (error) throw error;
    return data || [];
};

const fetchProfile = async () => {
    const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
    }
    return data;
};

const fetchPurchases = async (page = 1, searchTerm = '', limit = 10) => {
    try {
        let query = supabase
            .from("purchases")
            .select(`
        id,
        invoice_number,
        date,
        total,
        payment_status,
        payment_method,
        supplier_id,
        supplier:suppliers(name)
      `);

        if (searchTerm) {
            query = query.or(`invoice_number.ilike.%${searchTerm}%,suppliers.name.ilike.%${searchTerm}%`);
        }

        const countQuery = supabase
            .from("purchases")
            .select('id', { count: 'exact' });

        if (searchTerm) {
            countQuery.or(`invoice_number.ilike.%${searchTerm}%,suppliers.name.ilike.%${searchTerm}%`);
        }

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error } = await query
            .order('date', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const transformedData = data?.map(item => ({
            ...item,
            supplier: Array.isArray(item.supplier) ? item.supplier[0] : item.supplier
        })) || [];
        return { purchases: transformedData, totalItems: count || 0 };
    } catch (error) {
        console.error("Error fetching purchases:", error);
        throw error;
    }
};

// Hook untuk prefetch semua query
export const usePrefetchQueries = () => {
    const queryClient = useQueryClient();

    useEffect(() => {
        const prefetchAll = async () => {
            console.log('Memulai prefetching semua data...');

            // Prefetch categories
            queryClient.prefetchQuery({
                queryKey: ['categories'],
                queryFn: fetchCategories,
                staleTime: 30 * 1000,
            });

            // Prefetch types
            queryClient.prefetchQuery({
                queryKey: ['types'],
                queryFn: fetchTypes,
                staleTime: 30 * 1000,
            });

            // Prefetch units - page 1
            queryClient.prefetchQuery({
                queryKey: ['units', 1, 10],
                queryFn: () => fetchUnits(1, 10),
                staleTime: 30 * 1000,
            });

            // Prefetch items - page 1, empty search
            queryClient.prefetchQuery({
                queryKey: ['items', 1, '', 10],
                queryFn: () => fetchItems(1, '', 10),
                staleTime: 30 * 1000,
            });

            // Prefetch suppliers
            queryClient.prefetchQuery({
                queryKey: ['suppliers'],
                queryFn: fetchSuppliers,
                staleTime: 30 * 1000,
            });

            // Prefetch company profile
            queryClient.prefetchQuery({
                queryKey: ['companyProfile'],
                queryFn: fetchProfile,
                staleTime: 30 * 1000,
            });

            // Prefetch purchases - page 1, empty search
            queryClient.prefetchQuery({
                queryKey: ['purchases', 1, '', 10],
                queryFn: () => fetchPurchases(1, '', 10),
                staleTime: 30 * 1000,
            });

            console.log('Semua data berhasil di-prefetch!');
        };

        prefetchAll();
    }, [queryClient]);
};