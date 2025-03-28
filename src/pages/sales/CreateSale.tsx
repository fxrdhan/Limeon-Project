import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { FaPlus, FaTrash, FaSearch } from 'react-icons/fa';

interface Medicine {
    id: string;
    name: string;
    sell_price: number;
    stock: number;
}

interface Patient {
    id: string;
    name: string;
}

interface Doctor {
    id: string;
    name: string;
}

interface SaleFormData {
    patient_id: string;
    doctor_id: string;
    payment_method: string;
    items: {
        medicine_id: string;
        quantity: number;
        price: number;
        subtotal: number;
    }[];
}

const CreateSale = () => {
    const navigate = useNavigate();
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchMedicine, setSearchMedicine] = useState('');
    const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
    const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);

    const { control, handleSubmit, setValue, watch, register, formState: { errors } } = useForm<SaleFormData>({
        defaultValues: {
            patient_id: '',
            doctor_id: '',
            payment_method: 'cash',
            items: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const items = watch('items');
    const total = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

    useEffect(() => {
        fetchMedicines();
        fetchPatients();
        fetchDoctors();
    }, []);

    const fetchMedicines = async () => {
        const { data } = await supabase
            .from('medicines')
            .select('id, name, sell_price, stock')
            .gt('stock', 0)
            .order('name');

        if (data) setMedicines(data);
    };

    const fetchPatients = async () => {
        const { data } = await supabase
            .from('patients')
            .select('id, name')
            .order('name');

        if (data) setPatients(data);
    };

    const fetchDoctors = async () => {
        const { data } = await supabase
            .from('doctors')
            .select('id, name')
            .order('name');

        if (data) setDoctors(data);
    };

    const addItem = () => {
        if (!selectedMedicine) return;

        append({
            medicine_id: selectedMedicine.id,
            quantity: 1,
            price: selectedMedicine.sell_price,
            subtotal: selectedMedicine.sell_price
        });

        setSelectedMedicine(null);
        setSearchMedicine('');
    };

    const updateSubtotal = (index: number, quantity: number, price: number) => {
        setValue(`items.${index}.subtotal`, quantity * price);
    };

    const filteredMedicines = medicines.filter(medicine =>
        medicine.name.toLowerCase().includes(searchMedicine.toLowerCase())
    );

    const onSubmit = async (data: SaleFormData) => {
        try {
            setLoading(true);

            // Insert sale record
            const { data: saleData, error: saleError } = await supabase
                .from('sales')
                .insert({
                    patient_id: data.patient_id || null,
                    doctor_id: data.doctor_id || null,
                    date: new Date(),
                    total: total,
                    payment_method: data.payment_method
                })
                .select('id')
                .single();

            if (saleError) throw saleError;

            // Insert sale items
            const saleItems = data.items.map(item => ({
                sale_id: saleData.id,
                medicine_id: item.medicine_id,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal
            }));

            const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(saleItems);

            if (itemsError) throw itemsError;

            // Update medicine stocks
            for (const item of data.items) {
                await supabase
                    .from('medicines')
                    .update({
                        stock: supabase.rpc('decrement', { x: item.quantity })
                    })
                    .eq('id', item.medicine_id);
            }

            navigate('/sales');
        } catch (error) {
            console.error('Error creating sale:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Buat Penjualan Baru</h1>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block mb-2 text-gray-700">Pasien (Opsional)</label>
                        <select
                            {...register('patient_id')}
                            className="w-full p-3 border rounded-md"
                        >
                            <option value="">-- Pilih Pasien --</option>
                            {patients.map(patient => (
                                <option key={patient.id} value={patient.id}>{patient.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2 text-gray-700">Dokter (Opsional)</label>
                        <select
                            {...register('doctor_id')}
                            className="w-full p-3 border rounded-md"
                        >
                            <option value="">-- Pilih Dokter --</option>
                            {doctors.map(doctor => (
                                <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2 text-gray-700">Metode Pembayaran</label>
                        <select
                            {...register('payment_method')}
                            className="w-full p-3 border rounded-md"
                        >
                            <option value="cash">Tunai</option>
                            <option value="debit">Kartu Debit</option>
                            <option value="credit">Kartu Kredit</option>
                            <option value="insurance">Asuransi</option>
                        </select>
                    </div>
                </div>

                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">Daftar Obat</h2>

                    <div className="mb-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari obat..."
                                className="w-full p-3 border rounded-md"
                                value={searchMedicine}
                                onChange={(e) => {
                                    setSearchMedicine(e.target.value);
                                    setShowMedicineDropdown(true);
                                }}
                                onFocus={() => setShowMedicineDropdown(true)}
                            />

                            {showMedicineDropdown && searchMedicine && (
                                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {filteredMedicines.length === 0 ? (
                                        <div className="p-3 text-gray-500">Tidak ada obat yang ditemukan</div>
                                    ) : (
                                        filteredMedicines.map(medicine => (
                                            <div
                                                key={medicine.id}
                                                className="p-3 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => {
                                                    setSelectedMedicine(medicine);
                                                    setSearchMedicine(medicine.name);
                                                    setShowMedicineDropdown(false);
                                                }}
                                            >
                                                <div>{medicine.name}</div>
                                                <div className="text-sm text-gray-500">
                                                    Stok: {medicine.stock} | Harga: {medicine.sell_price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-2 flex">
                            <button
                                type="button"
                                className="px-4 py-2 bg-primary text-white rounded-md flex items-center disabled:opacity-50"
                                onClick={addItem}
                                disabled={!selectedMedicine}
                            >
                                <FaPlus className="mr-2" />
                                Tambah Obat
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="py-3 px-4 text-left">Nama Obat</th>
                                    <th className="py-3 px-4 text-right">Harga</th>
                                    <th className="py-3 px-4 text-center">Kuantitas</th>
                                    <th className="py-3 px-4 text-right">Subtotal</th>
                                    <th className="py-3 px-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {fields.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-4 px-4 text-center text-gray-500">
                                            Belum ada item
                                        </td>
                                    </tr>
                                ) : (
                                    fields.map((field, index) => {
                                        const medicine = medicines.find(m => m.id === items[index]?.medicine_id);

                                        return (
                                            <tr key={field.id}>
                                                <td className="py-3 px-4">{medicine?.name}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <Controller
                                                        control={control}
                                                        name={`items.${index}.price`}
                                                        render={({ field }) => (
                                                            <input
                                                                type="number"
                                                                className="w-32 p-2 border rounded-md text-right"
                                                                {...field}
                                                                onChange={(e) => {
                                                                    const price = parseFloat(e.target.value);
                                                                    field.onChange(price);
                                                                    updateSubtotal(index, items[index]?.quantity || 0, price);
                                                                }}
                                                            />
                                                        )}
                                                    />
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <Controller
                                                        control={control}
                                                        name={`items.${index}.quantity`}
                                                        render={({ field }) => (
                                                            <input
                                                                type="number"
                                                                className="w-20 p-2 border rounded-md text-center"
                                                                min="1"
                                                                max={medicine?.stock || 1}
                                                                {...field}
                                                                onChange={(e) => {
                                                                    const quantity = parseInt(e.target.value);
                                                                    field.onChange(quantity);
                                                                    updateSubtotal(index, quantity, items[index]?.price || 0);
                                                                }}
                                                            />
                                                        )}
                                                    />
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {items[index]?.subtotal?.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        type="button"
                                                        className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600"
                                                        onClick={() => remove(index)}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            <tfoot className="bg-gray-50 font-semibold">
                                <tr>
                                    <td colSpan={3} className="py-3 px-4 text-right">Total:</td>
                                    <td className="py-3 px-4 text-right">
                                        {total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        className="px-4 py-2 border rounded-md mr-2"
                        onClick={() => navigate('/sales')}
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-md"
                        disabled={loading || fields.length === 0}
                    >
                        {loading ? 'Menyimpan...' : 'Simpan Penjualan'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateSale;