import {
  useCustomerMutations,
  useCustomers,
  useDoctorMutations,
  useDoctors,
  usePatientMutations,
  usePatients,
} from '@/features/item-management/public/useIdentityData';
import {
  useSupplierMutations,
  useSuppliers,
} from '@/features/item-management/public/useSupplierData';
import type { MasterDataQueryOptions } from './types';

export const getHooksForTable = (tableName: string) => {
  switch (tableName) {
    case 'suppliers':
      return {
        useData: useSuppliers,
        useMutations: useSupplierMutations,
      };
    case 'patients':
      return {
        useData: (options: MasterDataQueryOptions) => usePatients(options),
        useMutations: usePatientMutations,
      };
    case 'doctors':
      return {
        useData: (options: MasterDataQueryOptions) => useDoctors(options),
        useMutations: useDoctorMutations,
      };
    case 'customers':
      return {
        useData: (options: MasterDataQueryOptions) => useCustomers(options),
        useMutations: useCustomerMutations,
      };
    default:
      throw new Error(`Unsupported table: ${tableName}`);
  }
};
