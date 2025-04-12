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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [basePrice, recalculateBasePrices]);

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
        const existingUnit = unitConversions.find(uc => uc.unit.name === unitConversionFormData.unit);
        if (existingUnit) {
            alert("Satuan tersebut sudah ada dalam daftar!");
            return;
        }

        const selectedUnit = availableUnits.find(u => u.name === unitConversionFormData.unit);
        if (!selectedUnit) {
            alert("Satuan tidak valid!");
            return;
        }

        addUnitConversion({
            unit: selectedUnit,
            unit_name: selectedUnit.name,
            to_unit_id: selectedUnit.id,
            conversion: unitConversionFormData.conversion,
            basePrice: 0
        });

        // Reset form
        setUnitConversionFormData({
            unit: "",
            conversion: 0,
        });
    };

    return (
        <FormSection title="Satuan dan Konversi">
            <div>
                <h3 className="text-lg font-medium mb-3">Konversi Satuan</h3>
                <p className="text-sm text-gray-600 mb-3">
                    Tentukan berapa banyak satuan turunan dalam satu satuan dasar.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField label="Satuan Turunan">
                        <select
                            name="unit"
                            value={unitConversionFormData.unit}
                            onChange={handleConversionFormChange}
                            className="w-full p-3 border rounded-md"
                        >
                            <option value="">-- Pilih Satuan --</option>
                            {availableUnits
                                .filter(unit => unit.name !== baseUnit)
                                .filter(unit => !unitConversions.some(uc => uc.unit.name === unit.name))
                                .map(unit => (
                                    <option key={unit.id} value={unit.name}>
                                        {unit.name}
                                    </option>
                                ))}
                        </select>
                    </FormField>

                    <FormField label={`1 ${baseUnit || 'Satuan Dasar'} = ? ${unitConversionFormData.unit || 'Satuan'}`}>
                        <Input
                            name="conversion"
                            value={unitConversionFormData.conversion || ""}
                            onChange={handleConversionFormChange}
                            type="number"
                            min="1"
                            placeholder="Jumlah Satuan Dasar"
                            className="w-full"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault(); // Mencegah submit form jika ada
                                    handleAddConversion();
                                }
                            }}
                        />
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
                                // Filter untuk menghilangkan duplikat berdasarkan unit.name
                                unitConversions.filter((uc, index, self) =>
                                    index === self.findIndex(u => u.unit.name === uc.unit.name)
                                ).map((uc) => (
                                    <TableRow key={uc.id}>
                                        <TableCell>{uc.unit.name}</TableCell>
                                        <TableCell>
                                            1 {baseUnit} = {uc.conversion} {uc.unit.name}
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