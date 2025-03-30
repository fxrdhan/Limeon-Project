import { useEffect } from "react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../../components/ui/Table";
import { FormSection, FormField } from "../../components/ui/FormComponents";
import { UseUnitConversionReturn } from "../../hooks/useUnitConversion";
import { FaTrash } from "react-icons/fa";

interface UnitConversionManagerProps {
    unitConversionHook: UseUnitConversionReturn;
}

const UnitConversionManager: React.FC<UnitConversionManagerProps> = ({
    unitConversionHook
}) => {
    const {
        baseUnit,
        setBaseUnit,
        basePrice,
        setBasePrice,
        unitConversions,
        addUnitConversion,
        removeUnitConversion,
        unitConversionFormData,
        setUnitConversionFormData,
        recalculateBasePrices,
        sortConversions,
        availableUnits
    } = unitConversionHook;

    // Recalculate base prices when base price changes
    useEffect(() => {
        if (basePrice > 0 && unitConversions.length > 0) {
            recalculateBasePrices();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [basePrice]);

    // Sort conversions when they change
    useEffect(() => {
        if (unitConversions.length > 1) {
            sortConversions();
        }
    }, [unitConversions.length, sortConversions]);

    // Handler untuk satuan dasar
    const handleBaseUnitChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === "baseUnit") {
            setBaseUnit(value);
        } else if (name === "basePrice") {
            setBasePrice(parseFloat(value) || 0);
        }
    };

    // Handler untuk form konversi satuan
    const handleConversionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setUnitConversionFormData({
            ...unitConversionFormData,
            [name]: name === "conversion" ? parseFloat(value) || 0 : value,
        });
    };

    // Tambahkan konversi baru
    const handleAddConversion = () => {
        if (!unitConversionFormData.unit || unitConversionFormData.conversion <= 0) {
            alert("Satuan dan konversi harus diisi dengan benar!");
            return;
        }

        // Cek apakah satuan sudah ada
        const existingUnit = unitConversions.find(uc => uc.unit === unitConversionFormData.unit);
        if (existingUnit) {
            alert("Satuan tersebut sudah ada dalam daftar!");
            return;
        }

        addUnitConversion({
            unit: unitConversionFormData.unit,
            conversion: unitConversionFormData.conversion,
        });

        // Reset form
        setUnitConversionFormData({
            unit: "",
            conversion: 0,
        });
    };

    // Menghitung harga pokok dasar
    const handleCalculateBasePrice = () => {
        if (unitConversions.length === 0) {
            alert("Tambahkan satuan konversi terlebih dahulu!");
            return;
        }
        
        recalculateBasePrices();
    };

    return (
        <FormSection title="Satuan dan Konversi">
            <div>
                <h3 className="text-lg font-medium mb-3">Daftar Konversi</h3>
                <p className="text-sm text-gray-600 mb-3">
                    Konversi akan diurutkan dari satuan terbesar ke terkecil. Satuan dengan konversi terbesar dianggap sebagai satuan terbesar.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField label="Satuan Konversi">
                        <select
                            name="unit"
                            value={unitConversionFormData.unit}
                            onChange={handleConversionFormChange}
                            className="w-full p-3 border rounded-md"
                        >
                            <option value="">-- Pilih Satuan --</option>
                            {availableUnits
                                .filter(unit => unit.name !== baseUnit)
                                .filter(unit => !unitConversions.some(uc => uc.unit === unit.name))
                                .map(unit => (
                                <option key={unit.id} value={unit.name}>
                                    {unit.name}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label={`1 ${unitConversionFormData.unit || 'satuan'} = ? ${baseUnit || 'satuan dasar'}`}>
                        <div className="flex space-x-2">
                            <Input
                                name="conversion"
                                value={unitConversionFormData.conversion || ""}
                                onChange={handleConversionFormChange}
                                type="number"
                                min="1"
                                placeholder="Jumlah satuan dasar"
                                className="w-full"
                            />
                            <Button
                                type="button"
                                onClick={handleAddConversion}
                                className="whitespace-nowrap"
                            >
                                Tambah Satuan
                            </Button>
                        </div>
                    </FormField>
                </div>

                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Urutan</TableHeader>
                                <TableHeader>Satuan</TableHeader>
                                <TableHeader>Konversi</TableHeader>
                                <TableHeader>Harga Pokok</TableHeader>
                                <TableHeader className="text-center">Aksi</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {unitConversions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-gray-500">
                                        Belum ada data konversi
                                    </TableCell>
                                </TableRow>
                            ) : (
                                unitConversions.map((uc, index) => (
                                    <TableRow key={uc.id}>
                                        <TableCell>
                                            {index === 0 ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Terbesar
                                                </span>
                                            ) : index === unitConversions.length - 1 ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    Terkecil
                                                </span>
                                            ) : (
                                                `#${index + 1}`
                                            )}
                                        </TableCell>
                                        <TableCell>{uc.unit}</TableCell>
                                        <TableCell>
                                            1 {uc.unit} = {uc.conversion} {baseUnit}
                                        </TableCell>
                                        <TableCell>
                                            {(uc.basePrice || 0).toLocaleString("id-ID", {
                                                style: "currency",
                                                currency: "IDR",
                                            })}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => removeUnitConversion(uc.id)}
                                            >
                                                <FaTrash />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCalculateBasePrice}
                    >
                        Hitung Harga Pokok
                    </Button>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Satuan terbesar adalah yang memiliki nilai konversi paling besar ke satuan dasar.</li>
                        <li>Harga pokok otomatis dihitung berdasarkan konversi dari harga pokok satuan dasar.</li>
                        <li className="text-red-500 font-semibold">PENTING: Disarankan untuk tidak mengubah satuan jika sudah terdapat transaksi yang berhubungan dengan item ini.</li>
                    </ul>
                </div>
            </div>
        </FormSection>
    );
};

export default UnitConversionManager;