import type { ExtractedInvoiceData } from '@/types';

const VALID_INVOICE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_INVOICE_IMAGE_SIZE = 5 * 1024 * 1024;
const INVOICE_PREVIEW_MIN_ZOOM = 1;
const INVOICE_PREVIEW_MAX_ZOOM = 3;
const INVOICE_PREVIEW_ZOOM_STEP = 0.1;

interface BuildConfirmInvoiceNavigationStateParams {
  completedAtMs: number;
  extractedData: ExtractedInvoiceData;
  filePreview: string | null;
  startedAtMs: number;
}

export interface ConfirmInvoiceNavigationState {
  extractedData: ExtractedInvoiceData;
  filePreview: string | null;
  imageIdentifier: string | undefined;
  processingTime: string;
}

interface PointerPosition {
  x: number;
  y: number;
}

interface RectBounds {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

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

export const isPointerWithinRect = (
  pointer: PointerPosition,
  rect: RectBounds
) =>
  pointer.x >= rect.left &&
  pointer.x <= rect.right &&
  pointer.y >= rect.top &&
  pointer.y <= rect.bottom;

export const getNextInvoicePreviewZoomLevel = (
  currentZoom: number,
  deltaY: number
) => {
  const direction = deltaY > 0 ? 1 : -1;
  const nextZoom = currentZoom + direction * INVOICE_PREVIEW_ZOOM_STEP;
  return Math.min(
    Math.max(nextZoom, INVOICE_PREVIEW_MIN_ZOOM),
    INVOICE_PREVIEW_MAX_ZOOM
  );
};

export const getInvoiceExtractionErrorMessage = (error: unknown) =>
  `Gagal mengunggah dan mengekstrak faktur: ${
    error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal'
  }`;

export const buildConfirmInvoiceNavigationState = ({
  completedAtMs,
  extractedData,
  filePreview,
  startedAtMs,
}: BuildConfirmInvoiceNavigationStateParams): ConfirmInvoiceNavigationState => ({
  extractedData,
  filePreview,
  imageIdentifier: extractedData.imageIdentifier,
  processingTime: ((completedAtMs - startedAtMs) / 1000).toFixed(1),
});
