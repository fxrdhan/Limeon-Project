// src/pages/master-data/SupplierList.tsx
import { useEffect, useState } from 'react';
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
    // Field image_url dari database Supabase
    image_url?: string | null;
}

// Definisikan interface untuk field config sesuai dengan yang diharapkan DetailEditModal
interface FieldConfig {
    key: string;
    label: string;
    type?: 'text' | 'email' | 'tel' | 'textarea';
    editable?: boolean;
}

const SupplierList = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('suppliers')
                .select('id, name, address, phone, email, contact_person, image_url')
                .order('name');

            if (error) throw error;
            setSuppliers(data || []);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error("Error fetching suppliers:", err);
            setError("Gagal memuat data supplier.");
        } finally {
            setLoading(false);
        }
    };
    
    const openSupplierDetail = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
    };
    
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedSupplier(null);
    };
    
    const updateSupplier = async (updatedData: Partial<Supplier>) => {
        if (!selectedSupplier) return;
        
        try {
            const { error } = await supabase
                .from('suppliers')
                .update(updatedData)
                .eq('id', selectedSupplier.id);
                
            if (error) throw error;
            
            // Refresh data setelah update
            fetchSuppliers();
        } catch (err) {
            console.error("Error updating supplier:", err);
            throw err;
        }
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

            {loading && <Loading message="Memuat supplier..." />}
            {error && <div className="text-center text-red-500">{error}</div>}

            {!loading && !error && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-24">
                    {/* Supplier Cards */}
                    {suppliers.map((supplier) => (
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

                    {/* Add New Supplier Card */}
                    <AddItemCard label="Tambah Supplier Baru" to="/master-data/suppliers/add" />
                </div>
            )}
            {!loading && suppliers.length === 0 && !error && (
                <div className="text-center text-gray-500 mt-8">
                    Belum ada data supplier.
                </div>
            )}
            
            {/* Modal Detail dan Edit */}
            {isModalOpen && selectedSupplier && (
                <DetailEditModal
                    title={`Detail Supplier: ${selectedSupplier.name}`}
                    data={selectedSupplier}
                    fields={supplierFields}
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={updateSupplier}
                    imageUrl={selectedSupplier.image_url || undefined}
                    imagePlaceholder={`https://picsum.photos/seed/${selectedSupplier.id}/400/300`}
                />
            )}
        </Card>
    );
};

export default SupplierList;