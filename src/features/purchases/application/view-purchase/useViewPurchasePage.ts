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
    let isCurrentRequest = true;

    const fetchPurchaseData = async (purchaseId: string) => {
      try {
        setLoading(true);
        const purchaseData = await fetchViewPurchaseData(purchaseId);
        if (!isCurrentRequest) return;
        setPurchase(purchaseData.purchase);
        setItems(purchaseData.items);
      } catch (error) {
        if (!isCurrentRequest) return;
        console.error('Error fetching purchase data:', error);
      } finally {
        if (isCurrentRequest) {
          setLoading(false);
        }
      }
    };

    if (id) {
      void fetchPurchaseData(id);
    }

    return () => {
      isCurrentRequest = false;
    };
  }, [id]);

  const subtotals = useMemo(
    () => calculatePurchaseDocumentSubtotals(purchase, items),
    [items, purchase]
  );

  const navigateToPurchaseList = useCallback(() => {
    void navigate('/purchases');
  }, [navigate]);

  const savePrintablePurchaseSession = useCallback(() => {
    if (loading || !purchase || purchase.id !== id) {
      return false;
    }

    try {
      sessionStorage.setItem(
        PURCHASE_PRINT_SESSION_KEY,
        JSON.stringify({
          purchase,
          items,
          subtotals,
        })
      );
      return true;
    } catch {
      return false;
    }
  }, [id, items, loading, purchase, subtotals]);

  const openPrintableVersion = useCallback(() => {
    if (!savePrintablePurchaseSession()) {
      return;
    }

    const printWindow = window.open('/purchases/print-view', '_blank');
    if (printWindow) {
      printWindow.focus();
      return;
    }

    void navigate('/purchases/print-view');
  }, [navigate, savePrintablePurchaseSession]);

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
