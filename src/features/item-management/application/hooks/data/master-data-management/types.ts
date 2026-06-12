import type { Customer, Doctor, Patient, Supplier } from '@/types';

export type MasterDataIdentity = Supplier | Patient | Doctor | Customer;

export interface MasterDataQueryOptions {
  enabled?: boolean;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
}

export interface MasterDataUpdateMutation {
  mutateAsync: (params: {
    id: string;
    data: Record<string, unknown>;
    options?: { silent?: boolean };
  }) => Promise<unknown>;
}

export interface MasterDataCreateMutation {
  mutateAsync: (data: Record<string, unknown>) => Promise<unknown>;
}

export interface MasterDataDeleteMutation {
  mutateAsync: (id: string) => Promise<unknown>;
}
