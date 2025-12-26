import Compressor from 'compressorjs';

const MAX_SIZE_MB = 1;
const COMPRESSION_OPTIONS = {
  quality: 0.7,
  maxWidth: 1024,
  maxHeight: 1024,
  mimeType: 'image/jpeg',
  convertTypes: ['image/png'], // Convert large PNG files to JPEG for better compression
};

export async function compressImageIfNeeded(file: File): Promise<File | Blob> {
  if (file.size <= MAX_SIZE_MB * 1024 * 1024) {
    return file;
  }

  return new Promise<File | Blob>((resolve, reject) => {
    new Compressor(file, {
      ...COMPRESSION_OPTIONS,
      success(result: File | Blob) {
        // Convert Blob to File if needed to maintain compatibility
        if (result instanceof File) {
          resolve(result);
        } else {
          const compressedFile = new File([result], file.name, {
            type: result.type,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }
      },
      error(error: Error) {
        console.error('Error compressing image:', error);
        reject(new Error('Image compression failed'));
      },
    });
  });
}
