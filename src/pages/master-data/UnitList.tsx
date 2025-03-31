import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../../components/ui/Table";
import { Loading } from "../../components/ui/Loading";

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
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Daftar Satuan Item</h1>
                
                <Link
                    to="/master-data/units/add"
                >
                    <Button variant="primary">
                        <FaPlus className="mr-2" />
                        Tambah Satuan Baru
                    </Button>
                </Link>
            </div>
            
            {loading ? (
                <Loading />
            ) : (
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeader>Nama Satuan</TableHeader>
                            <TableHeader>Deskripsi</TableHeader>
                            <TableHeader className="text-center">Aksi</TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                            {units.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-gray-500">
                                        Tidak ada data satuan yang ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                units.map((unit) => (
                                    <TableRow key={unit.id}>
                                        <TableCell>{unit.name}</TableCell>
                                        <TableCell>{unit.description}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center space-x-2">
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
                                        </TableCell>
                                    </Row>
                                ))
                            )}
                    </TableBody>
                </Table>
            )}
        </Card>
    );
};

export default UnitList;