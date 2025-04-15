import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { FaPlus, FaSearch } from "react-icons/fa";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../../components/ui/Table";
import { Loading } from "../../components/ui/Loading";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { AddCategoryModal } from "../../components/ui/AddEditModal";
import { Pagination } from "../../components/ui/Pagination";

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
    
    // New state for pagination and search
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!isEditModalOpen && editingCategory) {
            timer = setTimeout(() => {
                setEditingCategory(null);
            }, 300);
        }
        return () => clearTimeout(timer);
    }, [editingCategory, isEditModalOpen]);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const fetchCategories = async (page: number, searchTerm: string, limit: number) => {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let categoriesQuery = supabase
            .from("item_categories")
            .select("*");

        let countQuery = supabase
            .from("item_categories")
            .select('id', { count: 'exact' });

        if (searchTerm) {
            categoriesQuery = categoriesQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
            countQuery = countQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }

        const [categoriesResult, countResult] = await Promise.all([
            categoriesQuery.order('name').range(from, to),
            countQuery
        ]);

        if (categoriesResult.error) throw categoriesResult.error;
        if (countResult.error) throw countResult.error;

        return { 
            categories: categoriesResult.data || [], 
            totalCategories: countResult.count || 0 
        };
    };

    const { data, isLoading, isError, error, isFetching } = useQuery({
        queryKey: ['categories', currentPage, debouncedSearch, itemsPerPage],
        queryFn: () => fetchCategories(currentPage, debouncedSearch, itemsPerPage),
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000,
        refetchOnMount: true,
    });

    const categories = data?.categories || [];
    const totalCategories = data?.totalCategories || 0;
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

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalCategories / itemsPerPage);

    return (
        <>
            <Card className={isFetching ? 'opacity-75 transition-opacity duration-300' : ''}>
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

                <div className="mb-4 relative">
                    <input
                        type="text"
                        placeholder="Cari kategori..."
                        className="w-full p-3 border rounded-md pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)} />
                    <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                </div>

                {isLoading ? (
                    <Loading />
                ) : isError ? (
                    <div className="text-center p-6 text-red-500">Error: {queryError?.message || 'Gagal memuat data'}</div>
                ) : (
                    <>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Nama Kategori</TableHeader>
                                    <TableHeader>Deskripsi</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {categories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-gray-500">
                                            {debouncedSearch ? `Tidak ada kategori dengan nama "${debouncedSearch}"` : "Tidak ada data kategori yang ditemukan"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    categories.map((category) => (
                                        <TableRow
                                            key={category.id}
                                            onClick={() => handleEdit(category)}
                                            className="cursor-pointer hover:bg-blue-50"
                                        >
                                            <TableCell>{category.name}</TableCell>
                                            <TableCell>{category.description}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalCategories}
                            itemsPerPage={itemsPerPage}
                            itemsCount={categories.length}
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
                isLoading={addCategoryMutation.isPending}
                entityName="Kategori"
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
                entityName="Kategori"
            />
        </>
    );
};

export default CategoryList;