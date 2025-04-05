/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/purchases/UploadInvoice.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FaUpload, FaArrowLeft, FaCheck } from 'react-icons/fa';
import { uploadAndExtractInvoice } from '../../services/invoiceService';

const UploadInvoice = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [responseData, setResponseData] = useState<any>(null);
    const [uploadStep, setUploadStep] = useState<'upload' | 'confirm'>('upload');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        setError(null);
        
        if (!selectedFile) {
            return;
        }
        
        // Validasi tipe file
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(selectedFile.type)) {
            setError('Tipe file tidak valid. Harap unggah file PNG atau JPG.');
            setFile(null);
            return;
        }
        
        // Validasi ukuran file (5MB = 5 * 1024 * 1024 bytes)
        const maxSize = 5 * 1024 * 1024;
        if (selectedFile.size > maxSize) {
            setError('Ukuran file terlalu besar. Maksimum 5MB.');
            setFile(null);
            return;
        }
        
        setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Silakan pilih file gambar faktur terlebih dahulu.');
            return;
        }
        
        try {
            setLoading(true);
            const data = await uploadAndExtractInvoice(file);
            setResponseData(data);
            setUploadStep('confirm');
        } catch (err: any) {
            setError(`Gagal mengunggah dan mengekstrak faktur: ${err.message || 'Terjadi kesalahan'}`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleConfirm = async () => {
        if (!responseData) return;
        
        try {
            setLoading(true);
            // const result = await saveInvoiceToDatabase(responseData);
            alert('Faktur berhasil disimpan!');
            navigate('/purchases');
        } catch (err: any) {
            setError(err.message || 'Gagal menyimpan data faktur');
        } finally {
            setLoading(false);
        }
    };
    
    const handleCancel = () => {
        if (uploadStep === 'confirm') {
            setUploadStep('upload');
            setResponseData(null);
        } else {
            navigate('/purchases');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {uploadStep === 'upload' ? 'Unggah Faktur Pembelian' : 'Konfirmasi Data Faktur'}
                </CardTitle>
            </CardHeader>
            
            <CardContent>
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}
                
                {uploadStep === 'upload' ? (
                    <div className="space-y-6">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <div className="mb-4">
                                <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-600">
                                    Klik atau seret untuk mengunggah gambar faktur
                                </p>
                                <p className="text-xs text-gray-500">
                                    PNG, JPG (Maks. 5MB)
                                </p>
                            </div>
                            
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                onChange={handleFileChange}
                                className="w-full"
                            />
                            
                            {file && (
                                <div className="mt-4 text-left p-3 bg-gray-50 rounded-md">
                                    <p className="text-sm font-medium text-gray-700">File dipilih:</p>
                                    <p className="text-sm text-gray-600">{file.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-end space-x-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={handleCancel}
                            >
                                <span className="flex items-center">
                                    <FaArrowLeft className="mr-2" />
                                    <span>Kembali</span>
                                </span>
                            </Button>
                            
                            <Button 
                                type="button" 
                                onClick={handleUpload} 
                                disabled={!file || loading}
                                isLoading={loading}
                            >
                                <FaUpload className="mr-2" /> Unggah & Ekstrak
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {responseData && (
                            <div>
                                <h3 className="text-lg font-medium mb-4">Data yang Diekstraksi:</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="border rounded-md p-4">
                                        <h4 className="font-medium text-gray-700 mb-2">Informasi Perusahaan</h4>
                                        <div className="space-y-1 text-sm">
                                            <p><span className="font-medium">Nama:</span> {responseData.company_details?.name || '-'}</p>
                                            <p><span className="font-medium">Alamat:</span> {responseData.company_details?.address || '-'}</p>
                                            <p><span className="font-medium">No. Lisensi PBF:</span> {responseData.company_details?.license_pbf || '-'}</p>
                                            <p><span className="font-medium">No. Lisensi DAK:</span> {responseData.company_details?.license_dak || '-'}</p>
                                            <p><span className="font-medium">No. Sertifikat CDOB:</span> {responseData.company_details?.certificate_cdob || '-'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="border rounded-md p-4">
                                        <h4 className="font-medium text-gray-700 mb-2">Informasi Faktur</h4>
                                        <div className="space-y-1 text-sm">
                                            <p><span className="font-medium">No. Faktur:</span> {responseData.invoice_information?.invoice_number || '-'}</p>
                                            <p><span className="font-medium">Tanggal:</span> {responseData.invoice_information?.invoice_date || '-'}</p>
                                            <p><span className="font-medium">No. SO:</span> {responseData.invoice_information?.so_number || '-'}</p>
                                            <p><span className="font-medium">Jatuh Tempo:</span> {responseData.invoice_information?.due_date || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="border rounded-md p-4 mb-6">
                                    <h4 className="font-medium text-gray-700 mb-2">Informasi Pelanggan</h4>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="font-medium">Nama:</span> {responseData.customer_information?.customer_name || '-'}</p>
                                        <p><span className="font-medium">Alamat:</span> {responseData.customer_information?.customer_address || '-'}</p>
                                        {responseData.customer_information?.customer_id && (
                                            <p><span className="font-medium">ID:</span> {responseData.customer_information.customer_id}</p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="mb-6">
                                    <h4 className="font-medium text-gray-700 mb-2">Daftar Produk</h4>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full bg-white border">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Produk</th>
                                                    <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                                    <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Satuan</th>
                                                    <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">No. Batch</th>
                                                    <th className="py-2 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Exp</th>
                                                    <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th>
                                                    <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {responseData.product_list?.map((product: any, index: number) => (
                                                    <tr key={index} className="text-sm">
                                                        <td className="py-2 px-3">{product.sku || '-'}</td>
                                                        <td className="py-2 px-3">{product.product_name || '-'}</td>
                                                        <td className="py-2 px-3 text-center">{product.quantity || '-'}</td>
                                                        <td className="py-2 px-3 text-center">{product.unit || '-'}</td>
                                                        <td className="py-2 px-3 text-center">{product.batch_number || '-'}</td>
                                                        <td className="py-2 px-3 text-center">{product.expiry_date || '-'}</td>
                                                        <td className="py-2 px-3 text-right">
                                                            {typeof product.unit_price === 'number' 
                                                                ? product.unit_price.toLocaleString('id-ID') 
                                                                : '-'}
                                                        </td>
                                                        <td className="py-2 px-3 text-right">
                                                            {typeof product.total_price === 'number' 
                                                                ? product.total_price.toLocaleString('id-ID') 
                                                                : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="border rounded-md p-4">
                                        <h4 className="font-medium text-gray-700 mb-2">Informasi Tambahan</h4>
                                        <div className="space-y-1 text-sm">
                                            <p><span className="font-medium">Diperiksa oleh:</span> {responseData.additional_information?.checked_by || '-'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="border rounded-md p-4">
                                        <h4 className="font-medium text-gray-700 mb-2">Ringkasan Pembayaran</h4>
                                        <div className="space-y-1 text-sm">
                                            <p><span className="font-medium">Total Harga:</span> {responseData.payment_summary?.total_price?.toLocaleString('id-ID') || '-'}</p>
                                            <p><span className="font-medium">PPN:</span> {responseData.payment_summary?.vat?.toLocaleString('id-ID') || '-'}</p>
                                            <p className="font-medium">Total Faktur: 
                                                <span className="text-blue-600 ml-2">
                                                    {responseData.payment_summary?.invoice_total?.toLocaleString('id-ID') || '-'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
            
            {uploadStep === 'confirm' && (
                <CardFooter className="flex justify-end space-x-2">
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCancel}
                    >
                        <span className="flex items-center">
                            <FaArrowLeft className="mr-2" />
                            <span>Kembali</span>
                        </span>
                    </Button>
                    
                    <Button 
                        type="button" 
                        onClick={handleConfirm} 
                        disabled={loading}
                        isLoading={loading}
                    >
                        <FaCheck className="mr-2" />
                        Konfirmasi & Simpan
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
};

export default UploadInvoice;