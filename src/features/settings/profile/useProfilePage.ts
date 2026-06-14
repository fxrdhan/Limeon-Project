import { QueryKeys } from '@/constants/queryKeys';
import { companyProfileService } from '@/services/api/companyProfile.service';
import type { CompanyProfile, ProfileKey } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

type ProfileFieldUpdate = {
  field: ProfileKey;
  value: string | null;
};

const buildProfileEditValues = (profile: CompanyProfile) => {
  const initialValues: Record<string, string | null> = {};

  (Object.keys(profile) as Array<ProfileKey>).forEach((key: ProfileKey) => {
    initialValues[key] = profile[key] ?? '';
  });

  return initialValues;
};

const fetchProfile = async () => {
  const { data, error } = await companyProfileService.getProfile();
  if (error) throw new Error(error.message);
  return data;
};

export const useProfilePage = () => {
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string | null>>(
    {}
  );
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useQuery<CompanyProfile | null>({
    queryKey: QueryKeys.companyProfile.all,
    queryFn: fetchProfile,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (profile) {
      setEditValues(buildProfileEditValues(profile));
    }
  }, [profile]);

  const updateProfileMutation = useMutation<void, Error, ProfileFieldUpdate>({
    mutationFn: async ({ field, value }) => {
      if (!profile?.id)
        throw new Error('Profil ID tidak ditemukan untuk diperbarui.');

      const { error } = await companyProfileService.updateProfileField(
        profile.id,
        field,
        value
      );

      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: QueryKeys.companyProfile.all,
      });
      setEditMode(prev => ({ ...prev, [variables.field]: false }));
    },
    onError: error => {
      console.error('Error updating profile:', error);
      alert(`Gagal memperbarui profil: ${error.message}`);
    },
  });

  const toggleEdit = (field: ProfileKey) => {
    setEditMode(prev => ({ ...prev, [field]: !prev[field] }));
    if (editMode[field] && profile) {
      setEditValues(prev => ({ ...prev, [field]: profile[field] ?? '' }));
    }
  };

  const handleSave = (field: ProfileKey) => {
    updateProfileMutation.mutate({ field, value: editValues[field] });
  };

  const handleCancel = (field: ProfileKey) => {
    if (profile) {
      setEditValues(prev => ({ ...prev, [field]: profile[field] ?? '' }));
    }
    setEditMode(prev => ({ ...prev, [field]: false }));
  };

  const handleChange = (field: ProfileKey, value: string) => {
    setEditValues((prev: Record<string, string | null>) => ({
      ...prev,
      [field]: value,
    }));
  };

  const createProfile = async () => {
    try {
      const { data, error } = await companyProfileService.createProfile({
        name: 'Nama Apotek/Klinik Anda',
        address: 'Alamat Lengkap Apotek/Klinik Anda',
      });

      if (error) {
        console.error('Error creating profile:', error);
        alert(`Gagal membuat profil: ${error.message}`);
        return;
      }

      if (data) {
        void queryClient.invalidateQueries({
          queryKey: QueryKeys.companyProfile.all,
        });
        setEditValues(buildProfileEditValues(data));
        alert('Profil berhasil dibuat. Silakan lengkapi data.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(
        `Terjadi kesalahan saat membuat profil: ${
          error instanceof Error ? error.message : 'Kesalahan tidak diketahui'
        }`
      );
    }
  };

  return {
    profile,
    isLoading,
    isError,
    error,
    editMode,
    editValues,
    updateProfileMutation,
    toggleEdit,
    handleSave,
    handleCancel,
    handleChange,
    createProfile,
  };
};
