import imageCompression from 'browser-image-compression';

const MAX_SIZE_MB = 1;
const COMPRESSION_OPTIONS = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1024,
    useWebWorker: true,
};

export async function compressImageIfNeeded(file: File): Promise<File | Blob> {
    if (file.size <= MAX_SIZE_MB * 1024 * 1024) {
        console.log('Image size is within limit, no compression needed.');
        return file;
    }

    console.log(`Compressing image: ${file.name}, original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    try {
        const compressedFile = await imageCompression(file, COMPRESSION_OPTIONS);
        console.log(`Compressed image size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
        return new File([compressedFile], file.name, { type: compressedFile.type, lastModified: Date.now() });
    } catch (error) {
        console.error('Error compressing image:', error);
        throw new Error('Image compression failed');
    }
}