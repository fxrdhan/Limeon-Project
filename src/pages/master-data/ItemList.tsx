import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { FaPlus, FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { Loading } from "../../components/ui/Loading";

interface Item {
    id: string;
    name: string;
    code: string;
    category: { name: string };
    type: { name: string };
    unit: { name: string };
    base_price: number;
    sell_price: number;
    stock: number;
}

const ItemList = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Efek untuk debounce pencarian
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1); // Reset ke halaman pertama saat pencarian berubah
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    // Efek untuk mengambil data saat parameter berubah
    useEffect(() => {
        fetchItems(currentPage, debouncedSearch, itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, debouncedSearch, itemsPerPage]);

    const fetchItems = async (page = 1, searchTerm = '', limit = 10) => {
        try {
            // Hanya set loading untuk tabel, bukan seluruh komponen
            setTableLoading(true);

            // Buat query dasar
            let query = supabase
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

            // Tambahkan pencarian jika ada
            if (searchTerm) {
                query = query.ilike('name', `%${searchTerm}%`);
            }

            // Ambil total jumlah item untuk pagination
            // Membuat query terpisah untuk menghitung total item
            let countQuery = supabase
                .from("items")
                .select('id', { count: 'exact' });

            // Tambahkan pencarian jika ada
            if (searchTerm) {
                countQuery = countQuery.ilike('name', `%${searchTerm}%`);
            }

            const { count, error: countError } = await countQuery;
            if (countError) throw countError;

            // Tambahkan pagination
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data, error } = await query
                .order('name')
                .range(from, to);

            if (error) {
                console.error("Error fetching items:", error);
                throw error;
            }

            // Ambil data referensi
            const { data: categories } = await supabase.from("item_categories").select("id, name");
            const { data: types } = await supabase.from("item_types").select("id, name");
            const { data: units } = await supabase.from("item_units").select("id, name");

            // Gabungkan data
            const completedData = (data || []).map(item => ({
                id: item.id,
                name: item.name,
                code: item.code,
                base_price: item.base_price,
                sell_price: item.sell_price,
                stock: item.stock,
                category: {
                    name: categories?.find(cat => cat.id === item.category_id)?.name || ""
                },
                type: { name: types?.find(t => t.id === item.type_id)?.name || "" },
                unit: { name: units?.find(u => u.id === item.unit_id)?.name || "" }
            }));

            setTotalItems(count || 0);
            setItems(completedData);
        } catch (error) {
            console.error("Error fetching items:", error);
        } finally {
            setTableLoading(false);
            // Setelah loading pertama, set loading utama menjadi false
            if (loading) {
                setLoading(false);
            }
        }
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1); // Reset ke halaman pertama
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Daftar Item</h1>

                <Link
                    to="/master-data/items/add"
                >
                    <Button variant="primary">
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
                    onChange={(e) => setSearch(e.target.value)}
                />
                <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
            </div>

            {loading ? (
                <Loading />
            ) : (
                <>
                    {tableLoading ? (
                        <div>
                            <Loading/>
                        </div>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Nama Item</TableHeader>
                                    <TableHeader>Kode</TableHeader>
                                    <TableHeader>Kategori</TableHeader>
                                    <TableHeader>Jenis</TableHeader>
                                    <TableHeader>Satuan</TableHeader>
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
                                            colSpan={9}
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
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <FaTrash />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
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

    async function handleDelete(id: string) {
        if (window.confirm("Apakah Anda yakin ingin menghapus item ini?")) {
            try {
                const { error } = await supabase
                    .from("items")
                    .delete()
                    .eq("id", id);

                if (error) throw error;

                // Refresh data
                fetchItems(currentPage, debouncedSearch, itemsPerPage);
            } catch (error) {
                console.error("Error deleting item:", error);
                alert("Gagal menghapus item. Silakan coba lagi.");
            }
        }
    }
};

export default ItemList;