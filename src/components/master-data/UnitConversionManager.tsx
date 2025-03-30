import { useEffect } from "react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../ui/Table";
import { FormSection, FormField } from "../ui/FormComponents";
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
        // setBaseUnit,
        basePrice,
        // setBasePrice,
        unitConversions,
        addUnitConversion,
        removeUnitConversion,
        unitConversionFormData,
        setUnitConversionFormData,
        recalculateBasePrices,
        availableUnits
    } = unitConversionHook;

    // Recalculate base prices when base price changes
    useEffect(() => {
        if (basePrice > 0 && unitConversions.length > 0) {
            recalculateBasePrices();
        }
    }, [basePrice, unitConversions.length, recalculateBasePrices]);

    // const handleBaseUnitChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    //     const { name, value } = e.target;
    //     if (name === "baseUnit") {
    //         setBaseUnit(value);
    //     } else if (name === "basePrice") {
    //         setBasePrice(parseFloat(value) || 0);
    //     }
    // };

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
    // const handleCalculateBasePrice = () => {
    //     if (unitConversions.length === 0) {
    //         alert("Tambahkan satuan konversi terlebih dahulu!");
    //         return;
    //     }
        
    //     recalculateBasePrices();
    // };

    return (
        <FormSection title="Satuan dan Konversi">
            <div>
                <h3 className="text-lg font-medium mb-3">Konversi Satuan</h3>
                <p className="text-sm text-gray-600 mb-3">
                    Tentukan berapa banyak satuan turunan dalam satu satuan dasar.
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

                    <FormField label={`1 ${baseUnit || 'satuan dasar'} = ? ${unitConversionFormData.unit || 'satuan'}`}>
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
                                <TableHeader>Satuan Turunan</TableHeader>
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
                                        <TableCell>{uc.unit}</TableCell>
                                        <TableCell>
                                            1 {baseUnit} = {uc.conversion} {uc.unit}
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

                <div className="mt-4 text-sm text-gray-600">
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Harga pokok satuan turunan dihitung dengan: Harga pokok satuan dasar ÷ jumlah satuan turunan.</li>
                        <li className="text-red-500 font-semibold">PENTING: Disarankan untuk tidak mengubah satuan jika sudah terdapat transaksi yang berhubungan dengan item ini.</li>
                    </ul>
                </div>
            </div>
        </FormSection>
    );
};

export default UnitConversionManager;