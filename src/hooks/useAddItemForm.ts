import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

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

interface FormData {
    code: string;
    name: string;
    type_id: string;
    category_id: string;
    unit_id: string;
    rack: string;
    description: string;
    buy_price: number;
    sell_price: number;
    min_stock: number;
    is_active: boolean;
    is_medicine: boolean;
    has_expiry_date: boolean;
}

export const useAddItemForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [types, setTypes] = useState<MedicineType[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    // State untuk nilai yang ditampilkan dengan format mata uang
    const [displayBuyPrice, setDisplayBuyPrice] = useState('');
    const [displaySellPrice, setDisplaySellPrice] = useState('');

    // Form state
    const [formData, setFormData] = useState<FormData>({
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
        is_medicine: true,
        has_expiry_date: false,
    });

    // Fungsi untuk memperbarui formData secara lebih mudah
    const updateFormData = (newData: Partial<FormData>) => {
        setFormData(prev => ({
            ...prev,
            ...newData
        }));
    };

    // Fungsi helper untuk menghasilkan kode dinamis
    const generateTypeCode = (typeId: string): string => {
        const selectedType = types.find(type => type.id === typeId);
        if (!selectedType) return "X";

        // Ambil huruf pertama dari nama tipe
        return selectedType.name.charAt(0).toUpperCase();
    };

    const generateUnitCode = (unitId: string): string => {
        const selectedUnit = units.find(unit => unit.id === unitId);
        if (!selectedUnit) return "X";

        // Ambil huruf pertama dari nama unit
        return selectedUnit.name.charAt(0).toUpperCase();
    };

    const generateCategoryCode = (categoryId: string): string => {
        const selectedCategory = categories.find(category => category.id === categoryId);
        if (!selectedCategory) return "XX";

        const name = selectedCategory.name;

        // Cek apakah kategori dimulai dengan "Anti"
        if (name.toLowerCase().startsWith("anti")) {
            // Untuk kategori yang dimulai dengan "Anti"
            // Ambil "A" dari "Anti" dan huruf pertama dari kata selanjutnya
            const baseName = name.slice(4); // Hilangkan "Anti" dari awal
            if (baseName.length > 0) {
                return "A" + baseName.charAt(0).toUpperCase();
            }
            return "A";
        } else {
            // Untuk kategori lainnya, ambil 2 huruf pertama
            if (name.length >= 2) {
                return name.substring(0, 2).toUpperCase();
            } else if (name.length === 1) {
                return name.toUpperCase() + "X";
            } else {
                return "XX";
            }
        }
    };

    // Fungsi untuk mengonversi angka ke format mata uang Rupiah
    const formatRupiah = (angka: number): string => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(angka);
    };

    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        const generateItemCode = async () => {
            // Jika tipe, kategori, atau satuan belum dipilih, keluar dari fungsi
            if (!formData.type_id || !formData.category_id || !formData.unit_id)
                return;

            const typeCode = generateTypeCode(formData.type_id);
            const unitCode = generateUnitCode(formData.unit_id);
            const categoryCode = generateCategoryCode(formData.category_id);

            const codePrefix = `${typeCode}${unitCode}${categoryCode}`;

            // Cek database untuk mendapatkan urutan terakhir
            try {
                const { data } = await supabase
                    .from("items")
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

        // Hanya generate code jika data master sudah dimuat dan semua pilihan sudah dipilih
        if (formData.type_id && formData.category_id && formData.unit_id &&
            categories.length > 0 && types.length > 0 && units.length > 0) {
            generateItemCode();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.type_id, formData.category_id, formData.unit_id, categories, types, units]);

    const fetchMasterData = async () => {
        setLoading(true);
        try {
            // Fetch categories
            const { data: categoriesData } = await supabase
                .from("item_categories")
                .select("id, name")
                .order("name");

            // Fetch types
            const { data: typesData } = await supabase
                .from("item_types")
                .select("id, name")
                .order("name");

            // Fetch units
            const { data: unitsData } = await supabase
                .from("item_units")
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
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

    // Modifikasi handleChange untuk menjamin pemicu generate kode
    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevFormData => ({
            ...prevFormData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Check jika nama obat sudah ada
            const { data: existingMedicine } = await supabase
                .from("items")
                .select("name")
                .eq("name", formData.name)
                .maybeSingle();

            if (existingMedicine) {
                alert("Nama item sudah terdaftar. Gunakan nama lain.");
                setSaving(false);
                return;
            }

            // Insert data obat baru
            const { error } = await supabase.from("items").insert({
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
                is_medicine: formData.is_medicine,
                has_expiry_date: formData.has_expiry_date,
            });

            if (error) throw error;

            // Redirect ke halaman daftar obat
            navigate("/master-data/items");
        } catch (error) {
            console.error("Error saving item:", error);
            alert("Gagal menyimpan data item. Silakan coba lagi.");
        } finally {
            setSaving(false);
        }
    };

    return {
        formData,
        displayBuyPrice,
        displaySellPrice,
        categories,
        types,
        units,
        loading,
        saving,
        handleChange,
        handleSelectChange,
        handleSubmit,
        updateFormData
    };
};