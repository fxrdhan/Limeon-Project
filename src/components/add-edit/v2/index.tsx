import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaHistory,
  FaPen,
  FaUndoAlt,
  FaQuestionCircle,
  FaTimes,
} from "react-icons/fa";
import Input from "@/components/input";
import Button from "@/components/button";
import Dropdown from "@/components/dropdown";
import FormSection from "@/components/form-section";
import FormField from "@/components/form-field";
import FormAction from "@/components/form-action";
import DescriptiveTextarea from "@/components/descriptive-textarea";
import Checkbox from "@/components/checkbox";
import AddEditModal from "@/components/add-edit/v1";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/card";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeader,
} from "@/components/table";
import { useAddItemPageHandlers } from "@/handlers/addItem";
import { FaTrash } from "react-icons/fa";
import type { AddItemPortalProps } from "@/types";

const AddItemPortal: React.FC<AddItemPortalProps> = ({
  isOpen,
  onClose,
  itemId,
  initialSearchQuery,
}) => {
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const fefoIconRef = useRef<HTMLDivElement>(null);
  const expiryCheckboxRef = useRef<HTMLLabelElement>(null);
  const {
    formData,
    displayBasePrice,
    displaySellPrice,
    categories,
    types,
    units,
    saving,
    loading,
    isEditMode,
    handleChange,
    handleSubmit,
    updateFormData,
    unitConversionHook,
    isAddEditModalOpen,
    setIsAddEditModalOpen,
    isAddTypeModalOpen,
    setIsAddTypeModalOpen,
    isAddUnitModalOpen,
    setIsAddUnitModalOpen,
    handleSaveCategory,
    handleSaveType,
    handleSaveUnit,
    editingMargin,
    marginPercentage,
    editingMinStock,
    minStockValue,
    handleDeleteItem,
    calculateProfitPercentage,
    handleCancel,
    formattedUpdateAt,
    addCategoryMutation,
    addUnitMutation,
    addTypeMutation,
    marginInputRef,
    setMarginPercentage,
    minStockInputRef,
    showFefoTooltip,
    setShowFefoTooltip,
    handleDropdownChange,
    handleMarginChange,
    handleSellPriceChange,
    startEditingMargin,
    stopEditingMargin,
    handleMarginKeyDown,
    startEditingMinStock,
    stopEditingMinStock,
    handleMinStockChange,
    handleMinStockKeyDown,
    deleteItemMutation,
    resetForm,
    currentSearchTermForModal,
    handleAddNewCategory,
    handleAddNewType,
    handleAddNewUnit,
    closeModalAndClearSearch,
    isDirty,
  } = useAddItemPageHandlers({
    itemId,
    initialSearchQuery,
    onClose,
    expiryCheckboxRef,
  });

  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleFefoTooltipMouseEnter = () => {
    if (fefoIconRef.current) {
      const rect = fefoIconRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2,
      });
    }
    setShowFefoTooltip(true);
  };

  const handleFefoTooltipMouseLeave = () => {
    setShowFefoTooltip(false);
    setTooltipPosition(null);
  };

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const focusInput = () => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      };

      const timer = setTimeout(focusInput, 150);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setIsMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isEditMode, formData.name, loading]);

  if (loading && !isEditMode) {
    if (isEditMode && !formData.name) {
      return (
        <Card>
          <CardContent className="flex justify-center items-center h-40">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            <span className="ml-3">Memuat data item...</span>
          </CardContent>
        </Card>
      );
    }
  }

  if (!isMounted) return null;

  const formIsInvalid =
    !formData.name.trim() ||
    !formData.category_id ||
    !formData.type_id ||
    !formData.unit_id ||
    formData.base_price <= 0 ||
    formData.sell_price < 0;

  const operationsPending =
    addTypeMutation.isPending ||
    addUnitMutation.isPending ||
    addCategoryMutation.isPending ||
    deleteItemMutation.isPending;

  const disableCondition = formIsInvalid || operationsPending;
  const finalDisabledState = isEditMode
    ? disableCondition || !isDirty()
    : disableCondition;

  const handleReset = () => {
    resetForm();
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  const backdropVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
    },
  };

  const modalVariants = {
    hidden: {
      scale: 0.95,
      opacity: 0,
    },
    visible: {
      scale: 1,
      opacity: 1,
    },
    exit: {
      scale: 0.9,
      opacity: 0,
    },
  };

  const contentVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
    },
  };

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white rounded-lg shadow-xl w-[90vw] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div variants={contentVariants}>
              <CardHeader className="flex items-center justify-between sticky top-0 bg-white z-10 py-6! px-4! border-b! rounded-t-lg">
                <div className="flex items-center"></div>

                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <CardTitle>
                    {isEditMode ? "Edit Data Item" : "Tambah Data Item Baru"}
                  </CardTitle>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  {isEditMode && formattedUpdateAt !== "-" && (
                    <span className="text-sm text-gray-500 italic whitespace-nowrap flex items-center">
                      <FaHistory className="mr-1" size={12} />
                      {formattedUpdateAt}
                    </span>
                  )}
                  {!isEditMode && (
                    <Button
                      variant="text"
                      size="md"
                      onClick={handleReset}
                      className="text-gray-600 hover:text-orange-600 flex items-center"
                      title="Reset Form"
                    >
                      <FaUndoAlt className="mr-1.5" size={12} /> Reset All
                    </Button>
                  )}
                  <Button
                    variant="text"
                    size="sm"
                    onClick={onClose}
                    className="text-gray-500 p-2 rounded-full hover:bg-gray-100"
                    title="Tutup"
                  >
                    <FaTimes size={18} />
                  </Button>
                </div>
              </CardHeader>
            </motion.div>

            <motion.form
              variants={contentVariants}
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 mx-4">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-4/5">
                      <FormSection title="Data Umum">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                          <FormField
                            label="Kode Item"
                            className="md:col-span-1"
                          >
                            <Input
                              name="code"
                              value={formData.code}
                              readOnly={true}
                              className="w-full"
                            />
                          </FormField>

                          <FormField
                            label="Nama Item"
                            className="md:col-span-2"
                          >
                            <Input
                              name="name"
                              ref={nameInputRef}
                              value={formData.name}
                              tabIndex={1}
                              onChange={handleChange}
                              className="w-full"
                              required
                            />
                          </FormField>

                          <FormField label="Barcode" className="md:col-span-1">
                            <Input
                              name="barcode"
                              value={formData.barcode}
                              tabIndex={2}
                              onChange={handleChange}
                              className="w-full"
                              placeholder="Masukkan barcode item"
                            />
                          </FormField>

                          <FormField
                            label="Jenis Produk"
                            className="md:col-span-1"
                          >
                            <Dropdown
                              name="is_medicine"
                              tabIndex={3}
                              value={formData.is_medicine ? "obat" : "non-obat"}
                              onChange={(value) => {
                                if (value === "obat") {
                                  updateFormData({ is_medicine: true });
                                } else {
                                  updateFormData({
                                    is_medicine: false,
                                    has_expiry_date: false,
                                  });
                                }
                              }}
                              options={[
                                { id: "obat", name: "Obat" },
                                { id: "non-obat", name: "Non-Obat" },
                              ]}
                              withRadio
                              searchList={false}
                            />
                          </FormField>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <FormField label="Kategori">
                            {loading && categories.length === 0 ? (
                              <Input
                                value="Memuat kategori..."
                                readOnly
                                disabled
                              />
                            ) : (
                              <Dropdown
                                name="category_id"
                                tabIndex={4}
                                value={formData.category_id}
                                onChange={(value) =>
                                  handleDropdownChange("category_id", value)
                                }
                                options={categories}
                                placeholder="-- Pilih Kategori --"
                                required
                                onAddNew={handleAddNewCategory}
                              />
                            )}
                          </FormField>

                          <FormField label="Jenis">
                            {loading && types.length === 0 ? (
                              <Input
                                value="Memuat jenis..."
                                readOnly
                                disabled
                              />
                            ) : (
                              <Dropdown
                                name="type_id"
                                tabIndex={5}
                                value={formData.type_id}
                                onChange={(value) =>
                                  handleDropdownChange("type_id", value)
                                }
                                options={types}
                                placeholder="-- Pilih Jenis --"
                                required
                                onAddNew={handleAddNewType}
                              />
                            )}
                          </FormField>

                          <FormField label="Satuan">
                            {loading && units.length === 0 ? (
                              <Input
                                value="Memuat satuan..."
                                readOnly
                                disabled
                              />
                            ) : (
                              <Dropdown
                                name="unit_id"
                                tabIndex={6}
                                value={formData.unit_id}
                                onChange={(value) =>
                                  handleDropdownChange("unit_id", value)
                                }
                                options={units}
                                placeholder="-- Pilih Satuan --"
                                required
                                onAddNew={handleAddNewUnit}
                              />
                            )}
                          </FormField>

                          <FormField label="Rak">
                            <Input
                              name="rack"
                              tabIndex={7}
                              value={formData.rack}
                              onChange={handleChange}
                              className="w-full"
                            />
                          </FormField>
                        </div>

                        <div>
                          <DescriptiveTextarea
                            label="Keterangan"
                            tabIndex={8}
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Masukkan keterangan atau deskripsi tambahan untuk item ini..."
                          />
                        </div>
                      </FormSection>
                    </div>

                    <div className="w-full md:w-1/4">
                      <FormSection title="Pengaturan Tambahan">
                        <div className="grid grid-cols-1 gap-6">
                          <FormField label="Status">
                            <Dropdown
                              name="is_active"
                              tabIndex={9}
                              value={formData.is_active ? "true" : "false"}
                              onChange={(value) => {
                                updateFormData({ is_active: value === "true" });
                              }}
                              options={[
                                { id: "true", name: "Masih dijual" },
                                { id: "false", name: "Tidak Dijual" },
                              ]}
                              withRadio
                              searchList={false}
                            />
                          </FormField>

                          <FormField
                            label="Stok Minimal:"
                            className="flex items-center"
                          >
                            <div className="ml-2 grow flex items-center">
                              {editingMinStock ? (
                                <Input
                                  className="max-w-20"
                                  ref={minStockInputRef}
                                  type="number"
                                  value={minStockValue}
                                  onChange={handleMinStockChange}
                                  onBlur={stopEditingMinStock}
                                  onKeyDown={handleMinStockKeyDown}
                                  min="0"
                                />
                              ) : (
                                <div
                                  tabIndex={10}
                                  className="group w-full pb-1 cursor-pointer flex items-center focus:outline-hidden"
                                  onClick={startEditingMinStock}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      startEditingMinStock();
                                    }
                                  }}
                                  title="Klik untuk mengubah stok minimal"
                                >
                                  <span>{formData.min_stock}</span>
                                  <FaPen
                                    className="ml-2 text-gray-400 hover:text-primary group-focus:text-primary cursor-pointer transition-colors"
                                    size={14}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingMinStock();
                                    }}
                                    title="Edit stok minimal"
                                  />
                                </div>
                              )}
                            </div>
                          </FormField>

                          <div
                            className={
                              formData.is_medicine
                                ? ""
                                : "opacity-50 pointer-events-none"
                            }
                          >
                            <Checkbox
                              id="has_expiry_date"
                              tabIndex={11}
                              ref={expiryCheckboxRef}
                              label="Memiliki Tanggal Kadaluarsa"
                              checked={formData.has_expiry_date}
                              disabled={!formData.is_medicine}
                              onChange={(isChecked) =>
                                updateFormData({ has_expiry_date: isChecked })
                              }
                              className="py-1"
                            />
                            <div className="mt-1 text-sm text-gray-500 flex items-center">
                              Akan digunakan metode FEFO
                              <div
                                className="relative ml-1 inline-block"
                                onMouseEnter={handleFefoTooltipMouseEnter}
                                onMouseLeave={handleFefoTooltipMouseLeave}
                                ref={fefoIconRef}
                              >
                                <FaQuestionCircle
                                  className="text-gray-400 cursor-help"
                                  size={14}
                                />
                              </div>
                              {showFefoTooltip &&
                                tooltipPosition &&
                                createPortal(
                                  <div
                                    style={{
                                      position: "fixed",
                                      top: `${tooltipPosition.top}px`,
                                      left: `${tooltipPosition.left}px`,
                                      transform: "translate(-50%, -100%)",
                                      zIndex: 1000,
                                    }}
                                    className="w-max max-w-xs p-2 bg-zinc-500 text-white text-xs rounded-md shadow-lg"
                                    onMouseEnter={() =>
                                      setShowFefoTooltip(true)
                                    }
                                    onMouseLeave={handleFefoTooltipMouseLeave}
                                  >
                                    First Expired First Out: Barang dengan
                                    tanggal kadaluarsa terdekat akan dikeluarkan
                                    lebih dulu saat penjualan.
                                  </div>,
                                  document.body,
                                )}
                            </div>
                          </div>
                        </div>
                      </FormSection>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/4">
                      <FormSection title="Harga Pokok & Jual">
                        <div className="flex flex-col space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField label="Satuan Dasar">
                              <Input
                                type="text"
                                value={unitConversionHook.baseUnit}
                                readOnly={true}
                                className="w-full"
                              />
                            </FormField>

                            <FormField label="Harga Pokok">
                              <Input
                                type="text"
                                name="base_price"
                                tabIndex={12}
                                value={displayBasePrice}
                                placeholder="Rp 0"
                                onChange={(e) => {
                                  handleChange(e);
                                  setTimeout(() => {
                                    const profit =
                                      formData.base_price > 0
                                        ? calculateProfitPercentage()
                                        : null;
                                    if (profit !== null) {
                                      setMarginPercentage(profit.toFixed(1));
                                    }
                                  }, 0);
                                }}
                                min="0"
                                className="w-full"
                                required
                              />
                            </FormField>
                          </div>

                          <div className="grid grid-cols-2 gap-6 focus:outline-hidden">
                            <FormField label="Margin">
                              <div className="flex items-center focus:outline-hidden">
                                {editingMargin ? (
                                  <div className="flex items-center focus:outline-hidden">
                                    <Input
                                      className="max-w-20 focus:outline-hidden"
                                      ref={marginInputRef}
                                      type="number"
                                      value={marginPercentage}
                                      onChange={handleMarginChange}
                                      onBlur={stopEditingMargin}
                                      onKeyDown={handleMarginKeyDown}
                                      step="0.1"
                                    />
                                    <span className="ml-2 text-lg font-medium">
                                      %
                                    </span>
                                  </div>
                                ) : (
                                  <div
                                    tabIndex={13}
                                    className={`group w-full py-2 cursor-pointer font-semibold flex items-center ${
                                      calculateProfitPercentage() !== null
                                        ? calculateProfitPercentage()! >= 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                        : "text-gray-500"
                                    } focus:outline-hidden`}
                                    onClick={startEditingMargin}
                                    title="Klik untuk mengubah margin"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        startEditingMargin();
                                      }
                                    }}
                                  >
                                    {calculateProfitPercentage() !== null
                                      ? `${calculateProfitPercentage()!.toFixed(
                                          1,
                                        )} %`
                                      : "-"}
                                    <FaPen
                                      className="ml-4 text-gray-400 hover:text-primary group-focus:text-primary cursor-pointer transition-colors"
                                      size={14}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditingMargin();
                                      }}
                                      title="Edit margin"
                                    />
                                  </div>
                                )}
                              </div>
                            </FormField>

                            <FormField label="Harga Jual">
                              <Input
                                type="text"
                                name="sell_price"
                                tabIndex={14}
                                value={displaySellPrice}
                                placeholder="Rp 0"
                                onChange={handleSellPriceChange}
                                min="0"
                                className="w-full"
                                required
                              />
                            </FormField>
                          </div>
                        </div>
                      </FormSection>
                    </div>

                    <div className="w-full md:w-3/4">
                      <FormSection title="Satuan dan Konversi">
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1 md:w-1/3 lg:w-1/4">
                            <h3 className="text-lg font-medium mb-3">
                              Tambah Konversi Satuan
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              1 {unitConversionHook.baseUnit || "Satuan Dasar"}{" "}
                              setara berapa satuan turunan?
                            </p>
                            <div className="flex flex-row gap-4 mb-4">
                              <FormField
                                label="Satuan Turunan"
                                className="flex-1"
                              >
                                <Dropdown
                                  name="unit"
                                  tabIndex={15}
                                  value={
                                    unitConversionHook.availableUnits.find(
                                      (u) =>
                                        u.name ===
                                        unitConversionHook
                                          .unitConversionFormData.unit,
                                    )?.id || ""
                                  }
                                  onChange={(unitId) => {
                                    const selectedUnit =
                                      unitConversionHook.availableUnits.find(
                                        (u) => u.id === unitId,
                                      );
                                    if (selectedUnit) {
                                      unitConversionHook.setUnitConversionFormData(
                                        {
                                          ...unitConversionHook.unitConversionFormData,
                                          unit: selectedUnit.name,
                                        },
                                      );
                                    }
                                  }}
                                  options={unitConversionHook.availableUnits
                                    .filter(
                                      (unit) =>
                                        unit.name !==
                                        unitConversionHook.baseUnit,
                                    )
                                    .filter(
                                      (unit) =>
                                        !unitConversionHook.conversions.some(
                                          (uc) => uc.unit.name === unit.name,
                                        ),
                                    )
                                    .map((unit) => ({
                                      id: unit.id,
                                      name: unit.name,
                                    }))}
                                  placeholder="-- Pilih Satuan --"
                                />
                              </FormField>
                              <FormField
                                label={
                                  unitConversionHook.unitConversionFormData.unit
                                    ? `1 ${
                                        unitConversionHook.baseUnit ||
                                        "Satuan Dasar"
                                      } = ? ${
                                        unitConversionHook
                                          .unitConversionFormData.unit
                                      }`
                                    : "Nilai Konversi"
                                }
                                className="flex-1"
                              >
                                <div className="relative w-full">
                                  <Input
                                    name="conversion"
                                    tabIndex={16}
                                    value={
                                      unitConversionHook.unitConversionFormData
                                        .conversion || ""
                                    }
                                    onChange={(e) => {
                                      const { name, value } = e.target;
                                      unitConversionHook.setUnitConversionFormData(
                                        {
                                          ...unitConversionHook.unitConversionFormData,
                                          [name]:
                                            name === "conversion"
                                              ? parseFloat(value) || 0
                                              : value,
                                        },
                                      );
                                    }}
                                    type="number"
                                    min="1"
                                    className="w-full pr-10"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (
                                          !unitConversionHook
                                            .unitConversionFormData.unit ||
                                          unitConversionHook
                                            .unitConversionFormData
                                            .conversion <= 0
                                        ) {
                                          alert(
                                            "Satuan dan konversi harus diisi dengan benar!",
                                          );
                                          return;
                                        }
                                        const existingUnit =
                                          unitConversionHook.conversions.find(
                                            (uc) =>
                                              uc.unit.name ===
                                              unitConversionHook
                                                .unitConversionFormData.unit,
                                          );
                                        if (existingUnit) {
                                          alert(
                                            "Satuan tersebut sudah ada dalam daftar!",
                                          );
                                          return;
                                        }
                                        const selectedUnit =
                                          unitConversionHook.availableUnits.find(
                                            (u) =>
                                              u.name ===
                                              unitConversionHook
                                                .unitConversionFormData.unit,
                                          );
                                        if (!selectedUnit) {
                                          alert("Satuan tidak valid!");
                                          return;
                                        }
                                        unitConversionHook.addUnitConversion({
                                          unit: selectedUnit,
                                          unit_name: selectedUnit.name,
                                          to_unit_id: selectedUnit.id,
                                          conversion:
                                            unitConversionHook
                                              .unitConversionFormData
                                              .conversion,
                                          basePrice: 0,
                                          sellPrice: 0,
                                          conversion_rate:
                                            unitConversionHook
                                              .unitConversionFormData
                                              .conversion,
                                        });
                                        unitConversionHook.setUnitConversionFormData(
                                          {
                                            unit: "",
                                            conversion: 0,
                                          },
                                        );
                                      }
                                    }}
                                  />
                                  <div
                                    className={`absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer font-bold tracking-widest transition-colors duration-300 focus:outline-hidden ${
                                      unitConversionHook.unitConversionFormData
                                        .unit &&
                                      unitConversionHook.unitConversionFormData
                                        .conversion > 0 &&
                                      unitConversionHook.baseUnit
                                        ? "text-primary"
                                        : "text-gray-300"
                                    }`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (
                                        !unitConversionHook
                                          .unitConversionFormData.unit ||
                                        unitConversionHook
                                          .unitConversionFormData.conversion <=
                                          0
                                      ) {
                                        alert(
                                          "Satuan dan konversi harus diisi dengan benar!",
                                        );
                                        return;
                                      }
                                      const existingUnit =
                                        unitConversionHook.conversions.find(
                                          (uc) =>
                                            uc.unit.name ===
                                            unitConversionHook
                                              .unitConversionFormData.unit,
                                        );
                                      if (existingUnit) {
                                        alert(
                                          "Satuan tersebut sudah ada dalam daftar!",
                                        );
                                        return;
                                      }
                                      const selectedUnit =
                                        unitConversionHook.availableUnits.find(
                                          (u) =>
                                            u.name ===
                                            unitConversionHook
                                              .unitConversionFormData.unit,
                                        );
                                      if (!selectedUnit) {
                                        alert("Satuan tidak valid!");
                                        return;
                                      }
                                      unitConversionHook.addUnitConversion({
                                        unit: selectedUnit,
                                        unit_name: selectedUnit.name,
                                        to_unit_id: selectedUnit.id,
                                        conversion:
                                          unitConversionHook
                                            .unitConversionFormData.conversion,
                                        basePrice: 0,
                                        sellPrice: 0,
                                        conversion_rate:
                                          unitConversionHook
                                            .unitConversionFormData.conversion,
                                      });
                                      unitConversionHook.setUnitConversionFormData(
                                        {
                                          unit: "",
                                          conversion: 0,
                                        },
                                      );
                                    }}
                                    title="Tekan Enter atau klik untuk menambah"
                                  >
                                    ENTER
                                  </div>
                                </div>
                              </FormField>
                            </div>
                          </div>
                          <div className="md:w-2/3 lg:w-3/5 flex flex-col h-full">
                            <div className="border rounded-lg overflow-hidden grow h-full">
                              <Table className="w-full h-full">
                                <TableHead>
                                  <TableRow>
                                    <TableHeader className="w-[20%]">
                                      Turunan
                                    </TableHeader>
                                    <TableHeader className="w-[30%] text-left">
                                      Konversi
                                    </TableHeader>
                                    <TableHeader className="w-[20%] text-right">
                                      Harga Pokok
                                    </TableHeader>
                                    <TableHeader className="w-[20%] text-right">
                                      Harga Jual
                                    </TableHeader>
                                    <TableHeader className="w-[10%] text-center">
                                      Aksi
                                    </TableHeader>
                                  </TableRow>
                                </TableHead>
                                <TableBody className="h-[100px]">
                                  {unitConversionHook.conversions.length ===
                                  0 ? (
                                    <TableRow className="h-full">
                                      <TableCell
                                        colSpan={5}
                                        className="text-center text-gray-500 py-4 align-middle"
                                      >
                                        Belum ada data konversi
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    unitConversionHook.conversions
                                      .filter(
                                        (uc, index, self) =>
                                          index ===
                                            self.findIndex(
                                              (u) =>
                                                u.unit.name === uc.unit.name,
                                            ) && uc.unit,
                                      )
                                      .map((uc) => (
                                        <TableRow key={uc.id}>
                                          <TableCell>{uc.unit.name}</TableCell>
                                          <TableCell>
                                            1 {unitConversionHook.baseUnit} ={" "}
                                            {uc.conversion} {uc.unit.name}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {(uc.basePrice || 0).toLocaleString(
                                              "id-ID",
                                              {
                                                style: "currency",
                                                currency: "IDR",
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 2,
                                              },
                                            )}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {(uc.sellPrice || 0).toLocaleString(
                                              "id-ID",
                                              {
                                                style: "currency",
                                                currency: "IDR",
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 2,
                                              },
                                            )}
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <Button
                                              variant="danger"
                                              size="sm"
                                              tabIndex={18}
                                              onClick={() =>
                                                unitConversionHook.removeUnitConversion(
                                                  uc.id,
                                                )
                                              }
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
                    </div>
                  </div>
                </div>
              </div>

              <CardFooter className="sticky bottom-0 bg-white z-10 py-3! px-4! border-t! rounded-b-lg">
                <FormAction
                  onCancel={handleCancel}
                  onDelete={isEditMode ? handleDeleteItem : undefined}
                  isSaving={saving}
                  isDeleting={deleteItemMutation?.isPending}
                  isEditMode={isEditMode}
                  cancelTabIndex={19}
                  saveTabIndex={20}
                  isDisabled={finalDisabledState}
                  saveText="Simpan"
                  updateText="Update"
                  deleteText={"Hapus"}
                />
              </CardFooter>
            </motion.form>
            <AddEditModal
              entityName="Kategori"
              isOpen={isAddEditModalOpen}
              onClose={() => closeModalAndClearSearch(setIsAddEditModalOpen)}
              onSubmit={handleSaveCategory}
              isLoading={addCategoryMutation.isPending}
              initialNameFromSearch={currentSearchTermForModal}
            />

            <AddEditModal
              isOpen={isAddTypeModalOpen}
              onClose={() => closeModalAndClearSearch(setIsAddTypeModalOpen)}
              onSubmit={handleSaveType}
              isLoading={addTypeMutation.isPending}
              entityName="Jenis Item"
              initialNameFromSearch={currentSearchTermForModal}
            />

            <AddEditModal
              isOpen={isAddUnitModalOpen}
              onClose={() => closeModalAndClearSearch(setIsAddUnitModalOpen)}
              onSubmit={handleSaveUnit}
              isLoading={addUnitMutation.isPending}
              entityName="Satuan"
              initialNameFromSearch={currentSearchTermForModal}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default AddItemPortal;
