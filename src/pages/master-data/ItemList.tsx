import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from "../../lib/supabase";
import { FaPlus } from "react-icons/fa";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "../../components/ui/TableSearchBar";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";

function ItemList() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    useConfirmDialog();
    const queryClient = useQueryClient();

    useEffect(() => {
        queryClient.invalidateQueries({
            queryKey: ['items'],
            refetchType: 'all'
        });
    }, [queryClient]);

    const fetchItems = async (page: number, searchTerm: string, limit: number) => {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let itemsQuery = supabase
            .from("items")
            .select(`
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
            barcode: item.barcode,
            base_price: item.base_price,
            sell_price: item.sell_price,
            stock: item.stock,
            unit_conversions: typeof item.unit_conversions === 'string' ? JSON.parse(item.unit_conversions || '[]') : (item.unit_conversions || []),
            category: { name: categories?.find(cat => cat.id === item.category_id)?.name || "" },
            type: { name: types?.find(t => t.id === item.type_id)?.name || "" },
            unit: { name: units?.find(u => u.id === item.unit_id)?.name || "" }
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
        queryKey: ['items', currentPage, debouncedSearch, itemsPerPage],
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

    const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <Card className={isFetching ? 'opacity-75 transition-opacity duration-300' : ''}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 text-center flex-grow">Daftar Item</h1>

                <Link
                    to="/master-data/items/add">
                    <Button variant="primary" className="flex items-center">
                        <FaPlus className="mr-2" />
                        Tambah Item Baru
                    </Button>
                </Link>
            </div>

            <SearchBar
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau kode item..."
            />

            {isLoading && <div className="text-center p-6">Memuat data awal...</div>}
            {isError && <div className="text-center p-6 text-red-500">Error: {error instanceof Error ? error.message : 'Gagal memuat data'}</div>}

            {!isLoading && (
                <>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Nama Item</TableHeader>
                                <TableHeader>Kode</TableHeader>
                                <TableHeader>Barcode</TableHeader>
                                <TableHeader>Kategori</TableHeader>
                                <TableHeader>Jenis</TableHeader>
                                <TableHeader>Satuan</TableHeader>
                                <TableHeader>Satuan Turunan</TableHeader>
                                <TableHeader className="text-right">Harga Pokok</TableHeader>
                                <TableHeader className="text-right">Harga Jual</TableHeader>
                                <TableHeader className="text-center">Stok</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={10}
                                        className="text-center text-gray-600"
                                    >
                                        {debouncedSearch ? `Tidak ada item dengan nama "${debouncedSearch}"` : "Tidak ada data item yang ditemukan"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        onClick={() => navigate(`/master-data/items/edit/${item.id}`)}
                                        className="cursor-pointer hover:bg-blue-50"
                                    >
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>{item.code}</TableCell>
                                        <TableCell>{item.barcode || '-'}</TableCell>
                                        <TableCell>{item.category.name}</TableCell>
                                        <TableCell>{item.type.name}</TableCell>
                                        <TableCell>{item.unit.name}</TableCell>
                                        <TableCell>
                                            {item.unit_conversions && item.unit_conversions.length > 0
                                                ? item.unit_conversions.map((uc: { unit_name: string }) => uc.unit_name).join(', ')
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.base_price.toLocaleString("id-ID", {
                                                style: "currency",
                                                currency: "IDR",
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.sell_price.toLocaleString("id-ID", {
                                                style: "currency",
                                                currency: "IDR",
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                            })}
                                        </TableCell>
                                        <TableCell className="text-center">{item.stock}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        itemsCount={items.length}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                    />
                </>
            )}
        </Card>
    );
}

export default ItemList;