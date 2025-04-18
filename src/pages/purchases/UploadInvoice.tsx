import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FaUpload, FaArrowLeft, FaTimes } from 'react-icons/fa';
import { uploadAndExtractInvoice } from '../../services/invoiceService';

const UploadInvoice = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        setError(null);
        if (!selectedFile) return;
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
            setError(null);
            const data = await uploadAndExtractInvoice(file);
            navigate('/purchases/confirm-invoice', { state: { extractedData: data, filePreview: previewUrl } });
        } catch (err: unknown) {
            setError(`Gagal mengunggah dan mengekstrak faktur: ${err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        setPreviewUrl(null);
        setFileInputKey(prev => prev + 1);
        setError(null);
    };

    return (
        <Card className="shadow-lg max-w-2xl mx-auto">
            <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold">
                        Unggah Faktur Pembelian
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    </div>
                </div>
                <p className="text-muted-foreground text-sm mt-1">
                    Silakan unggah gambar faktur atau invoice pembelian Anda
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
                    <div
                        className={`border-2 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-300'} 
                             rounded-lg p-10 text-center transition-all cursor-pointer hover:bg-gray-50`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('fileInput')?.click()}
                    >
                        {previewUrl ? (
                            <div className="mb-4 relative group">
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="max-h-60 mx-auto rounded-md shadow-md"
                                />
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation();
                                        handleRemoveFile();
                                    }}
                                    className="absolute -top-2 -right-2 text-red-500 p-1 hover:text-red-700 focus:outline-none"
                                    aria-label="Hapus file"
                                >
                                    <FaTimes className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="rounded-full bg-blue-100 p-4 inline-flex mb-3">
                                    <FaUpload className="mx-auto h-8 w-8 text-blue-500" />
                                </div>
                                <p className="text-sm font-medium text-gray-700">
                                    Klik atau seret untuk mengunggah gambar faktur
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
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
                    <div className="flex justify-between mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/purchases')}
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
                            aria-live="polite"
                        >
                            <FaUpload className="mr-2" /> Unggah & Lanjutkan
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default UploadInvoice;