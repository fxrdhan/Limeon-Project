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
