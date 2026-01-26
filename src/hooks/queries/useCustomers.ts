import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import { customersService } from '@/services/api/customers.service';
import type { Customer } from '@/types/database';

export const useCustomers = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.customers.list(),
    queryFn: async () => {
      const result = await customersService.getActiveCustomers();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useCustomer = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QueryKeys.customers.detail(id),
    queryFn: async () => {
      const result = await customersService.getById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: (options?.enabled ?? true) && !!id,
  });
};

export const useCustomerMutations = () => {
  const queryClient = useQueryClient();

  const createCustomer = useMutation({
    mutationFn: async (
      data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const result = await customersService.create(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.customers.all(),
      });
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Customer, 'id' | 'created_at'>>;
    }) => {
      const result = await customersService.update(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: data => {
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: QueryKeys.customers.detail(data.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.customers.all(),
      });
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const result = await customersService.delete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: QueryKeys.customers.detail(id) });
      queryClient.invalidateQueries({
        queryKey: getInvalidationKeys.customers.all(),
      });
    },
  });

  return {
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
};
