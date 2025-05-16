import { Link } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import {
    Card,
    Button,
    SearchBar,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableHeader,
    Pagination,
} from "@/components/ui";
import { useItemListManagement } from "@/pages/handlers";

function ItemList() {
    const {
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
    } = useItemListManagement();

    return (
        <Card
            className={isFetching ? "opacity-75 transition-opacity duration-300" : ""}
        >
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 text-center flex-grow">
                    Daftar Item
                </h1>

                <Link to="/master-data/items/add">
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
            {isError && (
                <div className="text-center p-6 text-red-500">
                    Error: {error instanceof Error ? error.message : "Gagal memuat data"}
                </div>
            )}

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
                                    <TableCell colSpan={10} className="text-center text-gray-600">
                                        {debouncedSearch
                                            ? `Tidak ada item dengan nama "${debouncedSearch}"`
                                            : "Tidak ada data item yang ditemukan"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        onClick={() =>
                                            navigate(`/master-data/items/edit/${item.id}`)
                                        }
                                        className="cursor-pointer hover:bg-blue-50"
                                    >
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>{item.code}</TableCell>
                                        <TableCell>{item.barcode || "-"}</TableCell>
                                        <TableCell>{item.category.name}</TableCell>
                                        <TableCell>{item.type.name}</TableCell>
                                        <TableCell>{item.unit.name}</TableCell>
                                        <TableCell>
                                            {item.unit_conversions && item.unit_conversions.length > 0
                                                ? item.unit_conversions
                                                    .map((uc: { unit_name: string }) => uc.unit_name)
                                                    .join(", ")
                                                : "-"}
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
