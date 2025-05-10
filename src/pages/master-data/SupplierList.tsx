import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import type { Supplier, FieldConfig } from '../../types';
import { Card, CardHeader } from '../../components/ui/Card';
import DetailEditModal from '@/components/ui/modal/supplier';
import { useConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '../../components/ui/Table';

const SupplierList = () => {
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newSupplierImage, setNewSupplierImage] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const { openConfirmDialog } = useConfirmDialog();

    const fetchSuppliers = async () => {
        const { data, error } = await supabase
            .from('suppliers')
            .select('id, name, address, phone, email, contact_person, image_url')
            .order('name');

        if (error) throw error;
        return data || [];
    };

    const { data: suppliers, isLoading, isError, error } = useQuery<Supplier[]>({
        queryKey: ['suppliers'],
        queryFn: fetchSuppliers,
        staleTime: 30 * 1000,
        refetchOnMount: true,
    });

    const queryError = error instanceof Error ? error : null;

    const updateSupplier = async (updatedData: Partial<Supplier>) => {
        if (!selectedSupplier) return;

        const { error } = await supabase
            .from('suppliers')
            .update(updatedData)
            .eq('id', selectedSupplier.id);

        if (error) throw error;
    };

    const createSupplier = async (newSupplier: Partial<Supplier>) => {
        const dataToInsert = {
            ...newSupplier,
            image_url: newSupplierImage
        };
        
        const { data, error } = await supabase
            .from('suppliers')
            .insert([dataToInsert])
            .select();

        if (error) throw error;
        return data[0];
    };

    const updateSupplierMutation = useMutation<void, Error, Partial<Supplier>>({
        mutationFn: updateSupplier,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            if (selectedSupplier) {
                setSelectedSupplier(prev => prev ? { ...prev, ...variables } : null);
            }
        },
        onError: (error) => {
            console.error("Error updating supplier:", error);
            alert(`Gagal memperbarui supplier: ${error.message}`);
        },
    });

    const createSupplierMutation = useMutation<Supplier, Error, Partial<Supplier>>({
        mutationFn: createSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            setIsAddModalOpen(false);
            setNewSupplierImage(null);
        },
        onError: (error) => {
            console.error("Error creating supplier:", error);
            alert(`Gagal membuat supplier baru: ${error.message}`);
        },
    });

    const deleteSupplierMutation = useMutation({
        mutationFn: async (supplierId: string) => {
            const { error } = await supabase.from('suppliers').delete().eq('id', supplierId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            console.log("Supplier berhasil dihapus, cache diinvalidasi.");
        },
        onError: (error) => {
            console.error("Error deleting supplier:", error);
            alert(`Gagal menghapus supplier: ${error.message}`);
        },
    });

    const updateSupplierImageMutation = useMutation<void, Error, { supplierId: string; imageBase64: string }>({
        mutationFn: async ({ supplierId, imageBase64 }: { supplierId: string, imageBase64: string }) => {
            const { error } = await supabase
                .from('suppliers')
                .update({ image_url: imageBase64, updated_at: new Date().toISOString() })
                .eq('id', supplierId);
            if (error) throw error;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            setSelectedSupplier(prev => prev ? { ...prev, image_url: variables.imageBase64 } : null);
        },
        onError: (error) => {
            console.error("Error updating supplier image:", error);
            alert(`Gagal memperbarui foto supplier: ${error.message}`);
        },
    });

    const deleteSupplierImageMutation = useMutation<void, Error, string>({
        mutationFn: async (supplierId: string) => {
            const { error } = await supabase
                .from('suppliers')
                .update({ image_url: null, updated_at: new Date().toISOString() })
                .eq('id', supplierId);
            if (error) throw error;
        },
        onSuccess: (_data, supplierId) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            setSelectedSupplier(prev => prev ? { ...prev, image_url: null } : null);
            console.log(`Image for supplier ${supplierId} deleted.`);
        },
        onError: (error) => {
            console.error("Error deleting supplier image:", error);
            alert(`Gagal menghapus gambar supplier: ${error.message}`);
        },
    });

    const openSupplierDetail = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsEditModalOpen(true);
    };

    const openAddSupplierModal = () => {
        setIsAddModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        setNewSupplierImage(null);
    };

    const handleDelete = (supplier: Supplier) => {
        openConfirmDialog({
            title: "Konfirmasi Hapus",
            message: `Apakah Anda yakin ingin menghapus supplier "${supplier.name}"? Tindakan ini tidak dapat diurungkan.`,
            variant: 'danger',
            confirmText: "Hapus",
            onConfirm: () => deleteSupplierMutation.mutate(supplier.id)
        });
    };

    const handleSupplierImageSave = async ({ supplierId, imageBase64 }: { supplierId: string; imageBase64: string }) => {
        if (!selectedSupplier) return;
        await updateSupplierImageMutation.mutateAsync({ supplierId, imageBase64 });
    };

    const handleSupplierImageDelete = async (supplierId: string) => {
        await deleteSupplierImageMutation.mutateAsync(supplierId);
    };

    const handleNewSupplierImageUpload = (imageBase64: string) => {
        setNewSupplierImage(imageBase64);
    };

    const supplierFields: FieldConfig[] = [
        { key: 'name', label: 'Nama Supplier', type: 'text', editable: true },
        { key: 'address', label: 'Alamat', type: 'textarea', editable: true },
        { key: 'phone', label: 'Telepon', type: 'tel', editable: true },
        { key: 'email', label: 'Email', type: 'email', editable: true },
        { key: 'contact_person', label: 'Kontak Person', type: 'text', editable: true }
    ];

    const transformSupplierForModal = (supplier: Supplier | null): Record<string, string | number | boolean | null> => {
        if (!supplier) return {};
        return {
            id: supplier.id,
            name: supplier.name,
            address: supplier.address ?? '',
            phone: supplier.phone ?? '',
            email: supplier.email ?? '',
            contact_person: supplier.contact_person ?? '',
        };
    };

    const emptySupplierData = {
        name: '',
        address: '',
        phone: '',
        email: '',
        contact_person: ''
    };

    return (
        <Card>
            <CardHeader className="mb-6 px-0">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800 text-center flex-grow">Daftar Supplier</h1>
                    <Button 
                        variant="primary" 
                        className="flex items-center"
                        onClick={openAddSupplierModal}
                    >
                        <FaPlus className="mr-2" />
                        Tambah Supplier Baru
                    </Button>
                </div>
            </CardHeader>

            {isLoading && <Loading message="Memuat supplier..." />}
            {isError && <div className="text-center text-red-500">Error: {queryError?.message || 'Gagal memuat data'}</div>}

            {!isLoading && !isError && (
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeader className="w-[20%]">Nama Supplier</TableHeader>
                            <TableHeader className="w-[60%]">Alamat</TableHeader>
                            <TableHeader className="w-[10%]">Telepon</TableHeader>
                            <TableHeader className="w-[10%]">Kontak Person</TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {suppliers && suppliers.length > 0 ? (
                            suppliers.map((supplier) => (
                                <TableRow
                                    key={supplier.id}
                                    onClick={() => openSupplierDetail(supplier)}
                                    className="cursor-pointer hover:bg-blue-50"
                                >
                                    <TableCell>
                                        {supplier.name}
                                    </TableCell>
                                    <TableCell>{supplier.address || '-'}</TableCell>
                                    <TableCell>{supplier.phone || '-'}</TableCell>
                                    <TableCell>{supplier.contact_person || '-'}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-gray-500">
                                    Belum ada data supplier.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}

            <DetailEditModal
                title={selectedSupplier?.name || ''}
                data={transformSupplierForModal(selectedSupplier)}
                fields={supplierFields}
                isOpen={isEditModalOpen}
                onClose={closeEditModal}
                onSave={async (updatedData: Record<string, string | number | boolean | null>) => {
                    if (selectedSupplier) {
                        await updateSupplierMutation.mutateAsync(updatedData);
                    }
                    return Promise.resolve();
                }}
                onImageSave={handleSupplierImageSave}
                onImageDelete={handleSupplierImageDelete}
                onDeleteRequest={() => {
                    if (selectedSupplier) handleDelete(selectedSupplier);
                }}
                deleteButtonLabel="Hapus Supplier"
                imageUrl={selectedSupplier?.image_url || undefined}
                imagePlaceholder={selectedSupplier ? `https://picsum.photos/seed/${selectedSupplier.id}/400/300` : undefined}
                mode="edit"
            />

            <DetailEditModal
                title="Tambah Supplier Baru"
                data={emptySupplierData}
                fields={supplierFields}
                isOpen={isAddModalOpen}
                onClose={closeAddModal}
                onSave={async (newSupplierData) => {
                    await createSupplierMutation.mutateAsync(newSupplierData);
                    return Promise.resolve();
                }}
                onImageSave={({ imageBase64 }) => {
                    handleNewSupplierImageUpload(imageBase64);
                    return Promise.resolve();
                }}
                imagePlaceholder="https://via.placeholder.com/400x300?text=Foto+Supplier"
                mode="add"
            />
        </Card>
    );
};

export default SupplierList;