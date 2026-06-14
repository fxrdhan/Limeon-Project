import type { PurchaseData, PurchaseItem } from '@/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PURCHASE_PRINT_SESSION_KEY,
  calculatePurchaseDocumentSubtotals,
} from '../../domain/purchaseDocument';
import { fetchViewPurchaseData } from '../../infrastructure/viewPurchaseData';

export const useViewPurchasePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [purchase, setPurchase] = useState<PurchaseData | null>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fetchPurchaseData = async (purchaseId: string) => {
      try {
        setLoading(true);
        const purchaseData = await fetchViewPurchaseData(purchaseId);
        setPurchase(purchaseData.purchase);
        setItems(purchaseData.items);
      } catch (error) {
        console.error('Error fetching purchase data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void fetchPurchaseData(id);
    }
  }, [id]);

  const subtotals = useMemo(
    () => calculatePurchaseDocumentSubtotals(purchase, items),
    [items, purchase]
  );

  const navigateToPurchaseList = useCallback(() => {
    void navigate('/purchases');
  }, [navigate]);

  const openPrintableVersion = useCallback(() => {
    sessionStorage.setItem(
      PURCHASE_PRINT_SESSION_KEY,
      JSON.stringify({
        purchase,
        items,
        subtotals,
      })
    );

    const printWindow = window.open('/purchases/print-view', '_blank');
    if (printWindow) printWindow.focus();
  }, [items, purchase, subtotals]);

  const increaseScale = useCallback(() => {
    setScale(prev => Math.min(prev + 0.1, 1.5));
  }, []);

  const decreaseScale = useCallback(() => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  return {
    purchase,
    items,
    loading,
    scale,
    printRef,
    subtotals,
    navigateToPurchaseList,
    openPrintableVersion,
    increaseScale,
    decreaseScale,
  };
};
