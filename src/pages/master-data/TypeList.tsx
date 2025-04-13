import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "../../lib/supabase";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../../components/ui/Table";
import { Loading } from "../../components/ui/Loading";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { AddCategoryModal } from "../../components/ui/AddEditModal";

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

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!isEditModalOpen && editingType) {
            timer = setTimeout(() => {
                setEditingType(null);
            }, 300);
        }
        return () => clearTimeout(timer);
    }, [editingType, isEditModalOpen]);

    const fetchTypes = async () => {
        try {
            const { data, error } = await supabase
                .from("item_types")
                .select("id, name, description")
                .order("name");
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Error fetching item types:", error);
            throw error;
        }
    };

    const { data: types = [], isLoading, isError, error } = useQuery<ItemType[]>({
        queryKey: ['types'],
        queryFn: fetchTypes,
        staleTime: 30 * 1000,
        refetchOnMount: true,
    });

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

    const handleDelete = async (type: ItemType) => {
        openConfirmDialog({
            title: "Konfirmasi Hapus",
            message: `Apakah Anda yakin ingin menghapus jenis item "${type.name}"? Data yang terhubung mungkin akan terpengaruh.`,
            variant: 'danger',
            confirmText: "Hapus",
            onConfirm: () => {
                deleteTypeMutation.mutate(type.id);
            }
        });
    };

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

    return (
        <>
            <Card>
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
                
                {isLoading ? (
                    <Loading />
                ) : isError ? (
                    <div className="text-center p-6 text-red-500">Error: {queryError?.message || 'Gagal memuat data'}</div>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Nama Jenis</TableHeader>
                                <TableHeader>Deskripsi</TableHeader>
                                <TableHeader className="text-center">Aksi</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {types.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-gray-500">
                                        Tidak ada data jenis item yang ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                types.map((type) => (
                                    <TableRow key={type.id}>
                                        <TableCell>{type.name}</TableCell>
                                        <TableCell>{type.description}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center space-x-2">
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm"
                                                    onClick={() => handleEdit(type)}
                                                >
                                                    <FaEdit />
                                                </Button>
                                                <Button 
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(type)}
                                                    disabled={deleteTypeMutation.isPending && deleteTypeMutation.variables === type.id}
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
