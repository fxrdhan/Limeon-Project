// import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
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
import { FaPlus } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import type { Item as ItemDataType, UnitConversion, UnitData } from "@/types";
import AddItemPortal from "./add-edit";

const fetchItemsList = async (page: number, searchTerm: string, limit: number) => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let itemsQuery = supabase.from("items").select(`
        id, name, code, barcode, base_price, sell_price, stock,
        unit_conversions, category_id, type_id, unit_id,
        item_categories (name), item_types (name), item_units (name)
    `);
    let countQuery = supabase.from("items").select("id", { count: "exact" });

    if (searchTerm) {
        const fuzzySearchPattern = `%${searchTerm.toLowerCase().split('').join('%')}%`;
        itemsQuery = itemsQuery.or(`name.ilike.${fuzzySearchPattern},code.ilike.${fuzzySearchPattern},barcode.ilike.${fuzzySearchPattern}`);
        countQuery = countQuery.or(`name.ilike.${fuzzySearchPattern},code.ilike.${fuzzySearchPattern},barcode.ilike.${fuzzySearchPattern}`);
    }

    const [itemsResult, countResult, allUnitsForConversionRes] = await Promise.all([
        itemsQuery.order("name").range(from, to),
        countQuery,
        supabase.from("item_units").select("id, name")
    ]);

    if (itemsResult.error) throw itemsResult.error;
    if (countResult.error) throw countResult.error;
    if (allUnitsForConversionRes.error) throw allUnitsForConversionRes.error;

    const allUnitsForConversion: UnitData[] = allUnitsForConversionRes.data || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completedData = (itemsResult.data || []).map((item: any) => {
        let parsedConversions: UnitConversion[] = [];
        if (typeof item.unit_conversions === 'string') {
            try {
                parsedConversions = JSON.parse(item.unit_conversions || "[]");
            } catch (e) {
                console.error("Error parsing unit_conversions for item:", item.id, e);
            }
        } else if (Array.isArray(item.unit_conversions)) {
            parsedConversions = item.unit_conversions;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedConversions: UnitConversion[] = parsedConversions.map((conv: any) => {
            const unitDetail = allUnitsForConversion.find(u => u.name === conv.unit_name);
            return {
                id: conv.id || Date.now().toString() + Math.random(),
                conversion_rate: conv.conversion_rate || conv.conversion || 0,
                unit_name: conv.unit_name || 'Unknown',
                to_unit_id: unitDetail ? unitDetail.id : '',
                unit: unitDetail ? { id: unitDetail.id, name: unitDetail.name } : { id: '', name: conv.unit_name || 'Unknown Unit' },
                conversion: conv.conversion_rate || conv.conversion || 0,
                basePrice: conv.basePrice ?? 0,
                sellPrice: conv.sellPrice ?? 0,
            };
        });

        return {
            id: item.id,
            name: item.name,
            code: item.code,
            barcode: item.barcode,
            base_price: item.base_price,
            sell_price: item.sell_price,
            stock: item.stock,
            unit_conversions: mappedConversions,
            category: { name: item.item_categories?.name || "" },
            type: { name: item.item_types?.name || "" },
            unit: { name: item.item_units?.name || "" },
        } as ItemDataType;
    });

    return { data: completedData, totalItems: countResult.count || 0 };
};

function ItemList() {
    // const navigate = useNavigate();
    // const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [items, setItems] = useState<ItemDataType[]>([]);
    const [totalItemsState, setTotalItemsState] = useState<number>(0);
    const [isLoadingState, setIsLoadingState] = useState<boolean>(true);
    const [isErrorState, setIsErrorState] = useState<boolean>(false);
    const [errorState, setErrorState] = useState<Error | null>(null);
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | undefined>(undefined);
    const [currentSearchQueryForModal, setCurrentSearchQueryForModal] = useState<string | undefined>(undefined);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchData = useCallback(async () => {
        setIsLoadingState(true);
        setIsErrorState(false);
        setErrorState(null);
        try {
            const result = await fetchItemsList(currentPage, debouncedSearch, itemsPerPage);
            setItems(result.data);
            setTotalItemsState(result.totalItems);
        } catch (err) {
            setIsErrorState(true);
            setErrorState(err instanceof Error ? err : new Error('An unknown error occurred'));
            setItems([]);
            setTotalItemsState(0);
        } finally {
            setIsLoadingState(false);
        }
    }, [currentPage, debouncedSearch, itemsPerPage]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openAddItemModal = (itemId?: string, searchQuery?: string) => {
        setEditingItemId(itemId);
        setCurrentSearchQueryForModal(searchQuery);
        setIsAddItemModalOpen(true);
    };

    const closeAddItemModal = () => {
        setIsAddItemModalOpen(false);
        setEditingItemId(undefined);
        setCurrentSearchQueryForModal(undefined);
        fetchData(); // Re-fetch data after modal closes
    };

    useEffect(() => {
        const channel = supabase
            .channel('item-list-changes')
            .on<ItemDataType>(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'items' },
                () => setTimeout(fetchData, 250)
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    const totalPages = Math.ceil(totalItemsState / itemsPerPage);
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    return (
        <>
            <Card
                className={isLoadingState ? "opacity-75 transition-opacity duration-300" : ""}
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
                    <Button 
                        variant="primary" 
                        className="flex items-center ml-4 mb-4 focus:outline-none focus:border-none focus:shadow-[0_0_5px_theme(colors.primary),0_0_15px_theme(colors.primary),0_0_30px_theme(colors.primary)] rounded-lg transition-shadow duration-300"
                        onClick={() => openAddItemModal(undefined, debouncedSearch)}
                    >
                        <FaPlus className="mr-2" />
                        Tambah Item Baru
                    </Button>
                </div>
                {isErrorState && (
                    <div className="text-center p-6 text-red-500">
                        Error: {errorState instanceof Error ? errorState.message : "Gagal memuat data"}
                    </div>
                )}
                {!isErrorState && (
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
                                {isLoadingState && items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center text-gray-500 py-10">
                                            Memuat data item...
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center text-gray-500 py-10">
                                            {debouncedSearch
                                                ? `Tidak ada item dengan nama "${debouncedSearch}"`
                                                : "Tidak ada data item yang ditemukan"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            onClick={() => openAddItemModal(item.id)}
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
                            totalItems={totalItemsState}
                            itemsPerPage={itemsPerPage}
                            itemsCount={items.length}
                            onPageChange={handlePageChange}
                            onItemsPerPageChange={handleItemsPerPageChange}
                        />
                    </>
                )}
            </Card>
            <AddItemPortal
                isOpen={isAddItemModalOpen}
                onClose={closeAddItemModal}
                itemId={editingItemId}
                initialSearchQuery={currentSearchQueryForModal}
            />
        </>
    );
}

export default ItemList;
