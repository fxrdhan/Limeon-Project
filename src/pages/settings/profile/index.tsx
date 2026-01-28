import Button from '@/components/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { TbCheck, TbPencil, TbX } from 'react-icons/tb';
import type { CompanyProfile, ProfileKey } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Profile = () => {
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string | null>>(
    {}
  );
  const queryClient = useQueryClient();

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('company_profiles')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }
    return data;
  };

  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useQuery<CompanyProfile | null>({
    queryKey: ['companyProfile'],
    queryFn: fetchProfile,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (profile) {
      const initialValues: Record<string, string | null> = {};
      (Object.keys(profile) as Array<ProfileKey>).forEach((key: ProfileKey) => {
        initialValues[key] = profile[key] ?? '';
      });
      setEditValues(initialValues);
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async ({
      field,
      value,
    }: {
      field: string;
      value: string | null;
    }) => {
      if (!profile?.id)
        throw new Error('Profil ID tidak ditemukan untuk diperbarui.');

      const { error } = await supabase
        .from('company_profiles')
        .update({ [field]: value === '' ? null : value })
        .eq('id', profile.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companyProfile'] });
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

  const handleSave = (field: string) => {
    updateProfileMutation.mutate({ field, value: editValues[field] });
  };

  const handleCancel = (field: ProfileKey) => {
    if (profile) {
      setEditValues(prev => ({ ...prev, [field]: profile[field] ?? '' }));
    }
    setEditMode(prev => ({ ...prev, [field]: false }));
  };

  const handleChange = (field: string, value: string) => {
    setEditValues((prev: Record<string, string | null>) => ({
      ...prev,
      [field]: value,
    }));
  };

  const ProfileField = ({
    label,
    field,
  }: {
    label: string;
    field: ProfileKey;
  }) => {
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-slate-600">{label}</label>
          {editMode[field] ? (
            <div className="flex space-x-1">
              <Button
                variant="text"
                size="sm"
                onClick={() => handleCancel(field)}
                className="p-1 text-slate-500 hover:text-red-500"
              >
                <TbX />
              </Button>
              <Button
                variant="text"
                size="sm"
                onClick={() => handleSave(field)}
                className="p-1 text-slate-500 hover:text-green-500"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending &&
                updateProfileMutation.variables?.field === field ? (
                  <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <TbCheck />
                )}
              </Button>
            </div>
          ) : (
            <Button
              variant="text"
              size="sm"
              onClick={() => toggleEdit(field)}
              className="p-1 text-slate-500 hover:text-primary"
            >
              <TbPencil />
            </Button>
          )}
        </div>
        {editMode[field] ? (
          <input
            type="text"
            value={editValues[field] || ''}
            onChange={e => handleChange(field, e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        ) : (
          <div className="p-2 bg-slate-50 rounded-md min-h-[40px]">
            {(profile && profile[field]) || (
              <span className="text-slate-400 italic">Tidak ada data</span>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-center p-6">Memuat profil perusahaan...</div>;
  }

  if (isError) {
    return (
      <div className="text-center p-6 text-red-500">
        Error: {(error as Error).message}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil Perusahaan</CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Kelola informasi detail mengenai apotek atau klinik Anda.
        </p>
      </CardHeader>
      <CardContent>
        {!profile ? (
          <div className="text-center">
            <p className="mb-4">
              Belum ada data profil. Tambahkan profil perusahaan Anda.
            </p>
            <Button onClick={createProfile}>Tambah Profil</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
            <div>
              <ProfileField label="Nama Perusahaan" field="name" />
              <ProfileField label="Alamat" field="address" />
              <ProfileField label="Nomor Telepon" field="phone" />
              <ProfileField label="Email" field="email" />
            </div>
            <div>
              <ProfileField label="Website" field="website" />
              <ProfileField label="NPWP" field="tax_id" />
              <ProfileField
                label="Nama Apoteker Penanggung Jawab"
                field="pharmacist_name"
              />
              <ProfileField
                label="No. STRA / SIPA Apoteker"
                field="pharmacist_license"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  async function createProfile() {
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .insert({
          name: 'Nama Apotek/Klinik Anda',
          address: 'Alamat Lengkap Apotek/Klinik Anda',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        alert(`Gagal membuat profil: ${error.message}`);
        return;
      }

      if (data) {
        queryClient.invalidateQueries({ queryKey: ['companyProfile'] });
        const initialValues: Record<string, string | null> = {};
        (Object.keys(data) as Array<ProfileKey>).forEach((key: ProfileKey) => {
          initialValues[key] = data[key] ?? '';
        });
        setEditValues(initialValues);
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
  }
};

export default Profile;
