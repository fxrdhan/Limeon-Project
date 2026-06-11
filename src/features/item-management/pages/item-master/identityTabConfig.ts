import { createTextColumn } from '@/components/ag-grid/columns';
import { formatDateOnlyDisplayValue } from '@/lib/formatters';
import type { FieldConfig } from '@/types';
import type { CustomerLevel } from '@/types/database';
import type { ColDef } from 'ag-grid-community';
import {
  createAdvancedTextColumn,
  DATE_ADVANCED_FILTER_COLUMN_PROPS,
  NUMBER_ADVANCED_FILTER_COLUMN_PROPS,
} from './advancedFilterColumns';

type IdentityFormPayload = Record<string, string | number | boolean | null>;
type EntityOption = { id: string; name: string };

export const toCustomerLevelOptions = (
  customerLevels: CustomerLevel[]
): EntityOption[] =>
  customerLevels.map(level => ({
    id: level.id,
    name: level.level_name,
  }));

export const toCustomerLevelNameMap = (customerLevels: CustomerLevel[]) =>
  new Map(customerLevels.map(level => [level.id, level.level_name]));

export const toCustomerPayload = (
  data: IdentityFormPayload,
  defaultCustomerLevelId: string | null
) => ({
  name: String(data.name || ''),
  customer_level_id: String(
    data.customer_level_id || defaultCustomerLevelId || ''
  ),
  phone: data.phone ? String(data.phone) : null,
  email: data.email ? String(data.email) : null,
  address: data.address ? String(data.address) : null,
});

export const toPatientPayload = (data: IdentityFormPayload) => ({
  name: String(data.name || ''),
  gender: data.gender ? String(data.gender) : null,
  birth_date: data.birth_date ? String(data.birth_date) : null,
  address: data.address ? String(data.address) : null,
  phone: data.phone ? String(data.phone) : null,
  email: data.email ? String(data.email) : null,
  image_url: data.image_url ? String(data.image_url) : null,
});

export const toDoctorPayload = (data: IdentityFormPayload) => {
  const rawExperienceYears = data.experience_years;
  const hasExperienceYears =
    rawExperienceYears !== null &&
    rawExperienceYears !== undefined &&
    String(rawExperienceYears).trim() !== '';
  const parsedExperienceYears = hasExperienceYears
    ? Number(rawExperienceYears)
    : null;

  return {
    name: String(data.name || ''),
    gender: data.gender ? String(data.gender) : null,
    specialization: data.specialization ? String(data.specialization) : null,
    license_number: data.license_number ? String(data.license_number) : null,
    experience_years:
      parsedExperienceYears !== null && Number.isFinite(parsedExperienceYears)
        ? parsedExperienceYears
        : null,
    qualification: data.education ? String(data.education) : null,
    phone: data.phone ? String(data.phone) : null,
    email: data.email ? String(data.email) : null,
    image_url: data.image_url ? String(data.image_url) : null,
  };
};

export const buildCustomerFields = (
  customerLevelOptions: EntityOption[]
): FieldConfig[] => [
  {
    key: 'name',
    label: 'Nama Pelanggan',
    type: 'text',
  },
  {
    key: 'customer_level_id',
    label: 'Level Pelanggan',
    options: customerLevelOptions,
    isRadioDropdown: true,
  },
  {
    key: 'phone',
    label: 'Telepon',
    type: 'tel',
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
  },
  {
    key: 'address',
    label: 'Alamat',
    type: 'textarea',
  },
];

export const PATIENT_FIELDS: FieldConfig[] = [
  {
    key: 'name',
    label: 'Nama Pasien',
    type: 'text',
  },
  {
    key: 'gender',
    label: 'Jenis Kelamin',
    type: 'text',
    options: [
      { id: 'L', name: 'Laki-laki' },
      { id: 'P', name: 'Perempuan' },
    ],
    isRadioDropdown: true,
  },
  {
    key: 'birth_date',
    label: 'Tanggal Lahir',
    type: 'date',
  },
  {
    key: 'address',
    label: 'Alamat',
    type: 'textarea',
  },
  {
    key: 'phone',
    label: 'Telepon',
    type: 'tel',
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
  },
];

