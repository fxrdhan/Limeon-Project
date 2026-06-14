import type { ExtractedInvoiceData } from '@/types';
import {
  regenerateConfirmedInvoiceData,
  saveConfirmedInvoiceToDatabase,
} from './confirmInvoiceData';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface ConfirmInvoiceLocationState {
  extractedData?: ExtractedInvoiceData;
  processingTime?: string;
  imageIdentifier?: string;
}

export const useConfirmInvoicePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [invoiceData, setInvoiceData] = useState<ExtractedInvoiceData | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<string | null>(null);
  const [imageIdentifier, setImageIdentifier] = useState<string | null>(null);

  useEffect(() => {
    const routeState = location.state as ConfirmInvoiceLocationState | null;

    if (routeState?.extractedData) {
      setInvoiceData(JSON.parse(JSON.stringify(routeState.extractedData)));
      if (routeState.processingTime) {
        setProcessingTime(routeState.processingTime);
      }
      if (routeState.imageIdentifier) {
        setImageIdentifier(routeState.imageIdentifier);
      }
    } else {
      console.warn(
        'Tidak ada data faktur yang diterima. Kembali ke halaman purchase list.'
      );
      void navigate('/purchases');
    }
  }, [location.state, navigate]);

  const navigateToPurchaseList = () => {
    void navigate('/purchases');
  };

  const handleRegenerate = async () => {
    if (!imageIdentifier) {
      setError(
        'Tidak dapat memproses ulang: Identifier gambar tidak ditemukan.'
      );
      return;
    }
    setIsRegenerating(true);
    setError(null);
    try {
      const startTime = Date.now();
      const regeneratedData =
        await regenerateConfirmedInvoiceData(imageIdentifier);
      const newProcessingTime = (Date.now() - startTime) / 1000;
      setInvoiceData(regeneratedData);
      setProcessingTime(newProcessingTime.toFixed(1));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Gagal memproses ulang data faktur'
      );
      console.error('Error regenerating invoice:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleConfirm = async () => {
    if (!invoiceData || !imageIdentifier) return;
    try {
      setIsSaving(true);
      setError(null);
      await saveConfirmedInvoiceToDatabase(invoiceData, imageIdentifier);
      alert('Faktur berhasil disimpan!');
      void navigate('/purchases');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Gagal menyimpan data faktur'
      );
      console.error('Error saving invoice:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    invoiceData,
    isSaving,
    isRegenerating,
    error,
    processingTime,
    imageIdentifier,
    navigateToPurchaseList,
    handleRegenerate,
    handleConfirm,
  };
};
