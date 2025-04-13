import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "../../lib/supabase";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../../components/ui/Table";
import { Loading } from "../../components/ui/Loading";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { AddCategoryModal } from "../../components/ui/AddCategoryModal";

interface Category {
    id: string;
    name: string;
    description: string;
}

const CategoryList = () => {
    const { openConfirmDialog } = useConfirmDialog();
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
            console.log("Kategori berhasil dihapus, cache diinvalidasi.");
        },
        onError: (error) => {
            console.error("Error deleting category:", error);
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
            console.log("Kategori baru berhasil ditambahkan.");
        },
        onError: (error) => {
            console.error("Error adding category:", error);
            alert(`Gagal menambahkan kategori: ${error.message}`);
        },
    });

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
                                <TableHeader className="text-center">Aksi</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {categories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-gray-500">
                                        Tidak ada data kategori yang ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell>{category.name}</TableCell>
                                        <TableCell>{category.description}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center space-x-2">
                                                <Link to={`/master-data/categories/edit/${category.id}`}>
                                                    <Button variant="secondary" size="sm">
                                                        <FaEdit />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(category)}
                                                    disabled={deleteCategoryMutation.isPending && deleteCategoryMutation.variables === category.id}
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
                onSave={async (categoryData) => {
                    await addCategoryMutation.mutateAsync(categoryData);
                }}
                isLoading={addCategoryMutation.isPending}
            />
        </>
    );

    async function handleDelete(category: Category) {
        openConfirmDialog({
            title: "Konfirmasi Hapus",
            message: `Apakah Anda yakin ingin menghapus kategori item "${category.name}"?`,
            variant: "danger",
            confirmText: "Hapus",
            onConfirm: () => {
                deleteCategoryMutation.mutate(category.id);
            }
        });
    };
};

export default CategoryList;