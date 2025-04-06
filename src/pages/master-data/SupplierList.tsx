// src/pages/master-data/SupplierList.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loading } from '../../components/ui/Loading';
import { FaPlus, FaEye } from 'react-icons/fa';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'; // Reuse existing Card components if needed
import DetailEditModal from '../../components/ui/DetailEditModal';

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

const SupplierList = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

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
            setSaving(true);
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
        } finally {
            setSaving(false);
        }
    };
    
    const supplierFields = [
        { key: 'name', label: 'Nama Supplier', editable: true },
        { key: 'address', label: 'Alamat', type: 'textarea', editable: true },
        { key: 'phone', label: 'Telepon', type: 'tel', editable: true },
        { key: 'email', label: 'Email', type: 'email', editable: true },
        { key: 'contact_person', label: 'Kontak Person', editable: true }
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
                        <div
                            key={supplier.id}
                            className="group relative aspect-video h-48 md:h-56 bg-gray-300 rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-xl"
                            onClick={() => openSupplierDetail(supplier)}
                        >
                            {/* View Detail Button (visible on hover) */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <div className="bg-white rounded-full p-2 shadow-md">
                                    <FaEye className="text-blue-500" />
                                </div>
                            </div>
                           
                            {/* Background Image (Placeholder) */}
                            <img
                                // Replace with actual supplier.image_url when available
                                src={supplier.image_url || `https://picsum.photos/seed/${supplier.id}/400/300`}
                                alt={`Gambar ${supplier.name}`}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                            />

                            {/* Name Overlay */}
                            {/* Tambahkan kelas untuk menyembunyikan overlay saat hover */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/65 via-black/40 to-transparent transition-opacity duration-500 ease-in-out group-hover:opacity-0">
                                <h3 className="text-white font-semibold truncate text-lg">
                                    {supplier.name}
                                </h3>
                            </div>

                            {/* Address Hover Overlay */}
                            <div className="absolute inset-0 p-4 bg-black/70 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out">
                                <h3 className="text-white font-semibold truncate text-lg mb-1">
                                    {supplier.name}
                                </h3>
                                <p className="text-gray-200 text-sm line-clamp-3">
                                    {supplier.address || 'Alamat tidak tersedia'}
                                </p>
                                {/* Optional: Add more details on hover */}
                                {/* <p className="text-gray-300 text-xs mt-1">{supplier.phone || '-'}</p> */}
                                {/* <p className="text-gray-300 text-xs">{supplier.contact_person || '-'}</p> */}
                            </div>
                        </div>
                    ))}

                    {/* Add New Supplier Card */}
                    <Link
                        to="/master-data/suppliers/add" // Adjust the route as needed
                        className="group aspect-video h-48 md:h-56 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary hover:bg-blue-30/50 hover:shadow-lg transition-all duration-500 ease-in-out cursor-pointer transform hover:scale-105"
                    >
                        <FaPlus className="text-4xl mb-2 transition-all duration-500 ease-in-out group-hover:scale-125 group-hover:rotate-90" />
                        <span className="text-sm font-medium transition-all duration-500 ease-in-out group-hover:font-bold">Tambah Supplier Baru</span>
                    </Link>
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
                    imageUrl={selectedSupplier.image_url}
                    imagePlaceholder={`https://picsum.photos/seed/${selectedSupplier.id}/400/300`}
                />
            )}
        </Card>
    );
};

export default SupplierList;