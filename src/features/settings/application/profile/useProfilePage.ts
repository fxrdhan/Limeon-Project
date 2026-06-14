import { QueryKeys } from '@/constants/queryKeys';
import type { CompanyProfile, ProfileKey } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { buildProfileEditValues } from '../../domain/profileEditValues';
import {
  createDefaultCompanyProfile,
  fetchCompanyProfile,
  updateCompanyProfileField,
  type ProfileFieldUpdate,
} from '../../infrastructure/companyProfileData';

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
    queryFn: fetchCompanyProfile,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (profile) {
      setEditValues(buildProfileEditValues(profile));
    }
  }, [profile]);

  const invalidateProfile = () => {
    void queryClient.invalidateQueries({
      queryKey: QueryKeys.companyProfile.all,
    });
  };

  const updateProfileMutation = useMutation<void, Error, ProfileFieldUpdate>({
    mutationFn: async ({ field, value }) => {
      await updateCompanyProfileField(profile?.id, { field, value });
    },
    onSuccess: (_, variables) => {
      invalidateProfile();
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
      const { data, error } = await createDefaultCompanyProfile();

      if (error) {
        console.error('Error creating profile:', error);
        alert(`Gagal membuat profil: ${error.message}`);
        return;
      }

      if (data) {
        invalidateProfile();
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
