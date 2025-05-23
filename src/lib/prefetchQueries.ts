import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from './supabase';

const fetchCategories = async (page = 1, searchTerm = '', limit = 10) => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let categoriesQuery = supabase
        .from("item_categories")
        .select("id, name, description");

    let countQuery = supabase
        .from("item_categories")
        .select('id', { count: 'exact' });

    if (searchTerm) {
        const fuzzySearchPattern = `%${searchTerm.toLowerCase().split('').join('%')}%`;
        categoriesQuery = categoriesQuery.or(`name.ilike.${fuzzySearchPattern},description.ilike.${fuzzySearchPattern}`);
        countQuery = countQuery.or(`name.ilike.${fuzzySearchPattern},description.ilike.${fuzzySearchPattern}`);
    }

    const [categoriesResult, countResult] = await Promise.all([
        categoriesQuery.order('name').range(from, to),
        countQuery
    ]);

    if (categoriesResult.error) throw categoriesResult.error;
    if (countResult.error) throw countResult.error;

    return { 
        data: categoriesResult.data || [],
        totalItems: countResult.count || 0
    };
};

const fetchTypes = async (page = 1, searchTerm = '', limit = 10) => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    let query = supabase
        .from("item_types")
        .select("id, name, description", { count: 'exact' });
        
    if (searchTerm) {
        const fuzzySearchPattern = `%${searchTerm.toLowerCase().split('').join('%')}%`;
        query = query.or(`name.ilike.${fuzzySearchPattern},description.ilike.${fuzzySearchPattern}`);
    }
    
    const { data, error, count } = await query
        .order("name")
        .range(from, to);
        
    if (error) throw error;
    
    return { data: data || [], totalItems: count || 0 };
};

const fetchUnits = async (page = 1, searchTerm = '', limit = 10) => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from("item_units")
        .select("id, name, description", { count: 'exact' });
        
    if (searchTerm) {
        const fuzzySearchPattern = `%${searchTerm.toLowerCase().split('').join('%')}%`;
        query = query.or(`name.ilike.${fuzzySearchPattern},description.ilike.${fuzzySearchPattern}`);
    }

    const { data, error, count } = await query
        .order("name")
        .range(from, to);

    if (error) throw error;
    return { data: data || [], totalItems: count || 0 };
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
        barcode,
        unit_conversions,
        category_id,
        type_id,
        unit_id
    `);

    let countQuery = supabase
        .from("items")
        .select('id', { count: 'exact' });

    if (searchTerm) {
        const fuzzySearchPattern = `%${searchTerm.toLowerCase().split('').join('%')}%`;
        itemsQuery = itemsQuery.or(`name.ilike.${fuzzySearchPattern},code.ilike.${fuzzySearchPattern},barcode.ilike.${fuzzySearchPattern}`);
        countQuery = countQuery.or(`name.ilike.${fuzzySearchPattern},code.ilike.${fuzzySearchPattern},barcode.ilike.${fuzzySearchPattern}`);
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
        barcode: item.barcode,
        unit_conversions: typeof item.unit_conversions === 'string' ? JSON.parse(item.unit_conversions || '[]') : (item.unit_conversions || []),
        stock: item.stock,
        category: { name: categories?.find(cat => cat.id === item.category_id)?.name || "" },
        type: { name: types?.find(t => t.id === item.type_id)?.name || "" },
        unit: { name: units?.find(u => u.id === item.unit_id)?.name || "" }
    }));

    return { items: completedData, totalItems: countResult.count || 0 };
};

export const fetchSuppliers = async (page = 1, searchTerm = '', limit = 10) => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from("suppliers")
        .select("id, name, address, phone, email, contact_person, image_url");

    let countQuery = supabase
        .from("suppliers")
        .select('id', { count: 'exact' });

    if (searchTerm) {
        const fuzzySearchPattern = `%${searchTerm.toLowerCase().split('').join('%')}%`;
        query = query.or(`name.ilike.${fuzzySearchPattern},address.ilike.${fuzzySearchPattern},phone.ilike.${fuzzySearchPattern}`);
        countQuery = countQuery.or(`name.ilike.${fuzzySearchPattern},address.ilike.${fuzzySearchPattern},phone.ilike.${fuzzySearchPattern}`);
        query = query.order("name", { ascending: true });
    } else {
        query = query.order("name", { ascending: true });
    }

    const [suppliersResult, countResult] = await Promise.all([
        query.range(from, to),
        countQuery
    ]);

    if (suppliersResult.error) throw suppliersResult.error;
    if (countResult.error) throw countResult.error;

    const suppliersData = suppliersResult.data || [];
    return { suppliers: suppliersData, totalItems: countResult.count || 0 };
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

export const usePrefetchQueries = () => {
    const queryClient = useQueryClient();

    useEffect(() => {
        const prefetchAll = async () => {
            console.log('Memulai prefetching semua data...');

            const pageSizes = [10, 20, 40];

            for (const pageSize of pageSizes) {
                queryClient.prefetchQuery({
                    queryKey: ['item_categories', 1, '', pageSize],
                    queryFn: () => fetchCategories(1, '', pageSize),
                    staleTime: 30 * 1000,
                });
            }

            for (const pageSize of pageSizes) {
                queryClient.prefetchQuery({
                    queryKey: ['item_types', 1, '', pageSize],
                    queryFn: () => fetchTypes(1, '', pageSize),
                    staleTime: 30 * 1000,
                });
            }

            for (const pageSize of pageSizes) {
                queryClient.prefetchQuery({
                    queryKey: ['item_units', 1, '', pageSize],
                    queryFn: () => fetchUnits(1, '', pageSize),
                    staleTime: 30 * 1000,
                });
            }

            for (const pageSize of pageSizes) {
                queryClient.prefetchQuery({
                    queryKey: ['items', 1, '', pageSize],
                    queryFn: () => fetchItems(1, '', pageSize),
                    staleTime: 30 * 1000,
                });
            }

            for (const pageSize of pageSizes) {
                queryClient.prefetchQuery({
                    queryKey: ['purchases', 1, '', pageSize],
                    queryFn: () => fetchPurchases(1, '', pageSize),
                    staleTime: 30 * 1000,
                });
            }

            for (const pageSize of pageSizes) {
                queryClient.prefetchQuery({
                    queryKey: ['suppliers', 1, '', pageSize],
                    queryFn: () => fetchSuppliers(1, '', pageSize),
                    staleTime: 30 * 1000,
                });
            }

            queryClient.prefetchQuery({
                queryKey: ['companyProfile'],
                queryFn: fetchProfile,
                staleTime: 30 * 1000,
            });

            console.log('Semua data berhasil di-prefetch!');
        };

        prefetchAll();
    }, [queryClient]);
};