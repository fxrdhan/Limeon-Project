import { Link, useNavigate } from "react-router-dom";
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
import { useMasterDataManagement } from "@/handlers";
import type { Item as ItemDataType, UnitConversion } from "@/types";

function ItemList() {
    const navigate = useNavigate();
    const {
        search,
        setSearch,
        debouncedSearch,
        currentPage,
        itemsPerPage,
        data,
        totalItems,
        isLoading,
        isError,
        queryError,
        isFetching,
        handlePageChange,
        handleItemsPerPageChange,
        totalPages,
    } = useMasterDataManagement("items", "Item");

    const items = data as ItemDataType[];

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
                <Link to="/master-data/items/add" state={{ searchQuery: debouncedSearch }} className="ml-4 mb-4 focus:outline-none focus:border-none focus:shadow-[0_0_5px_theme(colors.primary),0_0_15px_theme(colors.primary),0_0_30px_theme(colors.primary)] rounded-lg transition-shadow duration-300">
                    <Button variant="primary" className="flex items-center">
                        <FaPlus className="mr-2" />
                        Tambah Item Baru
                    </Button>
                </Link>
            </div>

            {isLoading && <div className="text-center p-6">Memuat data awal...</div>}
            {isError && (
                <div className="text-center p-6 text-red-500">
                    Error: {queryError instanceof Error ? queryError.message : "Gagal memuat data"}
                </div>
            )}

            {!isLoading && (
                <>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader className="w-[23%]">Nama Item</TableHeader>
                                <TableHeader className="w-[6%]">Kode</TableHeader>
                                <TableHeader className="w-[8%]">Barcode</TableHeader>
                                <TableHeader className="w-[8%]">Kategori</TableHeader>
                                <TableHeader className="w-[14%]">Jenis</TableHeader>
                                <TableHeader className="w-[6%]">Satuan</TableHeader>
                                <TableHeader className="w-[10%]">Satuan Turunan</TableHeader>
                                <TableHeader className="w-[10%] text-right">Harga Pokok</TableHeader>
                                <TableHeader className="w-[10%] text-right">Harga Jual</TableHeader>
                                <TableHeader className="w-[5%] text-center">Stok</TableHeader>
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
                                                    .map((uc: UnitConversion) => uc.unit?.name || 'N/A')
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
