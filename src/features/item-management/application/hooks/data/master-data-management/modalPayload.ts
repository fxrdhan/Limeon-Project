export interface MasterDataModalSubmitData {
  id?: string;
  code?: string;
  name?: string;
  description?: string;
  address?: string;
  data?: Record<string, unknown>;
}

export const getMasterDataModalPayload = (
  identityData: MasterDataModalSubmitData
) => {
  if (identityData.data) {
    return identityData.data;
  }

  const payloadData: Record<string, unknown> = {};
  if (identityData.name !== undefined) {
    payloadData.name = identityData.name;
  }
  if (identityData.description !== undefined) {
    payloadData.description = identityData.description;
  }
  if (identityData.address !== undefined) {
    payloadData.address = identityData.address;
  }
  if (identityData.code !== undefined) {
    payloadData.code = identityData.code;
  }

  return payloadData;
};
