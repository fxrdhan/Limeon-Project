import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaEye } from "react-icons/fa";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { Loading } from "../../components/ui/Loading";
import { Badge } from "../../components/ui/Badge";

interface Purchase {
    id: string;
    invoice_number: string;
    date: string;
    total: number;
    payment_status: string;
    payment_method: string;
    supplier: {
        name: string;
    };
}

const PurchaseList = () => {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Effect for debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1); // Reset to first page when search changes
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    // Effect to fetch data when parameters change
    useEffect(() => {
        fetchPurchases(currentPage, debouncedSearch, itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, debouncedSearch, itemsPerPage]);

    const fetchPurchases = async (page = 1, searchTerm = '', limit = 10) => {
        try {
            setTableLoading(true);

            // Base query
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

            // Add search if present
            if (searchTerm) {
                query = query.or(`invoice_number.ilike.%${searchTerm}%,suppliers.name.ilike.%${searchTerm}%`);
            }

            // Get total count for pagination
            let countQuery = supabase
                .from("purchases")
                .select('id', { count: 'exact' });

            // Add search to count query if present
            if (searchTerm) {
                countQuery = countQuery.or(`invoice_number.ilike.%${searchTerm}%,suppliers.name.ilike.%${searchTerm}%`);
            }

            const { count, error: countError } = await countQuery;
            if (countError) throw countError;

            // Add pagination
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data, error } = await query
                .order('date', { ascending: false })
                .range(from, to);

            if (error) {
                console.error("Error fetching purchases:", error);
                throw error;
            }

            setTotalItems(count || 0);
            // Transform data to match the Purchase interface
            const transformedData = data?.map(item => ({
                ...item,
                supplier: Array.isArray(item.supplier) ? item.supplier[0] : item.supplier
            })) || [];
            setPurchases(transformedData);
        } catch (error) {
            console.error("Error fetching purchases:", error);
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
        setCurrentPage(1); // Reset to first page
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus pembelian ini?")) {
            try {
                // Ambil item-item yang terkait dengan pembelian ini
                const { data: purchaseItems, error: itemsError } = await supabase
                    .from("purchase_items")
                    .select("item_id, quantity, unit")
                    .eq("purchase_id", id);
                    
                if (itemsError) throw itemsError;
                
                // Update stok untuk setiap item
                for (const item of purchaseItems || []) {
                    // Ambil data item untuk mendapatkan satuan dasar, stok saat ini, dan konversi
                    const { data: itemData } = await supabase
                        .from('items')
                        .select('stock, base_unit, unit_conversions')
                        .eq('id', item.item_id)
                        .single();
                    
                    if (itemData) {
                        let quantityInBaseUnit = item.quantity;
                        
                        // Jika satuan pembelian berbeda dengan satuan dasar, konversikan
                        if (item.unit !== itemData.base_unit) {
                            const unitConversion = itemData.unit_conversions.find(
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (uc: { unit_name: any; }) => uc.unit_name === item.unit
                            );
                            
                            if (unitConversion) {
                                // Konversikan ke satuan dasar
                                quantityInBaseUnit = item.quantity / unitConversion.conversion_rate;
                            }
                        }
                        
                        // Hitung stok baru (kurangi dari stok yang ada) dan update
                        const newStock = Math.max(0, (itemData.stock || 0) - quantityInBaseUnit);
                        await supabase
                            .from('items').update({ stock: newStock }).eq('id', item.item_id);
                    }
                }

                // Setelah memperbarui stok, baru hapus purchase
                const { error } = await supabase
                    .from("purchases")
                    .delete()
                    .eq("id", id);

                if (error) throw error;
                fetchPurchases(currentPage, debouncedSearch, itemsPerPage);
            } catch (error) {
                console.error("Error deleting purchase:", error);
                alert("Gagal menghapus pembelian. Silakan coba lagi.");
            }
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'paid':
                return 'success';
            case 'partial':
                return 'warning';
            case 'unpaid':
                return 'danger';
            default:
                return 'secondary';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'paid':
                return 'Lunas';
            case 'partial':
                return 'Sebagian';
            case 'unpaid':
                return 'Belum Bayar';
            default:
                return status;
        }
    };

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'cash':
                return 'Tunai';
            case 'transfer':
                return 'Transfer';
            case 'credit':
                return 'Kredit';
            default:
                return method;
        }
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Daftar Pembelian</h1>

                <Link to="/purchases/create">
                    <Button variant="primary">
                        <FaPlus className="mr-2" />
                        Tambah Pembelian Baru
                    </Button>
                </Link>
            </div>

            <div className="mb-4 relative">
                <input
                    type="text"
                    placeholder="Cari nomor faktur atau supplier..."
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
                                    <TableHeader>No. Faktur</TableHeader>
                                    <TableHeader>Tanggal</TableHeader>
                                    <TableHeader>Supplier</TableHeader>
                                    <TableHeader className="text-right">Total</TableHeader>
                                    <TableHeader className="text-center">Status Pembayaran</TableHeader>
                                    <TableHeader className="text-center">Metode Pembayaran</TableHeader>
                                    <TableHeader className="text-center">Aksi</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {purchases.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="text-center text-gray-600"
                                        >
                                            {debouncedSearch ? `Tidak ada pembelian dengan kata kunci "${debouncedSearch}"` : "Tidak ada data pembelian yang ditemukan"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    purchases.map((purchase) => (
                                        <TableRow key={purchase.id}>
                                            <TableCell>{purchase.invoice_number}</TableCell>
                                            <TableCell>
                                                {new Date(purchase.date).toLocaleDateString('id-ID', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </TableCell>
                                            <TableCell>{purchase.supplier?.name || 'Tidak ada supplier'}</TableCell>
                                            <TableCell className="text-right">
                                                {purchase.total.toLocaleString('id-ID', {
                                                    style: 'currency',
                                                    currency: 'IDR'
                                                })}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={getStatusBadgeVariant(purchase.payment_status)}>
                                                    {getStatusLabel(purchase.payment_status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {getPaymentMethodLabel(purchase.payment_method)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center space-x-2">
                                                    <Link to={`/purchases/view/${purchase.id}`}>
                                                        <Button variant="primary" size="sm">
                                                            <FaEye />
                                                        </Button>
                                                    </Link>
                                                    <Link to={`/purchases/edit/${purchase.id}`}>
                                                        <Button variant="secondary" size="sm">
                                                            <FaEdit />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleDelete(purchase.id)}
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
                        itemsCount={purchases.length}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                    />
                </>
            )}
        </Card>
    );
};

export default PurchaseList;