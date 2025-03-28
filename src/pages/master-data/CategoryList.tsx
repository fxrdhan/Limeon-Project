import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../../components/ui/Table";
import { Loading } from "../../components/ui/Loading";

interface Category {
    id: string;
    name: string;
    description: string;
}

const CategoryList = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            
            const { data, error } = await supabase
                .from("item_categories")
                .select("*")
                .order("name");
                
            if (error) throw error;
            
            setCategories(data || []);
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Daftar Kategori Item</h1>
                
                <Link to="/master-data/categories/add">
                    <Button variant="primary" className="flex items-center">
                        <FaPlus className="mr-2" />
                        Tambah Kategori Baru
                    </Button>
                </Link>
            </div>
            
            {loading ? (
                <Loading />
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
                                            <Link
                                                to={`/master-data/categories/edit/${category.id}`}
                                            >
                                                <Button variant="secondary" size="sm">
                                                    <FaEdit />
                                                </Button>
                                            </Link>
                                            <Button 
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleDelete(category.id)}
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
        if (window.confirm("Apakah Anda yakin ingin menghapus kategori item ini?")) {
            try {
                const { error } = await supabase
                    .from("item_categories")
                    .delete()
                    .eq("id", id);
                
                if (error) throw error;
                
                fetchCategories(); // Refresh data after deletion
            } catch (error) {
                console.error("Error deleting category:", error);
                alert("Gagal menghapus kategori item. Silakan coba lagi.");
            }
        }
    }
};

export default CategoryList;