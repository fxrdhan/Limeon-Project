export type EntityCrudFormPayload = {
  id?: string;
  code?: string;
  name: string;
  description?: string;
  address?: string;
  nci_code?: string;
};

export type EntityCrudCreateMutationPayload = {
  action: 'create';
  payload: Record<string, unknown>;
};

export type EntityCrudUpdateMutationPayload = {
  action: 'update';
  payload: { id: string } & Record<string, unknown>;
};

export type EntityCrudMutationPayload =
  | EntityCrudCreateMutationPayload
  | EntityCrudUpdateMutationPayload;

const buildEntityCrudBaseData = (
  itemData: EntityCrudFormPayload
): Record<string, unknown> => {
  const baseData: Record<string, unknown> = { name: itemData.name };

  if (itemData.description !== undefined) {
    baseData.description = itemData.description;
  }
  if (itemData.address !== undefined) {
    baseData.address = itemData.address;
  }
  if (itemData.nci_code !== undefined) {
    baseData.nci_code = itemData.nci_code;
  }
  if (itemData.code !== undefined) {
    baseData.code = itemData.code;
  }

  return baseData;
};

export const buildEntityCrudMutationPayload = (
  itemData: EntityCrudFormPayload
): EntityCrudMutationPayload => {
  const baseData = buildEntityCrudBaseData(itemData);

  if (itemData.id) {
    return {
      action: 'update',
      payload: {
        id: itemData.id,
        ...baseData,
      },
    };
  }

  return {
    action: 'create',
    payload: baseData,
  };
};
