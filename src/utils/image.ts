import Compressor from 'compressorjs';
import imageCompression from 'browser-image-compression';

const MAX_SIZE_MB = 500;
const COMPRESSION_OPTIONS = {
  quality: 0.7,
  maxWidth: 1024,
  maxHeight: 1024,
  convertTypes: ['image/png'], // Convert large PNG files to JPEG for better compression
};

const getOutputMimeType = (file: File) =>
  file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';

const compressWithBrowserCompression = async (file: File): Promise<File> => {
  const maxBytes = MAX_SIZE_MB * 1024 * 1024;
  const mimeType = getOutputMimeType(file);

  const baseOptions = {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: 1024,
    useWebWorker: false,
    fileType: mimeType,
  };

  let compressed = await imageCompression(file, baseOptions);
  if (compressed.size <= maxBytes) {
    return compressed;
  }

  compressed = await imageCompression(file, {
    ...baseOptions,
    maxSizeMB: 0.8,
    maxWidthOrHeight: 900,
    initialQuality: 0.7,
  });

  return compressed;
};

const compressWithCompressor = (file: File): Promise<File | Blob> =>
  new Promise<File | Blob>((resolve, reject) => {
    new Compressor(file, {
      ...COMPRESSION_OPTIONS,
      mimeType: getOutputMimeType(file),
      success(result: File | Blob) {
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
      error() {
        reject(new Error('Image compression failed'));
      },
    });
  });

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image compression failed'));
    };
    img.src = objectUrl;
  });

const compressWithCanvas = async (file: File): Promise<File> => {
  const image = await loadImage(file);
  const mimeType = getOutputMimeType(file);
  const maxBytes = MAX_SIZE_MB * 1024 * 1024;

  let maxSize = 1024;
  let quality = 0.7;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const ratio = Math.min(
      1,
      maxSize / image.width || 1,
      maxSize / image.height || 1
    );
    const targetWidth = Math.round(image.width * ratio);
    const targetHeight = Math.round(image.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Image compression failed');
    }

    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        result => {
          if (result) resolve(result);
          else reject(new Error('Image compression failed'));
        },
        mimeType,
        quality
      );
    });

    if (blob.size <= maxBytes) {
      return new File([blob], file.name, {
        type: blob.type,
        lastModified: Date.now(),
      });
    }

    maxSize = Math.round(maxSize * 0.85);
    quality = Math.max(0.4, quality - 0.1);
  }

  throw new Error('Image compression failed');
};

export async function compressImageIfNeeded(file: File): Promise<File | Blob> {
  if (file.size <= MAX_SIZE_MB * 1024 * 1024) {
    return file;
  }

  console.info(`[image] original size: ${file.size} bytes`);

  const attempts =
    file.type === 'image/png'
      ? [
          compressWithBrowserCompression,
          compressWithCanvas,
          compressWithCompressor,
        ]
      : [
          compressWithBrowserCompression,
          compressWithCompressor,
          compressWithCanvas,
        ];

  for (const [index, attempt] of attempts.entries()) {
    try {
      const result = await attempt(file);
      const finalSize = result instanceof File ? result.size : result.size;
      console.info(
        `[image] compressed size (attempt ${index + 1}): ${finalSize} bytes`
      );
      return result;
    } catch {
      console.info(`[image] compression attempt ${index + 1} failed`);
      // Try next compression strategy
    }
  }

  console.info('[image] compression failed, using original file');
  return file;
}
