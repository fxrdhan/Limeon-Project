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
    PageTitle
} from "@/components/modules";
import { useItemListManagement } from "@/handlers";

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
            <div className="mb-6">
                <PageTitle title="Daftar Item" />
            </div>

            <div className="flex items-center">
                <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama atau kode item..."
                    className="flex-grow"
                />
                <Link to="/master-data/items/add" state={{ searchQuery: debouncedSearch }} className="focus:outline-none">
                    <Button variant="primary" className="flex items-center ml-4 mb-4">
                        <FaPlus className="mr-2" />
                        Tambah Item Baru
                    </Button>
                </Link>
            </div>

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
                                <TableHeader className="w-[23%]">Nama Item</TableHeader>
                                <TableHeader className="w-[5%]">Kode</TableHeader>
                                <TableHeader className="w-[8%]">Barcode</TableHeader>
                                <TableHeader className="w-[8%]">Kategori</TableHeader>
                                <TableHeader className="w-[14%]">Jenis</TableHeader>
                                <TableHeader className="w-[6%]">Satuan</TableHeader>
                                <TableHeader className="w-[10%]">Satuan Turunan</TableHeader>
                                <TableHeader className="w-[10%] text-right">Harga Pokok</TableHeader>
                                <TableHeader className="w-[10%] text-right">Harga Jual</TableHeader>
                                <TableHeader className="w-[6%] text-center">Stok</TableHeader>
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
