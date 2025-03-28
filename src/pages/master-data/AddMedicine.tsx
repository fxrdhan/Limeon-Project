import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Loading } from "../../components/ui/Loading";
import { FaSave, FaTimes } from "react-icons/fa";

// Menambahkan tipe untuk map objects
type CodeMap = {
    [key: string]: string;
};

interface Category {
    id: string;
    name: string;
}

interface MedicineType {
    id: string;
    name: string;
}

interface Unit {
    id: string;
    name: string;
}

// Mapping untuk pembuatan kode
const TYPE_CODE_MAP: CodeMap = {
    "f295e143-883f-4222-b5ce-0428f858d7f4": "T", // Tablet
    "b355eadc-2a48-45bf-bbf2-1b0249de3060": "K", // Kapsul
    "56db61b8-6fc0-47a4-82f3-960a6a33e84c": "S", // Sirup
    "a237f060-7cce-4638-9d0b-510b55519a62": "S", // Salep
    "d510c9c5-d8db-488c-a634-fee521d23d07": "I", // Injeksi
};

const UNIT_CODE_MAP: CodeMap = {
    "cc8e891c-34ac-4afb-944c-258ad244a96f": "T", // Tablet
    "05990da0-faa0-4f5e-92e9-bc1f2ef4defc": "K", // Kapsul
    "28dbe949-54a2-4198-baba-ed162a041cbe": "B", // Botol
    "6727b61b-8063-422d-a89a-16b378d5d76d": "T", // Tube
    "1713eeb1-8ca9-4302-be6a-1e9ccde39cf1": "A", // Ampul
    "d7ec80ef-00b0-4b57-8086-d6ad803a68cc": "S", // Strip
};

const CATEGORY_CODE_MAP: CodeMap = {
    "0d1d6848-96b5-448e-a136-3aba8a9bbbca": "AB", // Antibiotik
    "a21f33c1-42aa-4171-a826-59a7e00c315d": "AP", // Antipiretik
    "502e0a0c-9a29-4003-b309-979b659b30db": "AG", // Analgesik
    "26e20a27-a34e-424e-9a85-babc2abdc955": "AD", // Antidiabetes
    "c0264ffd-cdd0-4c8f-b5c3-36d040005f5a": "AH", // Antihipertensi
};

