import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FaUpload, FaArrowLeft, FaCheck, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import { uploadAndExtractInvoice, ExtractedInvoiceData, ProductListItem } from '../../services/invoiceService';

const UploadInvoice = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [responseData, setResponseData] = useState<ExtractedInvoiceData | null>(null);
    const [uploadStep, setUploadStep] = useState<'upload' | 'confirm'>('upload');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [editableData, setEditableData] = useState<ExtractedInvoiceData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fileInputKey, setFileInputKey] = useState<number>(0);

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }

        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [file]);

    useEffect(() => {
        if (responseData) {
            setEditableData(JSON.parse(JSON.stringify(responseData)));
        }
    }, [responseData]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        setError(null);
        
        if (!selectedFile) {
            return;
        }
        
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(selectedFile.type)) {
            setError('Tipe file tidak valid. Harap unggah file PNG atau JPG.');
            setFile(null);
            return;
        }
        
        const maxSize = 5 * 1024 * 1024;
        if (selectedFile.size > maxSize) {
            setError('Ukuran file terlalu besar. Maksimum 5MB.');
            setFile(null);
            return;
        }
        
        setFile(selectedFile);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        setError(null);
        
        const droppedFile = e.dataTransfer.files[0];
        if (!droppedFile) return;
        
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(droppedFile.type)) {
            setError('Tipe file tidak valid. Harap unggah file PNG atau JPG.');
            return;
        }
        
        const maxSize = 5 * 1024 * 1024;
        if (droppedFile.size > maxSize) {
            setError('Ukuran file terlalu besar. Maksimum 5MB.');
            return;
        }
        
        setFile(droppedFile);
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
        } catch (err: unknown) {
            setError(`Gagal mengunggah dan mengekstrak faktur: ${err instanceof Error ? err.message : 'Terjadi kesalahan'}`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleConfirm = async () => {
        if (!editableData) return;
        
        try {
            setLoading(true);
            alert('Faktur berhasil disimpan!');
            navigate('/purchases');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Gagal menyimpan data faktur');
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

    const handleRemoveFile = () => {
        setFile(null);
        setPreviewUrl(null);
        setFileInputKey(prev => prev + 1);
        setError(null);
    };

    const handleFieldEdit = (
        section: keyof ExtractedInvoiceData, 
        field: string, 
        value: string | number
    ) => {
        if (!editableData) return;
        
        setEditableData(prev => {
            if (!prev) return prev;
            
            const updated = { ...prev };
            if (updated[section]) {
                const sectionObj = updated[section] as Record<string, string | number>;
                sectionObj[field] = value;
            }
            return updated;
        });
    };

    const toggleEdit = () => {
        setIsEditing(!isEditing);
    };

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsFullscreen(true);
    };

    const closeFullscreen = () => {
        setIsFullscreen(false);
    };

    return (
        <Card className="shadow-lg max-w-5xl mx-auto">
            {/* Fullscreen Image Viewer */}
            {isFullscreen && previewUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4" onClick={closeFullscreen}>
                    <div className="relative max-w-full max-h-full overflow-auto">
                        <img 
                            src={previewUrl} 
                            alt="Fullscreen Preview" 
                            className="max-w-full max-h-[90vh] object-contain"
                        />
                        <button 
                            onClick={closeFullscreen}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 focus:outline-none"
                        >
                            <FaTimes className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold">
                        {uploadStep === 'upload' ? 'Unggah Faktur Pembelian' : 'Konfirmasi Data Faktur'}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                        <div className={`h-2 w-2 rounded-full ${uploadStep === 'upload' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                        <div className="h-[2px] w-12 bg-gray-300"></div>
                        <div className={`h-2 w-2 rounded-full ${uploadStep === 'confirm' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    </div>
                </div>
                {uploadStep === 'upload' ? (
                    <p className="text-muted-foreground text-sm mt-1">
                        Silakan unggah gambar faktur atau invoice pembelian Anda
                    </p>
                ) : (
                    <p className="text-muted-foreground text-sm mt-1">
                        Silakan periksa data yang terekstrak dari faktur Anda
                    </p>
                )}
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
                
                {uploadStep === 'upload' ? (
                    <div className="space-y-6">
                        <div 
                            className={`border-2 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-300'} 
                            rounded-lg p-6 text-center transition-all cursor-pointer hover:bg-gray-50`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('fileInput')?.click()}
                        >
                            {previewUrl ? (
                                <div className="mb-4 relative">
                                    <img 
                                        src={previewUrl} 
                                        alt="Preview" 
                                        className="max-h-64 mx-auto rounded-md shadow-md cursor-pointer" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleImageClick(e);
                                        }}
                                    />
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation();
                                            handleRemoveFile();
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none"
                                    >
                                        <FaTrash className="h-3 w-3" />
                                    </button>
                                </div>
                            ) : (
                                <div className="mb-4">
                                    <div className="animate-pulse rounded-full bg-blue-100 p-4 inline-flex">
                                        <FaUpload className="mx-auto h-8 w-8 text-blue-500" />
                                    </div>
                                    <p className="mt-4 text-sm font-medium text-gray-700">
                                        Klik atau seret untuk mengunggah gambar faktur
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        PNG, JPG (Maks. 5MB)
                                    </p>
                                </div>
                            )}
                            
                            <input
                                id="fileInput"
                                type="file"
                                key={fileInputKey}
                                accept="image/png,image/jpeg,image/jpg"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            
                            {file && !previewUrl && (
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
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <FaUpload className="mr-2" /> Unggah & Ekstrak
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {editableData && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-medium">Data yang Diekstraksi:</h3>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={toggleEdit}
                                        className="text-sm"
                                    >
                                        <FaEdit className="mr-2" /> 
                                        {isEditing ? 'Selesai Edit' : 'Edit Data'}
                                    </Button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="border rounded-md p-4 hover:shadow-md transition-shadow">
                                        <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                                            <span className="inline-block w-6 h-6 text-xs flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2">1</span>
                                            Informasi Perusahaan
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            {isEditing ? (
                                                <>
                                                    <div className="mb-2">
                                                        <label className="text-xs text-gray-500 block mb-1">Nama Perusahaan</label>
                                                        <input 
                                                            type="text" 
                                                            value={editableData.company_details?.name || ''}
                                                            onChange={(e) => handleFieldEdit('company_details', 'name', e.target.value)}
                                                            className="w-full px-3 py-2 border rounded-md text-sm"
                                                        />
                                                    </div>
                                                    <div className="mb-2">
                                                        <label className="text-xs text-gray-500 block mb-1">Alamat</label>
                                                        <textarea 
                                                            value={editableData.company_details?.address || ''}
                                                            onChange={(e) => handleFieldEdit('company_details', 'address', e.target.value)}
                                                            className="w-full px-3 py-2 border rounded-md text-sm"
                                                            rows={2}
                                                        />
                                                    </div>
                                                    <div className="mb-2">
                                                        <label className="text-xs text-gray-500 block mb-1">No. Lisensi PBF</label>
                                                        <input 
                                                            type="text" 
                                                            value={editableData.company_details?.license_pbf || ''}
                                                            onChange={(e) => handleFieldEdit('company_details', 'license_pbf', e.target.value)}
                                                            className="w-full px-3 py-2 border rounded-md text-sm"
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <p><span className="font-medium">Nama:</span> {editableData.company_details?.name || '-'}</p>
                                                    <p><span className="font-medium">Alamat:</span> {editableData.company_details?.address || '-'}</p>
                                                    <p><span className="font-medium">No. Lisensi PBF:</span> {editableData.company_details?.license_pbf || '-'}</p>
                                                    <p><span className="font-medium">No. Lisensi DAK:</span> {editableData.company_details?.license_dak || '-'}</p>
                                                    <p><span className="font-medium">No. Sertifikat CDOB:</span> {editableData.company_details?.certificate_cdob || '-'}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="border rounded-md p-4 hover:shadow-md transition-shadow">
                                        <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                                            <span className="inline-block w-6 h-6 text-xs flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2">2</span>
                                            Informasi Faktur
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            {isEditing ? (
                                                <>
                                                    <div className="mb-2">
                                                        <label className="text-xs text-gray-500 block mb-1">No. Faktur</label>
                                                        <input 
                                                            type="text" 
                                                            value={editableData.invoice_information?.invoice_number || ''}
                                                            onChange={(e) => handleFieldEdit('invoice_information', 'invoice_number', e.target.value)}
                                                            className="w-full px-3 py-2 border rounded-md text-sm"
                                                        />
                                                    </div>
                                                    <div className="mb-2">
                                                        <label className="text-xs text-gray-500 block mb-1">Tanggal</label>
                                                        <input 
                                                            type="date" 
                                                            value={editableData.invoice_information?.invoice_date || ''}
                                                            onChange={(e) => handleFieldEdit('invoice_information', 'invoice_date', e.target.value)}
                                                            className="w-full px-3 py-2 border rounded-md text-sm"
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <p><span className="font-medium">No. Faktur:</span> {editableData.invoice_information?.invoice_number || '-'}</p>
                                                    <p><span className="font-medium">Tanggal:</span> {editableData.invoice_information?.invoice_date || '-'}</p>
                                                    <p><span className="font-medium">No. SO:</span> {editableData.invoice_information?.so_number || '-'}</p>
                                                    <p><span className="font-medium">Jatuh Tempo:</span> {editableData.invoice_information?.due_date || '-'}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="border rounded-md p-4 mb-6 hover:shadow-md transition-shadow">
                                    <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                                        <span className="inline-block w-6 h-6 text-xs flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2">3</span>
                                        Informasi Pelanggan
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        {isEditing ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="mb-2">
                                                    <label className="text-xs text-gray-500 block mb-1">Nama Pelanggan</label>
                                                    <input 
                                                        type="text" 
                                                        value={editableData.customer_information?.customer_name || ''}
                                                        onChange={(e) => handleFieldEdit('customer_information', 'customer_name', e.target.value)}
                                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                                    />
                                                </div>
                                                <div className="mb-2">
                                                    <label className="text-xs text-gray-500 block mb-1">ID Pelanggan</label>
                                                    <input 
                                                        type="text" 
                                                        value={editableData.customer_information?.customer_id || ''}
                                                        onChange={(e) => handleFieldEdit('customer_information', 'customer_id', e.target.value)}
                                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p><span className="font-medium">Nama:</span> {editableData.customer_information?.customer_name || '-'}</p>
                                                <p><span className="font-medium">Alamat:</span> {editableData.customer_information?.customer_address || '-'}</p>
                                                {editableData.customer_information?.customer_id && (
                                                    <p><span className="font-medium">ID:</span> {editableData.customer_information.customer_id}</p>
                                                )}
                                            </>
                                        )}
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
                                                    <th className="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {(editableData.product_list ?? []).map((product: ProductListItem, index: number) => (
                                                    <tr key={index} className="text-sm hover:bg-gray-50">
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
                                    <div className="border rounded-md p-4 hover:shadow-md transition-shadow">
                                        <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                                            <span className="inline-block w-6 h-6 text-xs flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2">5</span>
                                            Informasi Tambahan
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="font-medium">Diperiksa oleh:</span> {editableData.additional_information?.checked_by || '-'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="border rounded-md p-4 hover:shadow-md transition-shadow">
                                        <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                                            <span className="inline-block w-6 h-6 text-xs flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2">6</span>
                                            Ringkasan Pembayaran
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="font-medium">Total Harga:</span> {editableData.payment_summary?.total_price?.toLocaleString('id-ID') || '-'}</p>
                                            <p><span className="font-medium">PPN:</span> {editableData.payment_summary?.vat?.toLocaleString('id-ID') || '-'}</p>
                                            <p className="font-medium text-base">Total Faktur: 
                                                <span className="text-blue-600 ml-2">
                                                    Rp {editableData.payment_summary?.invoice_total?.toLocaleString('id-ID') || '-'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                {previewUrl && (
                                    <div className="mt-6 border rounded-md p-4">
                                        <h4 className="font-medium text-gray-700 mb-2">Gambar Faktur</h4>
                                        <div className="flex justify-center">
                                            <img 
                                                src={previewUrl} 
                                                alt="Preview Faktur" 
                                                className="max-h-96 object-contain rounded-md shadow-md cursor-pointer" 
                                                onClick={handleImageClick}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
            
            {uploadStep === 'confirm' && (
                <CardFooter className="border-t pt-4 flex justify-end space-x-2">
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
                        className="bg-green-600 hover:bg-green-700 text-white"
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