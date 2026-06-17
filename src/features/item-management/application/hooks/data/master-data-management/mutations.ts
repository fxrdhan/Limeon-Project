import type {
  MasterDataCreateMutation,
  MasterDataDeleteMutation,
  MasterDataUpdateMutation,
} from './types';

interface MutationLike {
  mutateAsync: (...args: unknown[]) => unknown;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const pickMutation = (mutations: unknown, keys: string[]) => {
  if (!isObjectRecord(mutations)) {
    return undefined;
  }

  return keys.map(key => mutations[key]).find(Boolean);
};

const hasMutateAsync = (mutation: unknown): mutation is MutationLike =>
  isObjectRecord(mutation) && typeof mutation.mutateAsync === 'function';

export const getMasterDataUpdateMutation = (
  mutations: unknown
): MasterDataUpdateMutation | undefined => {
  const mutation = pickMutation(mutations, [
    'updateSupplier',
    'updatePatient',
    'updateDoctor',
    'updateCustomer',
  ]);

  if (!hasMutateAsync(mutation)) {
    return undefined;
  }

  return {
    mutateAsync: async params => await mutation.mutateAsync(params),
  };
};

export const getMasterDataCreateMutation = (
  mutations: unknown
): MasterDataCreateMutation | undefined => {
  const mutation = pickMutation(mutations, [
    'createSupplier',
    'createPatient',
    'createDoctor',
    'createCustomer',
  ]);

  if (!hasMutateAsync(mutation)) {
    return undefined;
  }

  return {
    mutateAsync: async data => await mutation.mutateAsync(data),
  };
};

export const getMasterDataDeleteMutation = (
  mutations: unknown
): MasterDataDeleteMutation | undefined => {
  const mutation = pickMutation(mutations, [
    'deleteSupplier',
    'deletePatient',
    'deleteDoctor',
    'deleteCustomer',
  ]);

  if (!hasMutateAsync(mutation)) {
    return undefined;
  }

  return {
    mutateAsync: async id => await mutation.mutateAsync(id),
  };
};