const AddMedicine = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [types, setTypes] = useState<MedicineType[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    // State untuk nilai yang ditampilkan dengan format mata uang
    const [displayBuyPrice, setDisplayBuyPrice] = useState('');
    const [displaySellPrice, setDisplaySellPrice] = useState('');
    // const [latestSequence, setLatestSequence] = useState<Record<string, number>>(
    //     {}
    // );

    // Form state
    const [formData, setFormData] = useState({
        code: "", // Kode akan dibuat otomatis
        name: "",
        type_id: "",
        category_id: "",
        unit_id: "",
        rack: "",
        description: "",
        buy_price: 0,
        sell_price: 0,
        min_stock: 10,
        is_active: true,
        has_expiry_date: false,
    });

    // Fungsi untuk mengonversi angka ke format mata uang Rupiah
    const formatRupiah = (angka: number): string => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(angka);
    };

    // Fungsi untuk mengonversi string format Rupiah ke angka
    const parseRupiah = (rupiahString: string): number => {
        // Menghapus semua karakter non-digit
        const numericString = rupiahString.replace(/[^\d]/g, '');
        return numericString ? parseInt(numericString) : 0;
    };

    // Mengubah nilai form data saat komponen dimount
    useEffect(() => {
        if (formData.buy_price) {
            setDisplayBuyPrice(formatRupiah(formData.buy_price));
        }
        if (formData.sell_price) {
            setDisplaySellPrice(formatRupiah(formData.sell_price));
        }
    }, []);

    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        const generateItemCode = async () => {
            // Jika tipe, kategori, atau satuan belum dipilih, keluar dari fungsi
            if (!formData.type_id || !formData.category_id || !formData.unit_id)
                return;

            const typeCode = TYPE_CODE_MAP[formData.type_id] || "X";
            const unitCode = UNIT_CODE_MAP[formData.unit_id] || "X";
            const categoryCode = CATEGORY_CODE_MAP[formData.category_id] || "XX";

            const codePrefix = `${typeCode}${unitCode}${categoryCode}`;

            // Cek database untuk mendapatkan urutan terakhir
            try {
                const { data } = await supabase
                    .from("medicines")
                    .select("code")
                    .ilike("code", `${codePrefix}%`)
                    .order("code", { ascending: false });

                let sequence = 1; // Default mulai dari 1

                if (data && data.length > 0) {
                    // Ekstrak nomor urut dari kode yang sudah ada
                    const lastSequenceStr = data[0].code.substring(codePrefix.length);
                    const lastSequence = parseInt(lastSequenceStr);

                    if (!isNaN(lastSequence)) {
                        sequence = lastSequence + 1;
                    }
                }

                // Format: membuat kode 2 digit (01, 02, ..., dst)
                const sequenceStr = sequence.toString().padStart(2, "0");
                const generatedCode = `${codePrefix}${sequenceStr}`;

                // Update form
                setFormData(prevFormData => ({
                    ...prevFormData,
                    code: generatedCode,
                }));
            } catch (error) {
                console.error("Error generating item code:", error);
            }
        };

        if (formData.type_id && formData.category_id && formData.unit_id) {
            generateItemCode();
        }
    }, [formData.type_id, formData.category_id, formData.unit_id]);

    const fetchMasterData = async () => {
        setLoading(true);
        try {
            // Fetch categories
            const { data: categoriesData } = await supabase
                .from("medicine_categories")
                .select("id, name")
                .order("name");

            // Fetch types
            const { data: typesData } = await supabase
                .from("medicine_types")
                .select("id, name")
                .order("name");

            // Fetch units
            const { data: unitsData } = await supabase
                .from("medicine_units")
                .select("id, name")
                .order("name");

            if (categoriesData) setCategories(categoriesData);
            if (typesData) setTypes(typesData);
            if (unitsData) setUnits(unitsData);
        } catch (error) {
            console.error("Error fetching master data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
    ) => {
        const { name, value, type } = e.target as HTMLInputElement;

        if (name === "buy_price" || name === "sell_price") {
            // Untuk input harga
            const numericValue = value.replace(/[^\d]/g, '');
            const numericInt = numericValue ? parseInt(numericValue) : 0;
            
            // Update formData dengan nilai numerik
            setFormData({
                ...formData,
                [name]: numericInt
            });
            
            // Update display value dengan format Rupiah
            const formattedValue = formatRupiah(numericInt);
            if (name === "buy_price") {
                setDisplayBuyPrice(formattedValue);
            } else {
                setDisplaySellPrice(formattedValue);
            }
        } else if (type === "checkbox") {
            const { checked } = e.target as HTMLInputElement;
            setFormData({
                ...formData,
                [name]: checked,
            });
        } else if (type === "number") {
            setFormData({
                ...formData,
                [name]: parseFloat(value) || 0,
            });
        } else {
            setFormData({
                ...formData,
                [name]: value,
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Check jika nama obat sudah ada
            const { data: existingMedicine } = await supabase
                .from("medicines")
                .select("name")
                .eq("name", formData.name)
                .maybeSingle();

            if (existingMedicine) {
                alert("Nama obat sudah terdaftar. Gunakan nama lain.");
                setSaving(false);
                return;
            }

            // Insert data obat baru
            const { error } = await supabase.from("medicines").insert({
                name: formData.name,
                category_id: formData.category_id,
                type_id: formData.type_id,
                unit_id: formData.unit_id,
                buy_price: formData.buy_price,
                sell_price: formData.sell_price,
                stock: 0, // Default stok awal 0
                min_stock: formData.min_stock,
                description: formData.description || null,
                is_active: formData.is_active,
                rack: formData.rack || null,
                code: formData.code,
                has_expiry_date: formData.has_expiry_date,
            });

            if (error) throw error;

            // Redirect ke halaman daftar obat
            navigate("/master-data/medicines");
        } catch (error) {
            console.error("Error saving medicine:", error);
            alert("Gagal menyimpan data obat. Silakan coba lagi.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Tambah Data Obat Baru</CardTitle>
                </CardHeader>

                {loading ? (
                    <CardContent>
                        <Loading />
                    </CardContent>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <CardContent>
                            <div className="border border-gray-200 rounded-lg mb-6">
                                <h2 className="text-lg font-semibold bg-gray-100 p-3 border-b">
                                    Data Umum
                                </h2>
                                <div className="p-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Kode Item
                                            </label>
                                            <Input
                                                name="code"
                                                value={formData.code}
                                                disabled={true}
                                                className="w-full"
                                                style={formData.code === "" ? {
                                                    background: 'repeating-linear-gradient(45deg, #f0f0f0, #f0f0f0 10px, #e0e0e0 10px, #e0e0e0 20px)'
                                                } : {}}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nama Item
                                        </label>
                                        <Input
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Jenis
                                            </label>
                                            <div className="flex">
                                                <select
                                                    name="type_id"
                                                    value={formData.type_id}
                                                    onChange={handleChange}
                                                    className="bg-white w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    required
                                                >
                                                    <option value="">-- Pilih Jenis --</option>
                                                    {types.map((type) => (
                                                        <option key={type.id} value={type.id}>
                                                            {type.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    className="ml-2 bg-green-500 text-white p-2 rounded-md hover:bg-green-600"
                                                    onClick={() => navigate("/master-data/types/add")}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Kategori
                                            </label>
                                            <div className="flex">
                                                <select
                                                    name="category_id"
                                                    value={formData.category_id}
                                                    onChange={handleChange}
                                                    className="bg-white w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    required
                                                >
                                                    <option value="">-- Pilih Kategori --</option>
                                                    {categories.map((category) => (
                                                        <option key={category.id} value={category.id}>
                                                            {category.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    className="ml-2 bg-green-500 text-white p-2 rounded-md hover:bg-green-600"
                                                    onClick={() =>
                                                        navigate("/master-data/categories/add")
                                                    }
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Satuan
                                            </label>
                                            <div className="flex">
                                                <select
                                                    name="unit_id"
                                                    value={formData.unit_id}
                                                    onChange={handleChange}
                                                    className="bg-white w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    required
                                                >
                                                    <option value="">-- Pilih Satuan --</option>
                                                    {units.map((unit) => (
                                                        <option key={unit.id} value={unit.id}>
                                                            {unit.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    className="ml-2 bg-green-500 text-white p-2 rounded-md hover:bg-green-600"
                                                    onClick={() => navigate("/master-data/units/add")}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Rak
                                            </label>
                                            <Input
                                                name="rack"
                                                value={formData.rack}
                                                onChange={handleChange}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Keterangan
                                        </label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg mb-6">
                                <h2 className="text-lg font-semibold bg-gray-100 p-3 border-b">
                                    Harga Jual
                                </h2>
                                <div className="p-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Harga Beli
                                            </label>
                                            <Input
                                                type="text"
                                                name="buy_price"
                                                value={displayBuyPrice}
                                                placeholder="Rp 0"
                                                onChange={handleChange}
                                                className="w-full"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Harga Jual
                                            </label>
                                            <Input
                                                type="text"
                                                name="sell_price"
                                                value={displaySellPrice}
                                                placeholder="Rp 0"
                                                onChange={handleChange}
                                                className="w-full"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-lg mb-6">
                                <h2 className="text-lg font-semibold bg-gray-100 p-3 border-b">
                                    Pengaturan Tambahan
                                </h2>
                                <div className="p-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Status Jual
                                            </label>
                                            <div className="space-x-6">
                                                <label className="inline-flex items-center">
                                                    <input
                                                        type="radio"
                                                        name="is_active"
                                                        checked={formData.is_active}
                                                        onChange={() =>
                                                            setFormData({ ...formData, is_active: true })
                                                        }
                                                        className="form-radio h-5 w-5 text-primary"
                                                    />
                                                    <span className="ml-2">Masih dijual</span>
                                                </label>
                                                <label className="inline-flex items-center">
                                                    <input
                                                        type="radio"
                                                        name="is_active"
                                                        checked={!formData.is_active}
                                                        onChange={() =>
                                                            setFormData({ ...formData, is_active: false })
                                                        }
                                                        className="form-radio h-5 w-5 text-primary"
                                                    />
                                                    <span className="ml-2">Tidak Dijual</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Stok Minimal
                                            </label>
                                            <Input
                                                type="number"
                                                name="min_stock"
                                                value={formData.min_stock}
                                                onChange={handleChange}
                                                className="w-full"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="inline-flex items-center">
                                            <input
                                                type="checkbox"
                                                name="has_expiry_date"
                                                checked={formData.has_expiry_date}
                                                onChange={handleChange}
                                                className="form-checkbox h-5 w-5 text-primary"
                                            />
                                            <span className="ml-2">Memiliki Tanggal Kadaluarsa</span>
                                        </label>
                                        <div className="mt-1 text-sm text-gray-500">
                                            Jika dicentang, obat ini akan menggunakan metode FEFO
                                            (First Expired First Out)
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="flex justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate("/master-data/medicines")}
                            >
                                <div className="flex items-center">
                                    <FaTimes className="mr-2" /> <span>Batal</span>
                                </div>
                            </Button>
                            <Button type="submit" 
                                    disabled={saving} 
                                    isLoading={saving}
                            >
                                <FaSave className="mr-2" /> Simpan
                            </Button>
                        </CardFooter>
                    </form>
                )}
            </Card>
        </div>
    );
};

export default AddMedicine;
