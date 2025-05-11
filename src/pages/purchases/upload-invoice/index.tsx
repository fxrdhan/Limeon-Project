import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FaUpload, FaArrowLeft, FaTimes, FaImage, FaSearchPlus, FaSearchMinus } from 'react-icons/fa';
import { uploadAndExtractInvoice } from '../../../services/invoiceService';

const UploadInvoice = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileInputKey, setFileInputKey] = useState<number>(0);
    const [showFullPreview, setShowFullPreview] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const imageContainerRef = useRef<HTMLDivElement>(null);

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
            const startTime = Date.now();
            const data = await uploadAndExtractInvoice(file);
            const imageIdentifier = data.imageIdentifier; // Ambil identifier dari respons
            const processingTime = (Date.now() - startTime) / 1000;
            navigate('/purchases/confirm-invoice', {
                state: {
                    extractedData: data, // Data JSON yang diekstrak
                    filePreview: previewUrl,
                    processingTime: processingTime.toFixed(1),
                    imageIdentifier: imageIdentifier // Kirim identifier ke halaman konfirmasi
                }
            });
        } catch (err: unknown) {
            setError(`Gagal mengunggah dan mengekstrak faktur: ${err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFile = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setFile(null);
        setPreviewUrl(null);
        setFileInputKey(prev => prev + 1);
        setError(null);
        setShowFullPreview(false);
    };

    const toggleFullPreview = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setShowFullPreview(prev => !prev);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!imageContainerRef.current) return;
        
        const rect = imageContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setPosition({ x, y });
    };

    const handleZoom = (e: React.WheelEvent) => {
        e.preventDefault();
        
        const zoomIncrement = 0.1;
        const direction = e.deltaY > 0 ? 1 : -1;
        
        setZoomLevel(currentZoom => {
            const newZoom = currentZoom + (direction * zoomIncrement);
            return Math.min(Math.max(newZoom, 1), 3);
        });
    };

    const resetZoom = () => {
        setZoomLevel(1);
        setPosition({ x: 0, y: 0 });
    };

    return (
        <>
            <Card className="shadow-lg max-w-2xl mx-auto">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold">
                            Unggah Faktur Pembelian
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                            <div className="h-[2px] w-12 bg-gray-300"></div>
                            <div className="h-2 w-2 rounded-full bg-gray-300"></div>
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
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 101.414 1.414L10 11.414l1.293 1.293a1 1 001.414-1.414L11.414 10l1.293-1.293a1 1 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}
                    <div className="space-y-6">
                        {!file ? (
                            <div
                                className={`border-2 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-300'} 
                                        rounded-lg p-10 text-center transition-all cursor-pointer hover:bg-gray-50`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('fileInput')?.click()}
                            >
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
                                <input
                                    id="fileInput"
                                    type="file"
                                    key={fileInputKey}
                                    accept="image/png,image/jpeg,image/jpg"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        ) : (
                            <div className="mb-4">
                                <div 
                                    className="flex items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFullPreview();
                                    }}
                                >
                                    {previewUrl ? (
                                        <div className="h-16 w-16 mr-3 overflow-hidden rounded-md border border-gray-200 flex-shrink-0">
                                            <img 
                                                src={previewUrl} 
                                                alt="Thumbnail" 
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-16 w-16 mr-3 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0">
                                            <FaImage className="h-8 w-8 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="text-left flex-grow">
                                        <p className="text-sm font-medium text-gray-700 truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB • Klik untuk pratinjau
                                        </p>
                                    </div>
                                    <button 
                                        onClick={(e) => handleRemoveFile(e)}
                                        className="p-1.5 ml-2 text-red-500 hover:text-red-700 focus:outline-none"
                                        aria-label="Hapus file"
                                    >
                                        <FaTimes className="h-4 w-4" />
                                    </button>
                                </div>
                                <input
                                    id="fileInput"
                                    type="file"
                                    key={fileInputKey}
                                    accept="image/png,image/jpeg,image/jpg"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        )}
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
                                <FaUpload className="mr-2" /> Ekspor Data 
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {showFullPreview && previewUrl && createPortal(
                <div
                    className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
                    onClick={() => {
                        toggleFullPreview();
                        resetZoom();
                    }}
                >
                    <div 
                        ref={imageContainerRef}
                        className="p-4 relative overflow-hidden"
                        style={{
                            maxHeight: '100vh',
                            maxWidth: '100vw',
                            width: 'auto'
                        }}
                        onWheel={handleZoom}
                        onMouseMove={handleMouseMove}
                    >
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="h-auto w-auto object-contain transition-transform duration-100"
                            style={{
                                maxHeight: '90vh',
                                maxWidth: '120%',
                                transformOrigin: `${position.x}px ${position.y}px`,
                                transform: `scale(${zoomLevel})`
                            }}
                        />
                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full flex items-center space-x-2">
                            <FaSearchMinus className="text-gray-200" />
                            <div className="text-sm font-medium">{Math.round(zoomLevel * 100)}%</div>
                            <FaSearchPlus className="text-gray-200" />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default UploadInvoice;