// src/pages/master-data/SupplierList.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Loading } from '../../components/ui/Loading';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import DetailEditModal from '../../components/ui/DetailEditModal';
import ImageCard from '../../components/ui/ImageCard';
import AddItemCard from '../../components/ui/AddItemCard';

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

    const updateSupplierMutation = useMutation({
        mutationFn: updateSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        },
        onError: (error) => {
            console.error("Error updating supplier:", error);
            alert(`Gagal memperbarui supplier: ${error.message}`);
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

    const supplierFields: FieldConfig[] = [
        { key: 'name', label: 'Nama Supplier', type: 'text', editable: true },
        { key: 'address', label: 'Alamat', type: 'textarea', editable: true },
        { key: 'phone', label: 'Telepon', type: 'tel', editable: true },
        { key: 'email', label: 'Email', type: 'email', editable: true },
        { key: 'contact_person', label: 'Kontak Person', type: 'text', editable: true }
    ];

    return (
        <Card className="bg-transparent shadow-none border-none">
            <CardHeader className="mb-6 px-0">
                <CardTitle>Daftar Supplier</CardTitle>
            </CardHeader>

            {isLoading && <Loading message="Memuat supplier..." />}
            {isError && <div className="text-center text-red-500">Error: {queryError?.message || 'Gagal memuat data'}</div>}

            {!isLoading && !isError && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-24">
                    {(suppliers || []).map((supplier) => (
                        <ImageCard
                            key={supplier.id}
                            id={supplier.id}
                            title={supplier.name}
                            subtitle={supplier.address || 'Alamat tidak tersedia'}
                            imageUrl={supplier.image_url ?? undefined}
                            fallbackImage={`https://picsum.photos/seed/${supplier.id}/400/300`}
                            onClick={() => openSupplierDetail(supplier)}
                        />
                    ))}
                    <AddItemCard label="Tambah Supplier Baru" to="/master-data/suppliers/add" />
                </div>
            )}
            {!isLoading && suppliers && suppliers.length === 0 && !isError && (
                <div className="text-center text-gray-500 mt-8">
                    Belum ada data supplier.
                </div>
            )}

            {isModalOpen && selectedSupplier && (
                <DetailEditModal
                    title={`Detail Supplier: ${selectedSupplier.name}`}
                    data={selectedSupplier}
                    fields={supplierFields}
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={async (updatedData) => {
                        await updateSupplierMutation.mutateAsync(updatedData);
                    }}
                    imageUrl={selectedSupplier.image_url || undefined}
                    imagePlaceholder={`https://picsum.photos/seed/${selectedSupplier.id}/400/300`}
                />
            )}
        </Card>
    );
};

export default SupplierList;