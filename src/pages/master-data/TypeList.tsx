import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from "../../lib/supabase";
import { FaPlus } from "react-icons/fa";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../../components/ui/Table";
import { Loading } from "../../components/ui/Loading";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { AddCategoryModal } from "../../components/ui/AddEditModal";
import { SearchBar } from "../../components/ui/TableSearchBar";
import { Pagination } from "../../components/ui/Pagination";

interface ItemType {
    id: string;
    name: string;
    description: string;
}

const TypeList = () => {
    const { openConfirmDialog } = useConfirmDialog();
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<ItemType | null>(null);
    
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!isEditModalOpen && editingType) {
            timer = setTimeout(() => {
                setEditingType(null);
            }, 300);
        }
        return () => clearTimeout(timer);
    }, [editingType, isEditModalOpen]);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const fetchTypes = async (page: number, searchTerm: string, limit: number) => {
        try {
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            
            let query = supabase
                .from("item_types")
                .select("id, name, description", { count: 'exact' });
                
            if (searchTerm) {
                query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
            }
            
            const { data, error, count } = await query
                .order("name")
                .range(from, to);
                
            if (error) throw error;
            
            return { types: data || [], totalTypes: count || 0 };
        } catch (error) {
            console.error("Error fetching item types:", error);
            throw error;
        }
    };

    const { data, isLoading, isError, error, isFetching } = useQuery({
        queryKey: ['types', currentPage, debouncedSearch, itemsPerPage],
        queryFn: () => fetchTypes(currentPage, debouncedSearch, itemsPerPage),
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000,
        refetchOnMount: true,
    });

    const types = data?.types || [];
    const totalTypes = data?.totalTypes || 0;
    const totalPages = Math.ceil(totalTypes / itemsPerPage);
    const queryError = error instanceof Error ? error : null;

    const deleteTypeMutation = useMutation({
        mutationFn: async (typeId: string) => {
            const { error } = await supabase.from("item_types").delete().eq("id", typeId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['types'] });
            console.log("Jenis item berhasil dihapus, cache diinvalidasi.");
        },
        onError: (error) => {
            console.error("Error deleting item type:", error);
            alert(`Gagal menghapus jenis item: ${error.message}`);
        },
    });

    const addTypeMutation = useMutation({
        mutationFn: async (newType: { name: string; description: string }) => {
            const { error } = await supabase.from("item_types").insert(newType);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['types'] });
            setIsAddModalOpen(false);
        },
        onError: (error) => {
            alert(`Gagal menambahkan jenis item: ${error.message}`);
        },
    });

    const updateTypeMutation = useMutation({
        mutationFn: async (updatedType: { id: string; name: string; description: string }) => {
            const { id, ...updateData } = updatedType;
            const { error } = await supabase
                .from("item_types")
                .update(updateData)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['types'] });
            setIsEditModalOpen(false);
            setEditingType(null);
        },
        onError: (error) => {
            alert(`Gagal memperbarui jenis item: ${error.message}`);
        },
    });

    const handleEdit = (type: ItemType) => {
        setEditingType(type);
        setIsEditModalOpen(true);
    };

    const handleModalSubmit = async (typeData: { id?: string; name: string; description: string }) => {
        if (typeData.id) {
            await updateTypeMutation.mutateAsync(typeData as { id: string; name: string; description: string });
        } else {
            await addTypeMutation.mutateAsync(typeData);
        }
    };
    
    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    return (
        <>
            <Card className={isFetching ? 'opacity-75 transition-opacity duration-300' : ''}>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 text-center flex-grow">Daftar Jenis Item</h1>
                    <Button 
                        variant="primary"
                        className="flex items-center" 
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <FaPlus className="mr-2" />
                        Tambah Jenis Item Baru
                    </Button>
                </div>
                
                <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama atau deskripsi jenis item..."
                />
                
                {isLoading ? (
                    <Loading />
                ) : isError ? (
                    <div className="text-center p-6 text-red-500">Error: {queryError?.message || 'Gagal memuat data'}</div>
                ) : (
                    <>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Nama Jenis</TableHeader>
                                    <TableHeader>Deskripsi</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {types.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-gray-500">
                                            {debouncedSearch ? `Tidak ada jenis item dengan nama "${debouncedSearch}"` : "Tidak ada data jenis item yang ditemukan"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    types.map((type) => (
                                        <TableRow 
                                            key={type.id}
                                            onClick={() => handleEdit(type)}
                                            className="cursor-pointer hover:bg-blue-50"
                                        >
                                            <TableCell>{type.name}</TableCell>
                                            <TableCell>{type.description}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalTypes}
                            itemsPerPage={itemsPerPage}
                            itemsCount={types.length}
                            onPageChange={handlePageChange}
                            onItemsPerPageChange={handleItemsPerPageChange}
                        />
                    </>
                )}
            </Card>

            <AddCategoryModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleModalSubmit}
                isLoading={addTypeMutation.isPending}
                entityName="Jenis Item"
            />

            <AddCategoryModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)} 
                onSubmit={handleModalSubmit}
                initialData={editingType || undefined}
                onDelete={editingType ? (typeId) => {
                    openConfirmDialog({
                        title: "Konfirmasi Hapus",
                        message: `Apakah Anda yakin ingin menghapus jenis item "${editingType.name}"?`,
                        variant: "danger",
                        confirmText: "Hapus",
                        onConfirm: () => {
                            deleteTypeMutation.mutate(typeId);
                            setIsEditModalOpen(false);
                        }
                    });
                } : undefined}
                isLoading={updateTypeMutation.isPending}
                isDeleting={deleteTypeMutation.isPending}
                entityName="Jenis Item"
            />
        </>
    );
};

export default TypeList;
