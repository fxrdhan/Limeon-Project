import type { Customer, Doctor, Patient, Supplier } from '@/types';
import { fuzzyMatch } from '@/utils/search';
import { filterAndRank } from '../searchCore';
import type { MasterDataIdentity } from './types';

const matchesCommonIdentityField = (
  identity: MasterDataIdentity,
  searchTermLower: string
) => {
  if (
    'code' in identity &&
    typeof identity.code === 'string' &&
    fuzzyMatch(identity.code.toLowerCase(), searchTermLower)
  ) {
    return true;
  }
  if (identity.name && fuzzyMatch(identity.name, searchTermLower)) {
    return true;
  }
  if (
    'description' in identity &&
    typeof identity.description === 'string' &&
    fuzzyMatch(identity.description, searchTermLower)
  ) {
    return true;
  }
  if (
    'address' in identity &&
    typeof identity.address === 'string' &&
    fuzzyMatch(identity.address, searchTermLower)
  ) {
    return true;
  }
  return false;
};

const matchesSupplierField = (supplier: Supplier, searchTermLower: string) => {
  if (supplier.address && fuzzyMatch(supplier.address, searchTermLower)) {
    return true;
  }
  if (supplier.phone && fuzzyMatch(supplier.phone, searchTermLower)) {
    return true;
  }
  if (supplier.email && fuzzyMatch(supplier.email, searchTermLower)) {
    return true;
  }
  if (
    supplier.contact_person &&
    fuzzyMatch(supplier.contact_person, searchTermLower)
  ) {
    return true;
  }
  return false;
};

const matchesPatientField = (patient: Patient, searchTermLower: string) => {
  if (patient.gender && fuzzyMatch(patient.gender, searchTermLower)) {
    return true;
  }
  if (patient.address && fuzzyMatch(patient.address, searchTermLower)) {
    return true;
  }
  if (patient.phone && fuzzyMatch(patient.phone, searchTermLower)) {
    return true;
  }
  if (patient.email && fuzzyMatch(patient.email, searchTermLower)) {
    return true;
  }
  if (
    patient.birth_date &&
    fuzzyMatch(patient.birth_date.toString(), searchTermLower)
  ) {
    return true;
  }
  return false;
};

const matchesDoctorField = (doctor: Doctor, searchTermLower: string) => {
  if (
    doctor.specialization &&
    fuzzyMatch(doctor.specialization, searchTermLower)
  ) {
    return true;
  }
  if (
    doctor.license_number &&
    fuzzyMatch(doctor.license_number, searchTermLower)
  ) {
    return true;
  }
  if (doctor.phone && fuzzyMatch(doctor.phone, searchTermLower)) {
    return true;
  }
  if (doctor.email && fuzzyMatch(doctor.email, searchTermLower)) {
    return true;
  }
  if (
    doctor.experience_years &&
    fuzzyMatch(doctor.experience_years.toString(), searchTermLower)
  ) {
    return true;
  }
  return false;
};

const matchesCustomerField = (customer: Customer, searchTermLower: string) => {
  if (customer.phone && fuzzyMatch(customer.phone, searchTermLower)) {
    return true;
  }
  if (customer.email && fuzzyMatch(customer.email, searchTermLower)) {
    return true;
  }
  if (customer.address && fuzzyMatch(customer.address, searchTermLower)) {
    return true;
  }
  return false;
};

const matchesIdentity = (
  tableName: string,
  identity: MasterDataIdentity,
  searchTermLower: string
) => {
  if (matchesCommonIdentityField(identity, searchTermLower)) {
    return true;
  }

  if (tableName === 'suppliers') {
    return matchesSupplierField(identity as Supplier, searchTermLower);
  }
  if (tableName === 'patients') {
    return matchesPatientField(identity as Patient, searchTermLower);
  }
  if (tableName === 'doctors') {
    return matchesDoctorField(identity as Doctor, searchTermLower);
  }
  if (tableName === 'customers') {
    return matchesCustomerField(identity as Customer, searchTermLower);
  }
  return false;
};

const scoreIdentity = (
  identityToSort: MasterDataIdentity,
  searchTermLower: string
) => {
  if (
    'code' in identityToSort &&
    typeof identityToSort.code === 'string' &&
    identityToSort.code.toLowerCase().startsWith(searchTermLower)
  ) {
    return 5;
  }
  if (
    'code' in identityToSort &&
    typeof identityToSort.code === 'string' &&
    identityToSort.code.toLowerCase().includes(searchTermLower)
  ) {
    return 4;
  }
  if (
    identityToSort.name &&
    identityToSort.name.toLowerCase().startsWith(searchTermLower)
  ) {
    return 3;
  }
  if (
    identityToSort.name &&
    identityToSort.name.toLowerCase().includes(searchTermLower)
  ) {
    return 2;
  }
  if (identityToSort.name && fuzzyMatch(identityToSort.name, searchTermLower)) {
    return 1;
  }
  return 0;
};

const compareIdentity = (a: MasterDataIdentity, b: MasterDataIdentity) => {
  if (
    'code' in a &&
    'code' in b &&
    typeof a.code === 'string' &&
    typeof b.code === 'string'
  ) {
    return a.code.localeCompare(b.code);
  }
  return a.name.localeCompare(b.name);
};

export const filterMasterDataIdentities = ({
  data,
  searchTerm,
  tableName,
}: {
  data: MasterDataIdentity[];
  searchTerm: string;
  tableName: string;
}) => {
  if (!searchTerm) {
    return data;
  }

  return filterAndRank<MasterDataIdentity>({
    data,
    searchTerm,
    matcher: (identity, searchTermLower) =>
      matchesIdentity(tableName, identity, searchTermLower),
    scorer: scoreIdentity,
    tieBreaker: compareIdentity,
  });
};
