import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/constants/queryKeys';
import { masterDataService } from '@/services/api/masterData.service';

export const useAllMasterData = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.masterData.all,
    queryFn: async () => {
      const result = await masterDataService.getAllMasterData();
      if (
        result.errors.categories ||
        result.errors.types ||
        result.errors.packages ||
        result.errors.suppliers
      ) {
        throw new Error('Failed to fetch master data');
      }
      return result;
    },
    enabled: options?.enabled ?? true,
    staleTime: 0,
    gcTime: 0,
  });
};
