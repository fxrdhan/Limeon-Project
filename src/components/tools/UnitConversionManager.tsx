import { useEffect } from "react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Dropdown } from "../ui/Dropdown";
import { FaTrash } from "react-icons/fa";
import { FormSection, FormField } from "../ui/FormComponents";
import type { UnitConversionManagerProps } from '../../types';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from "../ui/Table";

const UnitConversionManager: React.FC<UnitConversionManagerProps> = ({
    unitConversionHook
}) => {
    const {
        baseUnit,
        basePrice,
        conversions,
        addUnitConversion,
        removeUnitConversion,
        unitConversionFormData,
        setUnitConversionFormData,
        recalculateBasePrices,
        availableUnits
    } = unitConversionHook;

    useEffect(() => {
        if (basePrice > 0 && conversions.length > 0) {
            recalculateBasePrices();
        }
    }, [basePrice, recalculateBasePrices, conversions.length]);

    const handleConversionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setUnitConversionFormData({
            ...unitConversionFormData,
            [name]: name === "conversion" ? parseFloat(value) || 0 : value,
        });
    };

    const handleUnitDropdownChange = (unitId: string) => {
        const selectedUnit = availableUnits.find(u => u.id === unitId);
        if (selectedUnit) {
            setUnitConversionFormData({
                ...unitConversionFormData,
                unit: selectedUnit.name,
            });
        }
    };

    const handleAddConversion = () => {
        if (!unitConversionFormData.unit || unitConversionFormData.conversion <= 0) {
            alert("Satuan dan konversi harus diisi dengan benar!");
            return;
        }

        const existingUnit = conversions.find(uc => uc.unit.name === unitConversionFormData.unit);
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
            basePrice: 0,
            sellPrice: 0
        });

        setUnitConversionFormData({
            unit: "",
            conversion: 0,
        });
    };

    return (
        <FormSection title="Satuan dan Konversi">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 md:w-1/3 lg:w-1/4">
                    <h3 className="text-lg font-medium mb-3">Tambah Konversi Satuan</h3>
                    <p className="text-sm text-gray-600 mb-3">
                        Berapa banyak satuan turunan yang setara dengan 1 {baseUnit || 'Satuan Dasar'}.
                    </p>
                    <div className="flex flex-row gap-4 mb-4">
                        <FormField label="Satuan Turunan" className="flex-1">
                            <Dropdown
                                name="unit"
                                value={availableUnits.find(u => u.name === unitConversionFormData.unit)?.id || ""}
                                onChange={handleUnitDropdownChange}
                                options={availableUnits
                                    .filter(unit => unit.name !== baseUnit)
                                    .filter(unit => !conversions.some(uc => uc.unit.name === unit.name))
                                    .map(unit => ({ id: unit.id, name: unit.name }))
                                }
                                placeholder="-- Pilih Satuan --"
                            />
                        </FormField>
                        <FormField label={`1 ${baseUnit || 'Satuan Dasar'} = ? ${unitConversionFormData.unit || 'Satuan Turunan'}`} className="flex-1">
                            <Input
                                name="conversion"
                                value={unitConversionFormData.conversion || ""}
                                onChange={handleConversionFormChange}
                                type="number"
                                min="1"
                                placeholder="Jumlah Satuan Turunan"
                                className="w-full"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddConversion();
                                    }
                                }}
                            />
                        </FormField>
                    </div>
                </div>
                <div className="md:w-2/3 lg:w-3/5 flex flex-col h-full">
                    <h3 className="text-lg font-medium mb-3 md:hidden">Daftar Satuan Turunan</h3>
                    <p className="text-sm text-gray-600 mb-3 md:hidden">Satuan yang sudah ditambahkan.</p>
                    <div className="border rounded-lg overflow-hidden flex-grow h-full">
                        <Table className="h-full">
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Satuan Turunan</TableHeader>
                                    <TableHeader>Konversi</TableHeader>
                                    <TableHeader>Harga Pokok</TableHeader>
                                    <TableHeader>Harga Jual</TableHeader>
                                    <TableHeader className="text-center">Aksi</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody className="h-[100px]">
                                {conversions.length === 0 ? (
                                    <TableRow className="h-full">
                                        <TableCell colSpan={5} className="text-center text-gray-500 py-4 align-middle">
                                            Belum ada data konversi
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    conversions.filter((uc, index, self) =>
                                        index === self.findIndex(u => u.unit.name === uc.unit.name) && uc.unit
                                    ).map((uc) => (
                                        <TableRow key={uc.id}>
                                            <TableCell>{uc.unit.name}</TableCell>
                                            <TableCell>1 {baseUnit} = {uc.conversion} {uc.unit.name}</TableCell>
                                            <TableCell>
                                                {(uc.basePrice || 0).toLocaleString("id-ID", {
                                                    style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 2
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                {(uc.sellPrice || 0).toLocaleString("id-ID", {
                                                    style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 2
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
                </div>
            </div>
        </FormSection>
    );
};

export default UnitConversionManager;