export const DOCTOR_FIELDS: FieldConfig[] = [
  {
    key: 'name',
    label: 'Nama Dokter',
    type: 'text',
  },
  {
    key: 'gender',
    label: 'Jenis Kelamin',
    type: 'text',
    options: [
      { id: 'L', name: 'Laki-laki' },
      { id: 'P', name: 'Perempuan' },
    ],
    isRadioDropdown: true,
  },
  {
    key: 'specialization',
    label: 'Spesialisasi',
    type: 'text',
  },
  {
    key: 'license_number',
    label: 'Nomor Lisensi',
    type: 'text',
  },
  {
    key: 'experience_years',
    label: 'Tahun Pengalaman',
    type: 'text',
  },
  {
    key: 'education',
    label: 'Pendidikan',
    type: 'textarea',
  },
  {
    key: 'phone',
    label: 'Telepon',
    type: 'tel',
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
  },
];

export const buildCustomerColumnDefs = (
  customerLevelById: Map<string, string>
): ColDef[] => [
  createAdvancedTextColumn({
    field: 'name',
    headerName: 'Nama Pelanggan',
    minWidth: 200,
    flex: 1,
  }),
  createAdvancedTextColumn({
    field: 'customer_level_id',
    headerName: 'Level',
    minWidth: 140,
    valueGetter: params =>
      customerLevelById.get(params.data.customer_level_id) || '-',
  }),
  createAdvancedTextColumn({
    field: 'phone',
    headerName: 'Telepon',
    minWidth: 120,
    valueGetter: params => params.data.phone || '-',
  }),
  createAdvancedTextColumn({
    field: 'email',
    headerName: 'Email',
    minWidth: 150,
    valueGetter: params => params.data.email || '-',
  }),
  createAdvancedTextColumn({
    field: 'address',
    headerName: 'Alamat',
    minWidth: 180,
    flex: 1,
    valueGetter: params => params.data.address || '-',
  }),
];

export const buildPatientColumnDefs = (): ColDef[] => [
  createAdvancedTextColumn({
    field: 'name',
    headerName: 'Nama Pasien',
    minWidth: 200,
    flex: 1,
  }),
  createAdvancedTextColumn({
    field: 'gender',
    headerName: 'Jenis Kelamin',
    minWidth: 120,
    valueGetter: params => params.data.gender || '-',
  }),
  {
    ...createTextColumn({
      field: 'birth_date',
      headerName: 'Tanggal Lahir',
      minWidth: 120,
      valueGetter: params => {
        const value = params.data.birth_date;
        return value && typeof value === 'string'
          ? formatDateOnlyDisplayValue(value)
          : '-';
      },
    }),
    ...DATE_ADVANCED_FILTER_COLUMN_PROPS,
    filterValueGetter: params => params.data?.birth_date ?? null,
  },
  createAdvancedTextColumn({
    field: 'address',
    headerName: 'Alamat',
    minWidth: 150,
    flex: 1,
    valueGetter: params => params.data.address || '-',
  }),
  createAdvancedTextColumn({
    field: 'phone',
    headerName: 'Telepon',
    minWidth: 120,
    valueGetter: params => params.data.phone || '-',
  }),
  createAdvancedTextColumn({
    field: 'email',
    headerName: 'Email',
    minWidth: 150,
    valueGetter: params => params.data.email || '-',
  }),
];

export const buildDoctorColumnDefs = (): ColDef[] => [
  createAdvancedTextColumn({
    field: 'name',
    headerName: 'Nama Dokter',
    minWidth: 200,
    flex: 1,
  }),
  createAdvancedTextColumn({
    field: 'gender',
    headerName: 'Jenis Kelamin',
    minWidth: 120,
    valueGetter: params => {
      const value = params.data.gender;
      return value === 'L'
        ? 'Laki-laki'
        : value === 'P'
          ? 'Perempuan'
          : value || '-';
    },
  }),
  createAdvancedTextColumn({
    field: 'specialization',
    headerName: 'Spesialisasi',
    minWidth: 150,
    valueGetter: params => params.data.specialization || '-',
  }),
  createAdvancedTextColumn({
    field: 'license_number',
    headerName: 'Nomor Lisensi',
    minWidth: 120,
    valueGetter: params => params.data.license_number || '-',
  }),
  {
    ...createTextColumn({
      field: 'experience_years',
      headerName: 'Pengalaman',
      minWidth: 100,
      valueGetter: params => {
        const years = params.data.experience_years;
        return years ? `${years} tahun` : '-';
      },
    }),
    ...NUMBER_ADVANCED_FILTER_COLUMN_PROPS,
    filterValueGetter: params => params.data?.experience_years ?? null,
  },
  createAdvancedTextColumn({
    field: 'phone',
    headerName: 'Telepon',
    minWidth: 120,
    valueGetter: params => params.data.phone || '-',
  }),
  createAdvancedTextColumn({
    field: 'email',
    headerName: 'Email',
    minWidth: 150,
    valueGetter: params => params.data.email || '-',
  }),
];
