import type { SearchColumn } from '@/types/search';

export const doctorSearchColumns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Nama Dokter',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama lengkap dokter',
  },
  {
    field: 'gender',
    headerName: 'Jenis Kelamin',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan jenis kelamin (L/P)',
  },
  {
    field: 'specialization',
    headerName: 'Spesialisasi',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan bidang spesialisasi dokter',
  },
  {
    field: 'license_number',
    headerName: 'Nomor Lisensi',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nomor lisensi praktik',
  },
  {
    field: 'experience_years',
    headerName: 'Pengalaman',
    searchable: true,
    type: 'number',
    description: 'Cari berdasarkan tahun pengalaman',
  },
  {
    field: 'phone',
    headerName: 'Telepon',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nomor telepon',
  },
  {
    field: 'email',
    headerName: 'Email',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat email',
  },
];

export const patientSearchColumns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Nama Pasien',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama lengkap pasien',
  },
  {
    field: 'gender',
    headerName: 'Jenis Kelamin',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan jenis kelamin (L/P)',
  },
  {
    field: 'birth_date',
    headerName: 'Tanggal Lahir',
    searchable: true,
    type: 'date',
    description: 'Cari berdasarkan tanggal lahir',
  },
  {
    field: 'address',
    headerName: 'Alamat',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat tempat tinggal',
  },
  {
    field: 'phone',
    headerName: 'Telepon',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nomor telepon',
  },
  {
    field: 'email',
    headerName: 'Email',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat email',
  },
];

export const supplierSearchColumns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Nama Supplier',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama perusahaan supplier',
  },
  {
    field: 'address',
    headerName: 'Alamat',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat supplier',
  },
  {
    field: 'phone',
    headerName: 'Telepon',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nomor telepon',
  },
  {
    field: 'email',
    headerName: 'Email',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat email',
  },
  {
    field: 'contact_person',
    headerName: 'Kontak Person',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama kontak person',
  },
];

export const customerSearchColumns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Nama Pelanggan',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nama pelanggan',
  },
  {
    field: 'phone',
    headerName: 'Telepon',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan nomor telepon',
  },
  {
    field: 'email',
    headerName: 'Email',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat email',
  },
  {
    field: 'address',
    headerName: 'Alamat',
    searchable: true,
    type: 'text',
    description: 'Cari berdasarkan alamat pelanggan',
  },
];
