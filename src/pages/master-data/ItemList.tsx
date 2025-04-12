import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/react-query';
import { supabase } from "../../lib/supabase";
import { FaPlus, FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";

// Define the expected structure for an item within this component scope for clarity
interface Item {
    id: string;
    name: string;
    code: string;
    sell_price: number;
    unit_conversions?: { unit_name: string }[];
    // Add other fields if needed by other parts of the component
}

function ItemList() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const { openConfirmDialog } = useConfirmDialog();
    const queryClient = useQueryClient();

    // Update this effect to use a more precise invalidation
    useEffect(() => {
        // Invalidate all item queries regardless of page, search, or itemsPerPage parameters
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
            base_price: item.base_price,
            sell_price: item.sell_price,
            stock: item.stock,
            unit_conversions: typeof item.unit_conversions === 'string' ? JSON.parse(item.unit_conversions || '[]') : (item.unit_conversions || []), // Parse JSON if needed
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
        staleTime: 30 * 1000, // Reduced from 5 minutes to 30 seconds
        refetchOnMount: true, // Ensure refetch when component mounts
    });

    const deleteItemMutation = useMutation({
        mutationFn: async (itemId: string) => {
            const { error } = await supabase.from("items").delete().eq("id", itemId);
            if (error) throw error;
        },
        onSuccess: () => {
            // Update the invalidation strategy to match the useEffect approach
            queryClient.invalidateQueries({
                queryKey: ['items'],
                refetchType: 'all'
            });
            console.log("Item berhasil dihapus dan data di-refetch untuk semua ukuran halaman.");
        },
        onError: (error) => {
            console.error("Error deleting item:", error);
            alert("Gagal menghapus item. Silakan coba lagi.");
        },
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
                <h1 className="text-2xl font-bold text-gray-800">Daftar Item</h1>

                <Link
                    to="/master-data/items/add">
                    <Button variant="primary" className="flex items-center">
                        <FaPlus className="mr-2" />
                        Tambah Item Baru
                    </Button>
                </Link>
            </div>

            <div className="mb-4 relative">
                <input
                    type="text"
                    placeholder="Cari item..."
                    className="w-full p-3 border rounded-md pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)} />
                <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
            </div>

            {isLoading && <div className="text-center p-6">Memuat data awal...</div>}
            {isError && <div className="text-center p-6 text-red-500">Error: {error instanceof Error ? error.message : 'Gagal memuat data'}</div>}

            {!isLoading && (
                <>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Nama Item</TableHeader>
                                <TableHeader>Kode</TableHeader>
                                <TableHeader>Kategori</TableHeader>
                                <TableHeader>Jenis</TableHeader>
                                <TableHeader>Satuan</TableHeader>
                                <TableHeader>Satuan Turunan</TableHeader>
                                <TableHeader className="text-right">Harga Pokok</TableHeader>
                                <TableHeader className="text-right">Harga Jual</TableHeader>
                                <TableHeader className="text-right">Stok</TableHeader>
                                <TableHeader className="text-center">Aksi</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={10} // Update colspan
                                        className="text-center text-gray-600"
                                    >
                                        {debouncedSearch ? `Tidak ada item dengan nama "${debouncedSearch}"` : "Tidak ada data item yang ditemukan"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>{item.code}</TableCell>
                                        <TableCell>{item.category.name}</TableCell>
                                        <TableCell>{item.type.name}</TableCell>
                                        <TableCell>{item.unit.name}</TableCell>
                                        {/* Display derived units */}
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
                                        <TableCell className="text-right">{item.stock}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center space-x-2">
                                                <Link
                                                    to={`/master-data/items/edit/${item.id}`}
                                                >
                                                    <Button variant="secondary" size="sm">
                                                        <FaEdit />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(item)}
                                                    disabled={deleteItemMutation.isPending && deleteItemMutation.variables === item.id}
                                                >
                                                    {deleteItemMutation.isPending && deleteItemMutation.variables === item.id ? (
                                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                                                    ) : (
                                                        <FaTrash />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
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

    async function handleDelete(item: Item) {
        openConfirmDialog({
            title: "Konfirmasi Hapus",
            message: `Apakah Anda yakin ingin menghapus item "${item.name}"?`,
            variant: "danger",
            confirmText: "Hapus",
            onConfirm: () => {
                // Use item.id for the mutation
                deleteItemMutation.mutate(item.id);
            }
        });
    }
}

export default ItemList;