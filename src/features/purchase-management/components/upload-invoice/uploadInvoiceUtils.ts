const VALID_INVOICE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_INVOICE_IMAGE_SIZE = 5 * 1024 * 1024;

export const getGlowEffect = (intensity: number) => {
  const baseIntensity = 0.4 + intensity * 0.5;
  const outerIntensity = 0.25 + intensity * 0.4;
  return `0 0 ${12 + intensity * 12}px rgba(16, 185, 129, ${baseIntensity}), 0 0 ${25 + intensity * 25}px rgba(16, 185, 129, ${outerIntensity})`;
};

export const getSafeImageUrl = (url: string | null): string | undefined => {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'blob:') {
      return parsed.href;
    }
  } catch {
    return undefined;
  }
  return undefined;
};

export const getInvoiceImageValidationError = (file: File) => {
  if (!VALID_INVOICE_IMAGE_TYPES.includes(file.type)) {
    return 'Tipe file tidak valid. Harap unggah file PNG atau JPG.';
  }
  if (file.size > MAX_INVOICE_IMAGE_SIZE) {
    return 'Ukuran file terlalu besar. Maksimum 5MB.';
  }
  return null;
};

export const formatInvoiceFileSize = (file: File) =>
  `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
