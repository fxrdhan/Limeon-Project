import { QueryKeys } from '@/constants/queryKeys';
import { useSimpleRealtime } from '../realtime/useSimpleRealtime';
import { usePurchases } from './usePurchases';

interface UsePurchasesRealtimeOptions {
  enabled?: boolean;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
}

// Purchases Realtime Hook using simplified approach
export const usePurchasesRealtime = (options?: UsePurchasesRealtimeOptions) => {
  const purchasesQuery = usePurchases(options);

  useSimpleRealtime({
    table: 'purchases',
    queryKeys: [
      QueryKeys.purchases.all,
    ],
    enabled: options?.enabled ?? true,
  });

  return purchasesQuery;
};