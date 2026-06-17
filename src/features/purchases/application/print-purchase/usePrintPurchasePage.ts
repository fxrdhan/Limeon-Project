import { useEffect, useState } from 'react';
import {
  parsePurchasePrintSessionValue,
  PURCHASE_PRINT_SESSION_KEY,
} from '../../domain/purchaseDocument';

export const usePrintPurchasePage = () => {
  // Keep the existing lazy session reads isolated from render logic.
  const [{ items, purchase, subtotals }] = useState(() => {
    const storedData = sessionStorage.getItem(PURCHASE_PRINT_SESSION_KEY);
    return parsePurchasePrintSessionValue(storedData);
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
