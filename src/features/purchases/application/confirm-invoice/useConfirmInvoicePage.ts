import type { ExtractedInvoiceData } from '@/types';
import {
  regenerateConfirmedInvoiceData,
  saveConfirmedInvoiceToDatabase,
} from '../../infrastructure/confirmInvoiceData';
import { normalizeConfirmInvoiceRouteState } from '../../domain/confirmInvoiceRouteState';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const routeGenerationRef = useRef(0);
  const regenerateGenerationRef = useRef(0);
  const isRegeneratingRef = useRef(false);
  const isSavingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      routeGenerationRef.current += 1;
      regenerateGenerationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const routeState = normalizeConfirmInvoiceRouteState(location.state);
    routeGenerationRef.current += 1;
    regenerateGenerationRef.current += 1;
    isRegeneratingRef.current = false;
    isSavingRef.current = false;

    if (routeState) {
      setInvoiceData(routeState.invoiceData);
      setProcessingTime(routeState.processingTime);
      setImageIdentifier(routeState.imageIdentifier);
      setIsRegenerating(false);
      setIsSaving(false);
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
    if (isRegeneratingRef.current) return;

    const routeGeneration = routeGenerationRef.current;
    const regenerateGeneration = regenerateGenerationRef.current + 1;
    regenerateGenerationRef.current = regenerateGeneration;
    isRegeneratingRef.current = true;
    const isCurrentRegenerate = () =>
      mountedRef.current &&
      routeGenerationRef.current === routeGeneration &&
      regenerateGenerationRef.current === regenerateGeneration;

    setIsRegenerating(true);
    setError(null);
    try {
      const startTime = Date.now();
      const regeneratedData =
        await regenerateConfirmedInvoiceData(imageIdentifier);
      const newProcessingTime = (Date.now() - startTime) / 1000;
      if (!isCurrentRegenerate()) return;
      setInvoiceData(regeneratedData);
      setProcessingTime(newProcessingTime.toFixed(1));
    } catch (err: unknown) {
      if (!isCurrentRegenerate()) return;
      setError(
        err instanceof Error ? err.message : 'Gagal memproses ulang data faktur'
      );
      console.error('Error regenerating invoice:', err);
    } finally {
      if (isCurrentRegenerate()) {
        isRegeneratingRef.current = false;
        setIsRegenerating(false);
      }
    }
  };

  const handleConfirm = async () => {
    if (!invoiceData || !imageIdentifier) return;
    if (isSavingRef.current) return;

    const routeGeneration = routeGenerationRef.current;
    const isCurrentSave = () =>
      mountedRef.current && routeGenerationRef.current === routeGeneration;
    isSavingRef.current = true;

    try {
      setIsSaving(true);
      setError(null);
      await saveConfirmedInvoiceToDatabase(invoiceData, imageIdentifier);
      if (!isCurrentSave()) return;
      toast.success('Faktur berhasil disimpan!');
      void navigate('/purchases');
    } catch (err: unknown) {
      if (!isCurrentSave()) return;
      setError(
        err instanceof Error ? err.message : 'Gagal menyimpan data faktur'
      );
      console.error('Error saving invoice:', err);
    } finally {
      if (isCurrentSave()) {
        isSavingRef.current = false;
        setIsSaving(false);
      }
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
