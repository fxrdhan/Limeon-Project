import type { CompanyProfile, ProfileKey } from '@/types';

export const buildProfileEditValues = (profile: CompanyProfile) => {
  const initialValues: Record<string, string | null> = {};

  (Object.keys(profile) as Array<ProfileKey>).forEach((key: ProfileKey) => {
    initialValues[key] = profile[key] ?? '';
  });

  return initialValues;
};
