import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { FaPlus } from "react-icons/fa";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../../components/ui/Table";
import { Loading } from "../../components/ui/Loading";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { AddCategoryModal } from "../../components/ui/AddEditModal";

interface Category {
    id: string;
    name: string;
    description: string;
}

const CategoryList = () => {
    const { openConfirmDialog } = useConfirmDialog();
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!isEditModalOpen && editingCategory) {
            timer = setTimeout(() => {
                setEditingCategory(null);
            }, 300);
        }
        return () => clearTimeout(timer);
    }, [editingCategory, isEditModalOpen]);

    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from("item_categories")
            .select("*")
            .order("name");

        if (error) throw error;
        return data || [];
    };

    const { data: categories = [], isLoading, isError, error } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: fetchCategories,
        staleTime: 30 * 1000,
        refetchOnMount: true,
    });

    const queryError = error instanceof Error ? error : null;

    const deleteCategoryMutation = useMutation({
        mutationFn: async (categoryId: string) => {
            const { error } = await supabase.from("item_categories").delete().eq("id", categoryId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
        onError: (error) => {
            alert(`Gagal menghapus kategori: ${error.message}`);
        },
    });

    const addCategoryMutation = useMutation({
        mutationFn: async (newCategory: { name: string; description: string }) => {
            const { error } = await supabase.from("item_categories").insert(newCategory);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setIsAddModalOpen(false);
        },
        onError: (error) => {
            alert(`Gagal menambahkan kategori: ${error.message}`);
        },
    });

    const updateCategoryMutation = useMutation({
        mutationFn: async (updatedCategory: { id: string; name: string; description: string }) => {
            const { id, ...updateData } = updatedCategory;
            const { error } = await supabase
                .from("item_categories")
                .update(updateData)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setIsEditModalOpen(false);
            setEditingCategory(null);
        },
        onError: (error) => {
            alert(`Gagal memperbarui kategori: ${error.message}`);
        },
    });

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setIsEditModalOpen(true);
    };

    const handleModalSubmit = async (categoryData: { id?: string; name: string; description: string }) => {
        if (categoryData.id) {
            await updateCategoryMutation.mutateAsync(categoryData as { id: string; name: string; description: string });
        } else {
            await addCategoryMutation.mutateAsync(categoryData);
        }
    };

    return (
        <>
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 text-center flex-grow">Daftar Kategori Item</h1>
                    <Button
                        variant="primary"
                        className="flex items-center"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <FaPlus className="mr-2" />
                        Tambah Kategori Baru
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
                                <TableHeader>Nama Kategori</TableHeader>
                                <TableHeader>Deskripsi</TableHeader>
                                {/* Removed the "Aksi" column */}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {categories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center text-gray-500">
                                        Tidak ada data kategori yang ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.map((category) => (
                                    <TableRow
                                        key={category.id}
                                        onClick={() => handleEdit(category)}
                                        className="cursor-pointer"
                                    >
                                        <TableCell>{category.name}</TableCell>
                                        <TableCell>{category.description}</TableCell>
                                        {/* Removed the "Aksi" cell */}
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
                isLoading={addCategoryMutation.isPending}
            />

            <AddCategoryModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)} 
                onSubmit={handleModalSubmit}
                initialData={editingCategory || undefined}
                onDelete={editingCategory ? (categoryId) => {
                    openConfirmDialog({
                        title: "Konfirmasi Hapus",
                        message: `Apakah Anda yakin ingin menghapus kategori item "${editingCategory.name}"?`,
                        variant: "danger",
                        confirmText: "Hapus",
                        onConfirm: () => {
                            deleteCategoryMutation.mutate(categoryId);
                            setIsEditModalOpen(false);
                        }
                    });
                } : undefined}
                isLoading={updateCategoryMutation.isPending}
                isDeleting={deleteCategoryMutation.isPending}
            />
        </>
    );
};

export default CategoryList;