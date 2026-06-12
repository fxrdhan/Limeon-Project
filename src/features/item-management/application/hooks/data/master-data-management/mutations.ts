import type {
  MasterDataCreateMutation,
  MasterDataDeleteMutation,
  MasterDataUpdateMutation,
} from './types';

const pickMutation = (mutations: unknown, keys: string[]) => {
  if (!mutations || typeof mutations !== 'object') {
    return undefined;
  }

  const mutationRecord = mutations as Record<string, unknown>;
  return keys.map(key => mutationRecord[key]).find(Boolean);
};

const hasMutateAsync = (
  mutation: unknown
): mutation is { mutateAsync: unknown } => {
  return (
    !!mutation &&
    typeof mutation === 'object' &&
    'mutateAsync' in mutation &&
    typeof mutation.mutateAsync === 'function'
  );
};

export const getMasterDataUpdateMutation = (
  mutations: unknown
): MasterDataUpdateMutation | undefined => {
  const mutation = pickMutation(mutations, [
    'updateSupplier',
    'updatePatient',
    'updateDoctor',
    'updateCustomer',
  ]);

  return hasMutateAsync(mutation)
    ? (mutation as MasterDataUpdateMutation)
    : undefined;
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

  return hasMutateAsync(mutation)
    ? (mutation as MasterDataCreateMutation)
    : undefined;
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

  return hasMutateAsync(mutation)
    ? (mutation as MasterDataDeleteMutation)
    : undefined;
};
