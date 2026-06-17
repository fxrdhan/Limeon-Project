import Button from '@/components/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { TbCheck, TbPencil, TbX } from 'react-icons/tb';
import type { ProfileKey } from '@/types';
import { useProfilePage } from '../../application/profile/useProfilePage';

const Profile = () => {
  const {
    profile,
    isLoading,
    isError,
    error,
    editMode,
    editValues,
    isCreatingProfile,
    updateProfileMutation,
    toggleEdit,
    handleSave,
    handleCancel,
    handleChange,
    createProfile,
  } = useProfilePage();

  const ProfileField = ({
    label,
    field,
  }: {
    label: string;
    field: ProfileKey;
  }) => {
    const inputId = `company-profile-${field}`;

    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-600"
          >
            {label}
          </label>
          {editMode[field] ? (
            <div className="flex space-x-1">
              <Button
                aria-label={`Batal edit ${label}`}
                variant="text"
                size="sm"
                onClick={() => handleCancel(field)}
                className="p-1 text-slate-500 hover:text-red-500"
              >
                <TbX />
              </Button>
              <Button
                aria-label={`Simpan ${label}`}
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
              aria-label={`Edit ${label}`}
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
            id={inputId}
            aria-label={label}
            type="text"
            value={editValues[field] || ''}
            onChange={e => handleChange(field, e.target.value)}
            className="w-full p-2 border rounded-xl"
          />
        ) : (
          <div className="p-2 bg-slate-50 rounded-xl min-h-[40px]">
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
        Error: {error?.message ?? 'Gagal memuat profil perusahaan'}
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
            <Button
              onClick={createProfile}
              isLoading={isCreatingProfile}
              disabled={isCreatingProfile}
            >
              Tambah Profil
            </Button>
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
};

export default Profile;
