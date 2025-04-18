import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FaArrowLeft, FaCheck } from 'react-icons/fa';
import { ExtractedInvoiceData, ProductListItem, saveInvoiceToDatabase } from '../../services/invoiceService';
import { Loading } from '../../components/ui/Loading';

const ConfirmInvoicePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [editableData, setEditableData] = useState<ExtractedInvoiceData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (location.state?.extractedData) {
            setEditableData(JSON.parse(JSON.stringify(location.state.extractedData)));
        } else {
            console.warn("Tidak ada data faktur yang diterima. Kembali ke halaman upload.");
            navigate('/purchases/upload-invoice');
        }
    }, [location.state, navigate]);

    const handleConfirm = async () => {
        if (!editableData) return;

        try {
            setLoading(true);
            setError(null);
            await saveInvoiceToDatabase(editableData);
            alert('Faktur berhasil disimpan!');
            navigate('/purchases');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Gagal menyimpan data faktur');
            console.error("Error saving invoice:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!editableData) {
        return <Loading message="Memuat data konfirmasi..." />;
    }

    const renderField = (label: string, value: string | number | undefined | null) => {
        const displayValue = value ?? '-';
        return (
            <div className="mb-2">
                <span className="font-medium text-gray-600">{label}:</span>{' '}
                <span className="text-gray-800">{displayValue}</span>
            </div>
        );
    };

    const renderProductField = (
        value: string | number | undefined | null
    ) => {
        const displayValue = value ?? '-';
        return displayValue.toLocaleString();
    };

    return (
        <Card className="shadow-lg max-w-5xl mx-auto">
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
                        <svg className="h-5 w-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Data yang Diekstraksi:</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="border rounded-md p-4 hover:shadow-md transition-shadow">
                                <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                                    <span className="inline-block w-6 h-6 text-xs flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2">1</span>
                                    Informasi Perusahaan
                                </h4>
                                <div className="space-y-1 text-sm">
                                    {renderField("Nama", editableData.company_details?.name)}
                                    {renderField("Alamat", editableData.company_details?.address)}
                                    {renderField("No. Lisensi PBF", editableData.company_details?.license_pbf)}
                                </div>
                            </div>
                            <div className="border rounded-md p-4 hover:shadow-md transition-shadow">
                                <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                                    <span className="inline-block w-6 h-6 text-xs flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2">2</span>
                                    Informasi Faktur
                                </h4>
                                <div className="space-y-1 text-sm">
                                    {renderField("No. Faktur", editableData.invoice_information?.invoice_number)}
                                    {renderField("Tanggal", editableData.invoice_information?.invoice_date)}
                                    {renderField("No. SO", editableData.invoice_information?.so_number)}
                                    {renderField("Jatuh Tempo", editableData.invoice_information?.due_date)}
                                </div>
                            </div>
                        </div>
                        <div className="border rounded-md p-4 mb-6 hover:shadow-md transition-shadow">
                            <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                                <span className="inline-block w-6 h-6 text-xs flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2">3</span>
                                Informasi Pelanggan
                            </h4>
                            <div className="space-y-1 text-sm">
                                {renderField("Nama", editableData.customer_information?.customer_name)}
                                {renderField("Alamat", editableData.customer_information?.customer_address)}
                                {renderField("ID Pelanggan", editableData.customer_information?.customer_id)}
                            </div>
                        </div>
                        <div className="mb-6">
                            <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                                <span className="inline-block w-6 h-6 text-xs flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2">4</span>
                                Daftar Produk
                            </h4>
                            <div className="overflow-x-auto border rounded-md">
                                <table className="min-w-full bg-white">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Produk</th>
                                            <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                            <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Satuan</th>
                                            <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">No. Batch</th>
                                            <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Exp</th>
                                            <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th>
                                            <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Diskon (%)</th>
                                            <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {(editableData.product_list ?? []).map((product: ProductListItem, index: number) => (
                                            <tr key={index} className="text-sm hover:bg-gray-50">
                                                <td className="py-1 px-3">{renderProductField(product.sku)}</td>
                                                <td className="py-1 px-3">{renderProductField(product.product_name)}</td>
                                                <td className="py-1 px-3 text-center">{renderProductField(product.quantity)}</td>
                                                <td className="py-1 px-3 text-center">{renderProductField(product.unit)}</td>
                                                <td className="py-1 px-3 text-center">{renderProductField(product.batch_number)}</td>
                                                <td className="py-1 px-3 text-center">{renderProductField(product.expiry_date)}</td>
                                                <td className="py-1 px-3 text-right">{renderProductField(product.unit_price)}</td>
                                                <td className="py-1 px-3 text-right">{renderProductField(product.discount)}</td>
                                                <td className="py-1 px-3 text-right">{renderProductField(product.total_price)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="border rounded-md p-4 hover:shadow-md transition-shadow">
                                <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                                    <span className="inline-block w-6 h-6 text-xs flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2">5</span>
                                    Informasi Tambahan
                                </h4>
                                <div className="space-y-1 text-sm">
                                    {renderField("Diperiksa oleh", editableData.additional_information?.checked_by)}
                                </div>
                            </div>
                            <div className="border rounded-md p-4 hover:shadow-md transition-shadow">
                                <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                                    <span className="inline-block w-6 h-6 text-xs flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2">6</span>
                                    Ringkasan Pembayaran
                                </h4>
                                <div className="space-y-1 text-sm">
                                    {renderField("Total Harga", editableData.payment_summary?.total_price)}
                                    {renderField("PPN", editableData.payment_summary?.vat)}
                                    <p className="font-medium text-base">Total Faktur:
                                        <span className="text-blue-600 ml-2">
                                            Rp {editableData.payment_summary?.invoice_total?.toLocaleString('id-ID') || '-'}
                                        </span>
                                    </p>
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
                    onClick={() => navigate('/purchases/upload-invoice')}
                >
                    <span className="flex items-center">
                        <FaArrowLeft className="mr-2" />
                        <span>Unggah Ulang</span>
                    </span>
                </Button>
                <Button
                    type="button"
                    onClick={handleConfirm}
                    disabled={loading}
                    isLoading={loading}
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