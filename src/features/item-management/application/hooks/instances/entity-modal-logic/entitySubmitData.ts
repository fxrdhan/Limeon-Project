export interface EntitySubmitData {
  id?: string;
  code?: string;
  name: string;
  fda_code?: string;
  description?: string;
  address?: string;
}

export const buildEntitySubmitData = ({
  id,
  code,
  name,
  description,
  address,
  entityName,
}: {
  id?: string;
  code: string;
  name: string;
  description: string;
  address: string;
  entityName: string;
}): EntitySubmitData => {
  const submitData: EntitySubmitData = {
    id,
    code: code.trim(),
    name: name.trim(),
  };

  if (entityName !== 'Produsen') {
    submitData.description = description.trim();
  }

  if (entityName === 'Produsen') {
    submitData.address = address.trim();
  }

  return submitData;
};
