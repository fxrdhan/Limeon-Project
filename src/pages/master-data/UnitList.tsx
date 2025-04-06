import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { FaEdit, FaTrash } from "react-icons/fa";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
// import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../../components/ui/Table";
import { Loading } from "../../components/ui/Loading";
import ImageCard from "../../components/ui/ImageCard";
import AddItemCard from "../../components/ui/AddItemCard";

interface Unit {
    id: string;
    name: string;
    description: string;
}

const UnitList = () => {
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUnits();
    }, []);

    const fetchUnits = async () => {
        try {
            setLoading(true);
            
            const { data, error } = await supabase
                .from("item_units")
                .select("*")
                .order("name");
                
            if (error) throw error;
            
            setUnits(data || []);
        } catch (error) {
            console.error("Error fetching units:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus satuan item ini?")) {
            try {
                const { error } = await supabase
                    .from("item_units")
                    .delete()
                    .eq("id", id);
                
                if (error) throw error;
                
                fetchUnits(); // Refresh data after deletion
            } catch (error) {
                console.error("Error deleting unit:", error);
                alert("Gagal menghapus satuan item. Silakan coba lagi.");
            }
        }
    };

    return (
        <Card>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Daftar Satuan Item</h1>
            </div>            

            {loading ? (
                <Loading />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {/* Unit Cards */}
                    {units.length === 0 ? (
                        <div className="text-center text-gray-500 col-span-full">
                            Tidak ada data satuan yang ditemukan
                        </div>
                    ) : (
                        units.map((unit) => (
                            <div key={unit.id} className="relative group">
                                <ImageCard
                                    id={unit.id}
                                    title={unit.name}
                                    subtitle={unit.description || 'Tidak ada deskripsi'}
                                    fallbackImage={`https://picsum.photos/seed/${unit.id}/400/300`}
                                    onClick={() => {}} // Bisa digunakan untuk modal edit
                                />
                                {/* Overlay untuk tombol aksi */}
                                <div className="absolute bottom-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <Link
                                        to={`/master-data/units/edit/${unit.id}`}
                                    >
                                        <Button variant="secondary" size="sm">
                                            <FaEdit />
                                        </Button>
                                    </Link>
                                    <Button 
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleDelete(unit.id)}
                                    >
                                        <FaTrash />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Add New Unit Card */}
                    <AddItemCard label="Tambah Satuan Baru" to="/master-data/units/add" />
                </div>
            )}
        </Card>
    );
};

export default UnitList;