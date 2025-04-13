import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Loading } from '../../components/ui/Loading';
import { Card, CardHeader } from '../../components/ui/Card';
import DetailEditModal from '../../components/ui/DetailEditModal';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { FaPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useConfirmDialog } from '../../components/ui/ConfirmDialog';

interface Supplier {
    id: string;
    name: string;
    address: string | null;
    phone?: string | null;
    email?: string | null;
    contact_person?: string | null;
    image_url?: string | null;
}

interface FieldConfig {
    key: string;
    label: string;
    type?: 'text' | 'email' | 'tel' | 'textarea';
    editable?: boolean;
}

const SupplierList = () => {
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    const updateSupplierMutation = useMutation<void, Error, Partial<Supplier>>({
        mutationFn: updateSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        },
        onError: (error) => {
            console.error("Error updating supplier:", error);
            alert(`Gagal memperbarui supplier: ${error.message}`);
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

    const openSupplierDetail = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedSupplier(null);
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

    return (
        <Card>
            <CardHeader className="mb-6 px-0">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800 text-center flex-grow">Daftar Supplier</h1>
                    <Link to="/master-data/suppliers/add">
                        <Button variant="primary" className="flex items-center">
                            <FaPlus className="mr-2" />
                            Tambah Supplier Baru
                        </Button>
                    </Link>
                </div>
            </CardHeader>

            {isLoading && <Loading message="Memuat supplier..." />}
            {isError && <div className="text-center text-red-500">Error: {queryError?.message || 'Gagal memuat data'}</div>}

            {!isLoading && !isError && (
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeader>Nama Supplier</TableHeader>
                            <TableHeader>Alamat</TableHeader>
                            <TableHeader>Telepon</TableHeader>
                            <TableHeader>Kontak Person</TableHeader>
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

            {isModalOpen && selectedSupplier && (
                <DetailEditModal
                    title={`${selectedSupplier.name}`}
                    data={transformSupplierForModal(selectedSupplier)}
                    fields={supplierFields}
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={async (updatedData: Record<string, string | number | boolean | null>) => {
                        await updateSupplierMutation.mutateAsync(updatedData);
                    }}
                    onImageSave={handleSupplierImageSave}
                    onDeleteRequest={() => {
                        if (selectedSupplier) handleDelete(selectedSupplier);
                    }}
                    deleteButtonLabel="Hapus Supplier"
                    imageUrl={selectedSupplier.image_url || undefined}
                    imagePlaceholder={`https://picsum.photos/seed/${selectedSupplier.id}/400/300`}
                />
            )}
        </Card>
    );
};

export default SupplierList;