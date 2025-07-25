import React, { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import Button from "@/components/button";
import Input from "@/components/input";
import FormSection from "@/components/form-section";
import Dropdown from "@/components/dropdown";
import Datepicker from "@/components/datepicker";
import ItemSearchBar from "@/components/item-search";
import DescriptiveTextarea from "@/components/descriptive-textarea";
import Checkbox from "@/components/checkbox";
import FormAction from "@/components/form-action";
import { ItemManagementModal } from "@/features/item-management";
import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/card";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeader,
} from "@/components/table";
import { FaTrash } from "react-icons/fa";
import type {
  CustomDateValueType,
  PurchaseItem,
  ItemSearchBarRef,
  AddPurchasePortalProps,
} from "@/types";
import { usePurchaseForm } from "@/hooks/purchaseForm";
import { useItemSelection } from "@/hooks/itemSelection";
import { extractNumericValue, formatRupiah } from "@/lib/formatters";

const AddPurchasePortal: React.FC<AddPurchasePortalProps> = ({
  isOpen,
  onClose,
  isClosing,
  setIsClosing,
  initialInvoiceNumber,
}) => {
  const {
    formData,
    suppliers,
    purchaseItems,
    total,
    loading,
    handleChange,
    addItem,
    updateItem,
    handleUnitChange,
    updateItemVat,
    updateItemExpiry,
    updateItemBatchNo,
    removeItem,
    handleSubmit,
  } = usePurchaseForm({ initialInvoiceNumber, enabled: isOpen });

  const [isAddItemPortalOpen, setIsAddItemPortalOpen] = React.useState(false);
  const [isAddItemClosing, setIsAddItemClosing] = React.useState(false);
  const [portalRenderId, setPortalRenderId] = React.useState(0);

  const [editingVatPercentage, setEditingVatPercentage] = React.useState(false);
  const [vatPercentageValue, setVatPercentageValue] = React.useState(
    formData.vat_percentage.toString(),
  );
  const vatPercentageInputRef = useRef<HTMLInputElement>(null);
  const invoiceNumberInputRef = useRef<HTMLInputElement>(null);
  const itemSearchBarRef = useRef<ItemSearchBarRef>(null);

  const {
    searchItem,
    setSearchItem,
    selectedItem,
    setSelectedItem,
    filteredItems,
    getItemByID,
    refetchItems,
  } = useItemSelection({
    disableRealtime: false,
    enabled: isOpen,
  });

  const isAddNewItemDisabled = !(
    searchItem.trim() !== "" && filteredItems.length === 0
  );

  const onHandleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(e);
    setIsClosing(true);
    onClose();
  };

  useEffect(() => {
    if (selectedItem) {
      const itemData = getItemByID(selectedItem.id);
      if (itemData) {
        const newPurchaseItem: PurchaseItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          item_id: itemData.id,
          item_name: itemData.name,
          quantity: 1,
          price: itemData.base_price,
          discount: 0,
          subtotal: itemData.base_price,
          unit: itemData.unit?.name || itemData.base_unit || "Unit",
          vat_percentage: 0,
          batch_no: null,
          expiry_date: null,
          unit_conversion_rate: 1,
          item: {
            name: itemData.name,
            code: itemData.code || "",
          },
        };
        addItem(newPurchaseItem);
        setSelectedItem(null);
        setSearchItem("");
      }
    }
  }, [selectedItem, addItem, setSelectedItem, setSearchItem, getItemByID]);

  useEffect(() => {
    if (isOpen && invoiceNumberInputRef.current) {
      setTimeout(() => {
        invoiceNumberInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const onHandleUnitChange = (id: string, unitName: string) => {
    handleUnitChange(id, unitName, getItemByID);
  };

  const startEditingVatPercentage = () => {
    setVatPercentageValue(formData.vat_percentage.toString());
    setEditingVatPercentage(true);
    setTimeout(() => {
      if (vatPercentageInputRef.current) {
        vatPercentageInputRef.current.focus();
        vatPercentageInputRef.current.select();
      }
    }, 10);
  };

  const stopEditingVatPercentage = () => {
    setEditingVatPercentage(false);
    const vatPercentage = parseFloat(vatPercentageValue);
    if (!isNaN(vatPercentage)) {
      const fakeEvent = {
        target: {
          name: "vat_percentage",
          value: Math.min(vatPercentage, 100).toString(),
        },
      } as React.ChangeEvent<HTMLInputElement>;
      handleChange(fakeEvent);
    }
  };

  const handleVatPercentageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setVatPercentageValue(e.target.value);
  };

  const handleVatPercentageKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Escape") {
      stopEditingVatPercentage();
    }
  };

  const handleCloseAddItemPortal = () => {
    setIsAddItemClosing(true);
    setTimeout(() => {
      setIsAddItemPortalOpen(false);
      setIsAddItemClosing(false);
      refetchItems();
      setTimeout(() => {
        itemSearchBarRef.current?.focus();
      }, 100);
    }, 300);
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: { scale: 1, opacity: 1 },
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate={isClosing ? "exit" : "visible"}
          exit="exit"
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isClosing) {
              setIsClosing(true);
              onClose();
            }
          }}
        >
          <motion.div
            key="modal-content"
            variants={modalVariants}
            initial="hidden"
            animate={isClosing ? "exit" : "visible"}
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="rounded-xl bg-white shadow-xl max-w-7xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              key="modal-header"
              variants={contentVariants}
              initial="hidden"
              animate={isClosing ? "exit" : "visible"}
              exit="exit"
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              <CardHeader className="flex items-center justify-between sticky z-10 py-6! px-4! border-b-2 border-gray-200 mb-6">
                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <CardTitle>Tambah Pembelian Baru</CardTitle>
                </div>
                <div className="flex items-center space-x-1 shrink-0 ml-auto">
                  <Button
                    variant="text"
                    size="sm"
                    onClick={() => {
                      if (!isClosing) {
                        setIsClosing(true);
                        onClose();
                      }
                    }}
                    className="p-2"
                    title="Tutup"
                  >
                    <FaTimes size={18} />
                  </Button>
                </div>
              </CardHeader>
            </motion.div>

            <motion.form
              key="modal-form"
              variants={contentVariants}
              initial="hidden"
              animate={isClosing ? "exit" : "visible"}
              exit="exit"
              transition={{ duration: 0.2, delay: 0.1 }}
              onSubmit={onHandleSubmit}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="flex-1 overflow-y-auto px-6 py-1">
                <CardContent className="space-y-6">
                  <FormSection title="Informasi Pembelian">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nomor Faktur
                        </label>
                        <Input
                          ref={invoiceNumberInputRef}
                          name="invoice_number"
                          value={formData.invoice_number}
                          onChange={handleChange}
                          placeholder="Masukkan nomor faktur"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Supplier
                        </label>
                        <Dropdown
                          name="supplier_id"
                          value={formData.supplier_id}
                          onChange={(value) =>
                            handleChange({
                              target: { name: "supplier_id", value },
                            } as React.ChangeEvent<HTMLSelectElement>)
                          }
                          options={suppliers.map((supplier) => ({
                            id: supplier.id,
                            name: supplier.name,
                          }))}
                          placeholder="-- Pilih Supplier --"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tanggal Pembelian
                        </label>
                        <Datepicker
                          value={formData.date ? new Date(formData.date) : null}
                          onChange={(newDate: CustomDateValueType) => {
                            const fakeEvent = {
                              target: {
                                name: "date",
                                value: newDate
                                  ? newDate.toISOString().split("T")[0]
                                  : "",
                              },
                            } as React.ChangeEvent<HTMLInputElement>;
                            handleChange(fakeEvent);
                          }}
                          inputClassName="w-full p-2.5 border rounded-lg text-sm"
                          placeholder="Pilih tanggal pembelian"
                          portalWidth="280px"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tanggal Jatuh Tempo
                        </label>
                        <Datepicker
                          value={
                            formData.due_date
                              ? new Date(formData.due_date)
                              : null
                          }
                          onChange={(newDate: CustomDateValueType) => {
                            const fakeEvent = {
                              target: {
                                name: "due_date",
                                value: newDate
                                  ? newDate.toISOString().split("T")[0]
                                  : "",
                              },
                            } as React.ChangeEvent<HTMLInputElement>;
                            handleChange(fakeEvent);
                          }}
                          inputClassName="w-full p-2.5 border rounded-lg text-sm"
                          minDate={
                            formData.date ? new Date(formData.date) : undefined
                          }
                          placeholder="Pilih tanggal jatuh tempo"
                          portalWidth="280px"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status Pembayaran
                        </label>
                        <Dropdown
                          name="payment_status"
                          value={formData.payment_status}
                          onChange={(value) =>
                            handleChange({
                              target: { name: "payment_status", value },
                            } as React.ChangeEvent<HTMLSelectElement>)
                          }
                          options={[
                            { id: "unpaid", name: "Belum Dibayar" },
                            { id: "partial", name: "Sebagian" },
                            { id: "paid", name: "Lunas" },
                          ]}
                          placeholder="-- Pilih Status --"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Metode Pembayaran
                        </label>
                        <Dropdown
                          name="payment_method"
                          value={formData.payment_method}
                          onChange={(value) =>
                            handleChange({
                              target: { name: "payment_method", value },
                            } as React.ChangeEvent<HTMLSelectElement>)
                          }
                          options={[
                            { id: "cash", name: "Tunai" },
                            { id: "transfer", name: "Transfer" },
                            { id: "credit", name: "Kredit" },
                          ]}
                          placeholder="-- Pilih Metode --"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <DescriptiveTextarea
                        label="Catatan"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="Tambahkan catatan untuk pembelian ini..."
                        containerClassName="pt-0!"
                      />
                    </div>
                  </FormSection>

                  <FormSection title="Daftar Item">
                    <ItemSearchBar
                      ref={itemSearchBarRef}
                      searchItem={searchItem}
                      setSearchItem={setSearchItem}
                      filteredItems={filteredItems}
                      selectedItem={selectedItem}
                      setSelectedItem={setSelectedItem}
                      isAddItemButtonDisabled={isAddNewItemDisabled}
                      onOpenAddItemPortal={() => {
                        setIsAddItemPortalOpen(true);
                        setPortalRenderId((prev) => prev + 1);
                      }}
                    />
                    <Table
                      autoSize={true}
                      columns={[
                        {
                          key: "no",
                          header: "No",
                          minWidth: 40,
                          align: "center",
                        },
                        { key: "code", header: "Kode", minWidth: 80 },
                        { key: "name", header: "Nama", minWidth: 200 },
                        { key: "batch_no", header: "Batch No.", minWidth: 100 },
                        {
                          key: "expiry_date",
                          header: "EXP",
                          minWidth: 100,
                          align: "center",
                        },
                        {
                          key: "quantity",
                          header: "Jml.",
                          minWidth: 60,
                          align: "center",
                        },
                        {
                          key: "unit",
                          header: "Unit",
                          minWidth: 70,
                          align: "center",
                        },
                        {
                          key: "price",
                          header: "Harga",
                          minWidth: 100,
                          align: "right",
                        },
                        {
                          key: "discount",
                          header: "Disc",
                          minWidth: 80,
                          align: "right",
                        },
                        ...(formData.is_vat_included
                          ? []
                          : [
                              {
                                key: "vat",
                                header: "VAT",
                                minWidth: 60,
                                align: "right" as const,
                              },
                            ]),
                        {
                          key: "subtotal",
                          header: "Subtotal",
                          minWidth: 120,
                          align: "right",
                        },
                        {
                          key: "actions",
                          header: "‎",
                          minWidth: 60,
                          align: "center",
                        },
                      ]}
                      data={purchaseItems}
                    >
                      <TableHead>
                        <TableRow>
                          <TableHeader className="text-center">No</TableHeader>
                          <TableHeader>Kode</TableHeader>
                          <TableHeader>Nama</TableHeader>
                          <TableHeader>Batch No.</TableHeader>
                          <TableHeader className="text-center">EXP</TableHeader>
                          <TableHeader className="text-center">
                            Jml.
                          </TableHeader>
                          <TableHeader className="text-center">
                            Unit
                          </TableHeader>
                          <TableHeader className="text-right">
                            Harga
                          </TableHeader>
                          <TableHeader className="text-right">Disc</TableHeader>
                          {!formData.is_vat_included && (
                            <TableHeader className="text-right">
                              VAT
                            </TableHeader>
                          )}
                          <TableHeader className="text-right">
                            Subtotal
                          </TableHeader>
                          <TableHeader className="text-center">‎</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {purchaseItems.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={formData.is_vat_included ? 11 : 12}
                              className="text-center text-gray-500"
                            >
                              {"Belum ada item ditambahkan"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          purchaseItems.map((item, index) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-center">
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                {getItemByID(item.item_id)?.code || "-"}
                              </TableCell>
                              <TableCell>{item.item_name}</TableCell>
                              <TableCell>
                                <input
                                  type="text"
                                  value={item.batch_no || ""}
                                  onChange={(e) =>
                                    updateItemBatchNo(item.id, e.target.value)
                                  }
                                  className="w-20 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-hidden px-1 py-0.5 !text-left"
                                  placeholder="No. Batch"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Datepicker
                                  value={
                                    item.expiry_date
                                      ? new Date(item.expiry_date)
                                      : null
                                  }
                                  onChange={(newDate: CustomDateValueType) => {
                                    updateItemExpiry(
                                      item.id,
                                      newDate
                                        ? newDate.toISOString().split("T")[0]
                                        : "",
                                    );
                                  }}
                                  inputClassName="w-full text-center text-sm py-[3px]! px-1! bg-transparent border-0! border-b border-gray-300! focus:border-primary! focus:ring-0! rounded-none!"
                                  placeholder="Pilih ED"
                                  minDate={new Date()}
                                  portalWidth="280px"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <input
                                  type="number"
                                  onFocus={(e) => e.target.select()}
                                  onClick={(e) =>
                                    (e.target as HTMLInputElement).select()
                                  }
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const inputValue = e.target.value;
                                    if (inputValue === "") {
                                      updateItem(item.id, "quantity", 0);
                                      return;
                                    }
                                    const newValue = parseInt(inputValue, 10);
                                    if (!isNaN(newValue) && newValue >= 0) {
                                      updateItem(item.id, "quantity", newValue);
                                    }
                                  }}
                                  onBlur={() => {
                                    const numericValue = parseInt(
                                      item.quantity.toString(),
                                      10,
                                    );
                                    updateItem(
                                      item.id,
                                      "quantity",
                                      numericValue < 1 ? 1 : numericValue,
                                    );
                                  }}
                                  className="w-8 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-hidden px-1 py-0.5 !text-leeft"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <select
                                  value={item.unit}
                                  onChange={(e) =>
                                    onHandleUnitChange(item.id, e.target.value)
                                  }
                                  className="w-16 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-hidden px-1 py-0.5 !text-left appearance-none cursor-pointer"
                                >
                                  <option
                                    value={
                                      getItemByID(item.item_id)?.base_unit ||
                                      "Unit"
                                    }
                                  >
                                    {getItemByID(item.item_id)?.base_unit ||
                                      "Unit"}
                                  </option>
                                  {(() => {
                                    const conversions = getItemByID(
                                      item.item_id,
                                    )?.unit_conversions;
                                    if (!conversions) return null;

                                    const uniqueUnits = Array.from(
                                      new Map(
                                        conversions.map((uc) => [
                                          uc.to_unit_id,
                                          {
                                            id: uc.to_unit_id,
                                            unit_name: uc.unit_name,
                                          },
                                        ]),
                                      ).values(),
                                    );

                                    return uniqueUnits.map((uc) => (
                                      <option key={uc.id} value={uc.unit_name}>
                                        {uc.unit_name}
                                      </option>
                                    ));
                                  })()}
                                </select>
                              </TableCell>
                              <TableCell className="text-right">
                                <input
                                  type="text"
                                  value={
                                    item.price === 0
                                      ? ""
                                      : formatRupiah(item.price)
                                  }
                                  onChange={(e) => {
                                    const numericValue = extractNumericValue(
                                      e.target.value,
                                    );
                                    updateItem(item.id, "price", numericValue);
                                  }}
                                  className="w-20 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-hidden px-1 py-0.5 text-right"
                                  placeholder="Rp 0"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <input
                                  type="text"
                                  value={
                                    item.discount === 0
                                      ? ""
                                      : `${item.discount}%`
                                  }
                                  onChange={(e) => {
                                    let inputValue = e.target.value;
                                    if (inputValue.endsWith("%")) {
                                      inputValue = inputValue.slice(0, -1);
                                    }
                                    const numericValue =
                                      parseInt(
                                        inputValue.replace(/[^\d]/g, ""),
                                      ) || 0;
                                    updateItem(
                                      item.id,
                                      "discount",
                                      Math.min(numericValue, 100),
                                    );
                                  }}
                                  className="w-12 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-hidden px-1 py-0.5 text-right"
                                  placeholder="0%"
                                  onKeyDown={(e) => {
                                    if (
                                      e.key === "Backspace" &&
                                      item.discount > 0 &&
                                      e.currentTarget.selectionStart ===
                                        e.currentTarget.value.length
                                    ) {
                                      e.preventDefault();
                                      const newValue = Math.floor(
                                        item.discount / 10,
                                      );
                                      updateItem(item.id, "discount", newValue);
                                    }
                                  }}
                                />
                              </TableCell>
                              {!formData.is_vat_included && (
                                <TableCell className="text-right">
                                  <input
                                    type="text"
                                    value={
                                      item.vat_percentage === 0
                                        ? ""
                                        : `${item.vat_percentage}%`
                                    }
                                    onChange={(e) => {
                                      let inputValue = e.target.value;
                                      if (inputValue.endsWith("%")) {
                                        inputValue = inputValue.slice(0, -1);
                                      }
                                      const numericValue =
                                        parseInt(
                                          inputValue.replace(/[^\d]/g, ""),
                                        ) || 0;
                                      updateItemVat(
                                        item.id,
                                        Math.min(numericValue, 100),
                                      );
                                    }}
                                    className="w-12 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-hidden px-1 py-0.5 text-right"
                                    placeholder="0%"
                                    onKeyDown={(e) => {
                                      if (
                                        e.key === "Backspace" &&
                                        item.vat_percentage > 0 &&
                                        e.currentTarget.selectionStart ===
                                          e.currentTarget.value.length
                                      ) {
                                        e.preventDefault();
                                        const newValue = Math.floor(
                                          item.vat_percentage / 10,
                                        );
                                        updateItemVat(item.id, newValue);
                                      }
                                    }}
                                  />
                                </TableCell>
                              )}
                              <TableCell className="text-right">
                                {item.subtotal.toLocaleString("id-ID", {
                                  style: "currency",
                                  currency: "IDR",
                                })}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => removeItem(item.id)}
                                >
                                  <FaTrash />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    <div className="flex justify-between items-center mt-4 font-semibold">
                      <div className="flex items-center gap-6">
                        <Checkbox
                          id="is_vat_included_checkbox"
                          label="PPN Termasuk Harga"
                          checked={formData.is_vat_included}
                          onChange={(isChecked) => {
                            const event = {
                              target: {
                                name: "is_vat_included",
                                type: "checkbox",
                                checked: isChecked,
                                value: String(isChecked),
                              },
                            } as unknown as React.ChangeEvent<HTMLInputElement>;
                            handleChange(event);
                          }}
                          className="text-sm"
                        />
                        <div className="flex items-center">
                          <label className="mr-2">PPN:</label>
                          <div className="flex items-center">
                            {editingVatPercentage ? (
                              <div className="flex items-center">
                                <input
                                  ref={vatPercentageInputRef}
                                  type="number"
                                  value={vatPercentageValue}
                                  onChange={handleVatPercentageChange}
                                  onBlur={stopEditingVatPercentage}
                                  onKeyDown={handleVatPercentageKeyDown}
                                  className="w-16 p-1 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent "
                                  min="0"
                                  max="100"
                                />
                                <span className="ml-1">%</span>
                              </div>
                            ) : (
                              <span
                                className="w-10 p-1 rounded-md cursor-pointer flex items-center justify-end hover:bg-gray-100 transition-colors text-orange-500"
                                onClick={startEditingVatPercentage}
                                title="Klik untuk mengubah persentase PPN"
                              >
                                {formData.vat_percentage}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-lg">
                        <div className="mr-4">Total:</div>
                        <div className="w-40 text-right">
                          {total.toLocaleString("id-ID", {
                            style: "currency",
                            currency: "IDR",
                          })}
                        </div>
                      </div>
                    </div>
                  </FormSection>
                </CardContent>
              </div>

              <CardFooter className="sticky bottom-0 z-10 py-6! px-6!">
                <FormAction
                  onCancel={() => {
                    setIsClosing(true);
                    onClose();
                  }}
                  isSaving={loading}
                  isDisabled={purchaseItems.length === 0}
                />
              </CardFooter>
            </motion.form>
          </motion.div>
        </motion.div>
      )}

      <ItemManagementModal
        key={`${searchItem ?? ""}-${portalRenderId}`}
        isOpen={isAddItemPortalOpen}
        onClose={handleCloseAddItemPortal}
        initialSearchQuery={searchItem}
        isClosing={isAddItemClosing}
        setIsClosing={setIsAddItemClosing}
        refetchItems={refetchItems}
      />
    </AnimatePresence>,
    document.body,
  );
};

export default AddPurchasePortal;
