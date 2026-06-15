import { describe, expect, it } from 'vite-plus/test';
import {
  buildConfirmInvoiceNavigationState,
  getInvoiceExtractionErrorMessage,
  getInvoiceImageValidationError,
  getNextInvoicePreviewZoomLevel,
  isPointerWithinRect,
} from './uploadInvoiceUtils';

describe('upload invoice utilities', () => {
  it('validates supported invoice image files', () => {
    expect(
      getInvoiceImageValidationError(
        new File(['invoice'], 'invoice.png', { type: 'image/png' })
      )
    ).toBeNull();

    expect(
      getInvoiceImageValidationError(
        new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' })
      )
    ).toBe('Tipe file tidak valid. Harap unggah file PNG atau JPG.');
  });

  it('rejects invoice images larger than five megabytes', () => {
    const oversizedImage = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      'invoice.jpg',
      { type: 'image/jpeg' }
    );

    expect(getInvoiceImageValidationError(oversizedImage)).toBe(
      'Ukuran file terlalu besar. Maksimum 5MB.'
    );
  });

  it('checks pointer coordinates against inclusive rectangle bounds', () => {
    const rect = {
      bottom: 40,
      left: 10,
      right: 30,
      top: 20,
    };

    expect(isPointerWithinRect({ x: 10, y: 20 }, rect)).toBe(true);
    expect(isPointerWithinRect({ x: 30, y: 40 }, rect)).toBe(true);
    expect(isPointerWithinRect({ x: 9, y: 20 }, rect)).toBe(false);
    expect(isPointerWithinRect({ x: 10, y: 41 }, rect)).toBe(false);
  });

  it('updates preview zoom in fixed steps within the supported range', () => {
    expect(getNextInvoicePreviewZoomLevel(1, -100)).toBe(1);
    expect(getNextInvoicePreviewZoomLevel(1.5, -100)).toBe(1.4);
    expect(getNextInvoicePreviewZoomLevel(1.5, 100)).toBe(1.6);
    expect(getNextInvoicePreviewZoomLevel(3, 100)).toBe(3);
  });

  it('formats invoice extraction failures with the previous user-facing copy', () => {
    expect(getInvoiceExtractionErrorMessage(new Error('server gagal'))).toBe(
      'Gagal mengunggah dan mengekstrak faktur: server gagal'
    );

    expect(getInvoiceExtractionErrorMessage('unknown')).toBe(
      'Gagal mengunggah dan mengekstrak faktur: Terjadi kesalahan tidak dikenal'
    );
  });

  it('builds confirm-invoice route state with existing processing time formatting', () => {
    const extractedData = {
      imageIdentifier: 'invoice-image-1',
      product_list: [],
    };

    expect(
      buildConfirmInvoiceNavigationState({
        completedAtMs: 2_350,
        extractedData,
        filePreview: 'blob:invoice-preview',
        startedAtMs: 1_000,
      })
    ).toEqual({
      extractedData,
      filePreview: 'blob:invoice-preview',
      imageIdentifier: 'invoice-image-1',
      processingTime: '1.4',
    });
  });
});
