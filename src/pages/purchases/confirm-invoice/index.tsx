import { useState, useEffect } from "react";
import {
    Button,
    Loading,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableHeader,
} from "@/components/modules";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaClock, FaRedo } from "react-icons/fa";
import {
    saveInvoiceToDatabase,
    regenerateInvoiceData,
} from "@/services/invoiceService";
import type { ExtractedInvoiceData } from "@/types";

const ConfirmInvoicePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [invoiceData, setInvoiceData] = useState<ExtractedInvoiceData | null>(
        null
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processingTime, setProcessingTime] = useState<string | null>(null);
    const [imageIdentifier, setImageIdentifier] = useState<string | null>(null);

    useEffect(() => {
        if (location.state?.extractedData) {
            setInvoiceData(JSON.parse(JSON.stringify(location.state.extractedData)));
            if (location.state.processingTime) {
                setProcessingTime(location.state.processingTime);
            }
            if (location.state.imageIdentifier) {
                setImageIdentifier(location.state.imageIdentifier);
            }
        } else {
            console.warn(
                "Tidak ada data faktur yang diterima. Kembali ke halaman upload."
            );
            navigate("/purchases/upload-invoice");
        }
    }, [location.state, navigate]);

    const formatCurrency = (
        value: number | string | undefined | null,
        prefix = ""
    ) => {
        if (value === null || value === undefined) return "-";
        const numValue = typeof value === "string" ? parseFloat(value) : value;
        if (isNaN(numValue)) return "-";

        const formatter = new Intl.NumberFormat("id-ID", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
        return `${prefix}${formatter.format(numValue)}`;
    };

    const handleRegenerate = async () => {
        if (!imageIdentifier) {
            setError(
                "Tidak dapat memproses ulang: Identifier gambar tidak ditemukan."
            );
            return;
        }
        setIsRegenerating(true);
        setError(null);
        try {
            const startTime = Date.now();
            const regeneratedData = await regenerateInvoiceData(imageIdentifier);
            const newProcessingTime = (Date.now() - startTime) / 1000;
            setInvoiceData(regeneratedData);
            setProcessingTime(newProcessingTime.toFixed(1));
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : "Gagal memproses ulang data faktur"
            );
            console.error("Error regenerating invoice:", err);
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleConfirm = async () => {
        if (!invoiceData || !imageIdentifier) return;
        try {
            setIsSaving(true);
            setError(null);
            await saveInvoiceToDatabase(invoiceData, imageIdentifier);
            alert("Faktur berhasil disimpan!");
            navigate("/purchases");
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : "Gagal menyimpan data faktur"
            );
            console.error("Error saving invoice:", err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!invoiceData) {
        return <Loading message="Memuat data konfirmasi..." />;
    }

    const renderField = (
        label: string,
        value: string | number | undefined | null
    ) => {
        const displayValue = value ?? "-";
        return (
            <div className="mb-2">
                <span className="font-medium text-gray-600">{label}:</span>{" "}
                <span className="text-gray-800">{displayValue}</span>
            </div>
        );
    };

    const renderProductField = (
        value: string | number | undefined | null | boolean,
        isDiscount = false
    ) => {
        const displayValue = value ?? "-";
        return isDiscount && displayValue !== "-"
            ? `${displayValue}%`
            : displayValue.toLocaleString();
    };

    const renderCurrencyField = (
        label: string,
        value: number | string | undefined | null
    ) => {
        return (
            <div className="mb-2">
                <span className="font-medium text-gray-600">{label}:</span>{" "}
                <span className="text-gray-800">Rp {formatCurrency(value)}</span>
            </div>
        );
    };

    const SectionTitle = ({
        number,
        title,
    }: {
        number: string;
        title: string;
    }) => (
        <h4 className="font-medium text-gray-700 mb-2 flex items-center">
            <span className="inline-block w-6 h-6 text-xs flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2">
                {number}
            </span>
            {title}
        </h4>
    );

    return (
        <Card className="shadow-lg max-w-7xl mx-auto">
            <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold">
                        Konfirmasi Data Faktur
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                        <div className="h-[2px] w-12 bg-gray-300"></div>
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    </div>
                </div>
                <p className="text-muted-foreground text-sm mt-1">
                    Silakan periksa data yang terekstrak dari faktur Anda.
                </p>
            </CardHeader>
            <CardContent className="pt-6">
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
                        <svg
                            className="h-5 w-5 mr-2 text-red-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                            />
                        </svg>
                        {error}
                    </div>
                )}
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Data yang Diekstraksi:</h3>
                            {processingTime && (
                                <div className="inline-flex items-center px-2.5 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                    <FaClock className="mr-1.5" />
                                    Data selesai diekstraksi dalam {processingTime}s
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <SectionTitle number="1" title="Informasi Perusahaan" />
                                <div className="border rounded-md p-4 hover:shadow-md transition-shadow">
                                    <div className="space-y-1 text-sm">
                                        {renderField("Nama", invoiceData.company_details?.name)}
                                        {renderField(
                                            "Alamat",
                                            invoiceData.company_details?.address
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <SectionTitle number="2" title="Informasi Faktur" />
                                <div className="border rounded-md p-4 hover:shadow-md transition-shadow">
                                    <div className="space-y-1 text-sm">
                                        {renderField(
                                            "No. Faktur",
                                            invoiceData.invoice_information?.invoice_number
                                        )}
                                        {renderField(
                                            "Tanggal",
                                            invoiceData.invoice_information?.invoice_date
                                        )}
                                        {renderField(
                                            "Jatuh Tempo",
                                            invoiceData.invoice_information?.due_date
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mb-6">
                            <SectionTitle number="3" title="Informasi Pelanggan" />
                            <div className="border rounded-md p-4 hover:shadow-md transition-shadow">
                                <div className="space-y-1 text-sm">
                                    {renderField(
                                        "Nama",
                                        invoiceData.customer_information?.customer_name
                                    )}
                                    {renderField(
                                        "Alamat",
                                        invoiceData.customer_information?.customer_address
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mb-6">
                            <SectionTitle number="4" title="Daftar Produk" />
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableHeader className="text-xs w-[12%]">SKU</TableHeader>
                                        <TableHeader className="text-xs w-[30%]">
                                            Nama Produk
                                        </TableHeader>
                                        <TableHeader className="text-xs text-center w-9%]">
                                            Qty
                                        </TableHeader>
                                        <TableHeader className="text-xs text-center w-[8%]">
                                            Satuan
                                        </TableHeader>
                                        <TableHeader className="text-xs text-center w-[10%]">
                                            No. Batch
                                        </TableHeader>
                                        <TableHeader className="text-xs text-center w-[10%]">
                                            Exp
                                        </TableHeader>
                                        <TableHeader className="text-xs text-right w-[8%]">
                                            Harga
                                        </TableHeader>
                                        <TableHeader className="text-xs text-right w-[7%]">
                                            Disk
                                        </TableHeader>
                                        <TableHeader className="text-xs text-right w-[10%]">
                                            Total
                                        </TableHeader>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(invoiceData.product_list ?? []).map(
                                        (product, index: number) => (
                                            <TableRow
                                                key={
                                                    product.sku
                                                        ? `product-${product.sku}-${index}`
                                                        : `product-unknown-${index}`
                                                }
                                            >
                                                <TableCell className="text-sm w-[10%]">
                                                    {renderProductField(product.sku)}
                                                </TableCell>
                                                <TableCell className="text-sm w-[30%] font-medium">
                                                    {renderProductField(product.product_name)}
                                                </TableCell>
                                                <TableCell align="center" className="text-sm w-[7%]">
                                                    {renderProductField(product.quantity)}
                                                </TableCell>
                                                <TableCell align="center" className="text-sm w-[8%]">
                                                    {renderProductField(product.unit)}
                                                </TableCell>
                                                <TableCell align="center" className="text-sm w-[10%]">
                                                    {renderProductField(product.batch_number)}
                                                </TableCell>
                                                <TableCell align="center" className="text-sm w-[10%]">
                                                    {renderProductField(product.expiry_date)}
                                                </TableCell>
                                                <TableCell className="text-sm text-right w-[8%]">
                                                    {renderProductField(product.unit_price)}
                                                </TableCell>
                                                <TableCell className="text-sm text-right w-[7%]">
                                                    {renderProductField(product.discount, true)}
                                                </TableCell>
                                                <TableCell className="text-sm text-right w-[10%]">
                                                    {renderProductField(product.total_price)}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <SectionTitle number="5" title="Informasi Tambahan" />
                                <div className="border rounded-md p-4 hover:shadow-md transition-shadow">
                                    <div className="space-y-1 text-sm">
                                        {renderField(
                                            "Diperiksa oleh",
                                            invoiceData.additional_information?.checked_by
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <SectionTitle number="6" title="Ringkasan Pembayaran" />
                                <div className="border rounded-md p-4 hover:shadow-md transition-shadow">
                                    <div className="space-y-1 text-sm">
                                        {renderCurrencyField(
                                            "Total Harga",
                                            invoiceData.payment_summary?.total_price
                                        )}
                                        {renderCurrencyField(
                                            "PPN",
                                            invoiceData.payment_summary?.vat
                                        )}
                                        <p className="font-medium text-base">
                                            Total Faktur:
                                            <span className="text-blue-600 ml-2">
                                                Rp{" "}
                                                {formatCurrency(
                                                    invoiceData.payment_summary?.invoice_total
                                                )}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/purchases/upload-invoice")}
                >
                    <span className="flex items-center">
                        <FaArrowLeft className="mr-2" />
                        <span>Unggah Ulang</span>
                    </span>
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={handleRegenerate}
                    disabled={isRegenerating || isSaving || !imageIdentifier}
                    isLoading={isRegenerating}
                    className="mx-2"
                    aria-live="polite"
                >
                    <FaRedo className="mr-2" />
                    Generate Ulang
                </Button>
                <Button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isSaving}
                    isLoading={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    aria-live="polite"
                >
                    <FaCheck className="mr-2" />
                    Konfirmasi & Simpan
                </Button>
            </CardFooter>
        </Card>
    );
};

export default ConfirmInvoicePage;
