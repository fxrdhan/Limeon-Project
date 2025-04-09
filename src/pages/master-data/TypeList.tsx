import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../../components/ui/Table";
import { Loading } from "../../components/ui/Loading";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";

interface ItemType {
    id: string;
    name: string;
    description: string;
}

const TypeList = () => {
    const [types, setTypes] = useState<ItemType[]>([]);
    const [loading, setLoading] = useState(true);
    const { openConfirmDialog } = useConfirmDialog();

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        try {
            setLoading(true);
            
            const { data, error } = await supabase
                .from("item_types")
                .select("*")
                .order("name");
                
            if (error) throw error;
            
            setTypes(data || []);
        } catch (error) {
            console.error("Error fetching item types:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Daftar Jenis Item</h1>
                
                <Link
                    to="/master-data/types/add"
                >
                    <Button variant="primary">
                        <FaPlus className="mr-2" />
                        Tambah Jenis Item Baru
                    </Button>
                </Link>
            </div>
            
            {loading ? (
                <Loading />
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
                                                <Link
                                                    to={`/master-data/types/edit/${type.id}`}
                                                >
                                                    <Button variant="secondary" size="sm">
                                                        <FaEdit />
                                                    </Button>
                                                </Link>
                                                <Button 
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(type.id)}
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
    );
    
    async function handleDelete(id: string) {
        openConfirmDialog({
            title: "Konfirmasi Hapus",
            message: `Apakah Anda yakin ingin menghapus jenis item ini? Data yang terhubung mungkin akan terpengaruh.`,
            variant: 'danger',
            confirmText: "Hapus",
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from("item_types")
                        .delete()
                        .eq("id", id);
                    if (error) throw error;
                    fetchTypes(); // Refresh data after deletion
                } catch (error) {
                    console.error("Error deleting item type:", error);
                    alert("Gagal menghapus jenis item. Silakan coba lagi.");
                }
            }
        });
    }
};

export default TypeList;
