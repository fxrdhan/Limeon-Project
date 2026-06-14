import { useEffect, useState } from 'react';
import type { PurchaseData, PurchaseItem, Subtotals } from '@/types';
import { PURCHASE_PRINT_SESSION_KEY } from '../purchaseDocument';

export const usePrintPurchasePage = () => {
  // Keep the existing lazy session reads isolated from render logic.
  const [purchase] = useState<PurchaseData | null>(() => {
    const storedData = sessionStorage.getItem(PURCHASE_PRINT_SESSION_KEY);
    return storedData ? JSON.parse(storedData).purchase : null;
  });
  const [items] = useState<PurchaseItem[]>(() => {
    const storedData = sessionStorage.getItem(PURCHASE_PRINT_SESSION_KEY);
    return storedData ? JSON.parse(storedData).items : [];
  });
  const [subtotals] = useState<Subtotals | null>(() => {
    const storedData = sessionStorage.getItem(PURCHASE_PRINT_SESSION_KEY);
    return storedData ? JSON.parse(storedData).subtotals : null;
  });
  const [loading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return {
    purchase,
    items,
    subtotals,
    loading,
  };
};
