import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { supabase } from '../../lib/supabase';
import { FaEdit, FaCheck } from 'react-icons/fa';
import { Button } from '../../components/ui/Button';

interface CompanyProfile {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    tax_id: string | null;
    pharmacist_name: string | null;
    pharmacist_license: string | null;
}

const Profile = () => {
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState<Record<string, boolean>>({});
    const [editValues, setEditValues] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('company_profiles')
                .select('*')
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                if (error.code === 'PGRST116') {
                    // No data found, we'll handle this case in the UI
                } else {
                    throw error;
                }
            }

            if (data) {
                setProfile(data);
                // Initialize edit values
                const initialValues: Record<string, string> = {};
                Object.entries(data).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        initialValues[key] = value;
                    } else if (value === null) {
                        initialValues[key] = '';
                    }
                });
                setEditValues(initialValues);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleEdit = (field: string) => {
        if (editMode[field]) {
            // Save changes
            saveField(field, editValues[field] || '');
        }
        setEditMode((prev) => ({
            ...prev,
            [field]: !prev[field],
        }));
    };

    const handleChange = (field: string, value: string) => {
        setEditValues((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const saveField = async (field: string, value: string) => {
        if (!profile) return;

        try {
            const { error } = await supabase
                .from('company_profiles')
                .update({ [field]: value })
                .eq('id', profile.id);

            if (error) {
                console.error('Error updating profile:', error);
                return;
            }

            // Update local state
            setProfile((prev) => prev ? {
                ...prev,
                [field]: value,
            } : null);
        } catch (error) {
            console.error('Error saving field:', error);
        }
    };

    const ProfileField = ({
        label,
        field,
        value
    }: {
        label: string;
        field: string;
        value: string | null;
    }) => {
        return (
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-medium text-gray-600">{label}</label>
                    <Button
                        variant="text"
                        size="sm"
                        onClick={() => toggleEdit(field)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                    >
                        {editMode[field] ? <FaCheck className="text-green-500" /> : <FaEdit />}
                    </Button>
                </div>
                {editMode[field] ? (
                    <input
                        type="text"
                        value={editValues[field] || ''}
                        onChange={(e) => handleChange(field, e.target.value)}
                        className="w-full p-2 border rounded-md"
                    />
                ) : (
                    <div className="p-2 bg-gray-50 rounded-md">
                        {value || <span className="text-gray-400 italic">Tidak ada data</span>}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="text-center p-6">Memuat data...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profil Perusahaan</CardTitle>
            </CardHeader>
            <CardContent>
                {!profile ? (
                    <div className="text-center">
                        <p className="mb-4">Belum ada data profil. Tambahkan profil perusahaan Anda.</p>
                        <Button onClick={createProfile}>Tambah Profil</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <ProfileField label="Nama Perusahaan" field="name" value={profile.name} />
                            <ProfileField label="Alamat" field="address" value={profile.address} />
                            <ProfileField label="Nomor Telepon" field="phone" value={profile.phone} />
                            <ProfileField label="Email" field="email" value={profile.email} />
                        </div>
                        <div>
                            <ProfileField label="Website" field="website" value={profile.website} />
                            <ProfileField label="NPWP" field="tax_id" value={profile.tax_id} />
                            <ProfileField label="Nama Apoteker" field="pharmacist_name" value={profile.pharmacist_name} />
                            <ProfileField label="No. STRA/SIPA" field="pharmacist_license" value={profile.pharmacist_license} />
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
                    name: 'Apotek Mekar Sehat Sukaraya Karangbahagia',
                    address: 'PURI NIRWANA RESIDENCE BLOK EJ-01, Desa/Kel. Sukaraya, Kec. Karangbahagia, Kab. Bekasi, 17530 Indonesia',
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating profile:', error);
                return;
            }

            if (data) {
                setProfile(data);
                // Inisialisasi nilai edit dengan data yang ada
                const initialValues: Record<string, string> = {};
                Object.entries(data).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        initialValues[key] = value;
                    } else if (value === null) {
                        initialValues[key] = '';
                    }
                });
                setEditValues(initialValues);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
};

export default Profile;