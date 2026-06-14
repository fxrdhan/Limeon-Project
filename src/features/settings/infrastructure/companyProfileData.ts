import { companyProfileService } from '@/services/api/companyProfile.service';
import type { ProfileKey } from '@/types';

export type ProfileFieldUpdate = {
  field: ProfileKey;
  value: string | null;
};

export const fetchCompanyProfile = async () => {
  const { data, error } = await companyProfileService.getProfile();
  if (error) throw new Error(error.message);
  return data;
};

export const updateCompanyProfileField = async (
  profileId: string | undefined,
  { field, value }: ProfileFieldUpdate
) => {
  if (!profileId) {
    throw new Error('Profil ID tidak ditemukan untuk diperbarui.');
  }

  const { error } = await companyProfileService.updateProfileField(
    profileId,
    field,
    value
  );

  if (error) throw new Error(error.message);
};

export const createDefaultCompanyProfile = async () => {
  return companyProfileService.createProfile({
    name: 'Nama Apotek/Klinik Anda',
    address: 'Alamat Lengkap Apotek/Klinik Anda',
  });
};
