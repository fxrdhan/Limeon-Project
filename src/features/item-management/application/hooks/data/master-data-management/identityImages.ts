import type { MasterDataIdentity } from './types';

export const IDENTITY_IMAGE_BUCKET = 'profiles';
export const IMAGE_ENABLED_TABLES = new Set([
  'suppliers',
  'patients',
  'doctors',
]);

export const getIdentityImageUrl = (
  identity: MasterDataIdentity | null | undefined
): string | null => {
  if (!identity || !('image_url' in identity)) {
    return null;
  }
  const imageUrl = identity.image_url;
  return typeof imageUrl === 'string' && imageUrl.trim() !== ''
    ? imageUrl
    : null;
};

export const getIdentityImageUploadPath = (
  tableName: string,
  entityId: string,
  fileName: string
) => {
  const extension = fileName.split('.').pop()?.toLowerCase().trim() || 'jpg';
  return `${tableName}/${entityId}/image.${extension}`;
};

export const getIdentityImageUrlForEntity = ({
  entityId,
  editingIdentity,
  identities,
}: {
  entityId: string;
  editingIdentity: MasterDataIdentity | null;
  identities: MasterDataIdentity[];
}) => {
  if (editingIdentity?.id === entityId) {
    return getIdentityImageUrl(editingIdentity);
  }

  return getIdentityImageUrl(
    identities.find(identity => identity.id === entityId)
  );
};

export const getSupersededIdentityImagePath = ({
  oldImagePath,
  nextImagePath,
  tableName,
  entityId,
}: {
  oldImagePath: string | null;
  nextImagePath: string;
  tableName: string;
  entityId: string;
}) => {
  const expectedImagePathPrefix = `${tableName}/${entityId}/`;

  return oldImagePath &&
    oldImagePath !== nextImagePath &&
    oldImagePath.startsWith(expectedImagePathPrefix)
    ? oldImagePath
    : null;
};
