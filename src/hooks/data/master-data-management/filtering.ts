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

const matchesSupplierField = (
  identity: MasterDataIdentity,
  searchTermLower: string
) => {
  if (
    'address' in identity &&
    identity.address &&
    fuzzyMatch(identity.address, searchTermLower)
  ) {
    return true;
  }
  if (
    'phone' in identity &&
    identity.phone &&
    fuzzyMatch(identity.phone, searchTermLower)
  ) {
    return true;
  }
  if (
    'email' in identity &&
    identity.email &&
    fuzzyMatch(identity.email, searchTermLower)
  ) {
    return true;
  }
  if (
    'contact_person' in identity &&
    identity.contact_person &&
    fuzzyMatch(identity.contact_person, searchTermLower)
  ) {
    return true;
  }
  return false;
};

const matchesPatientField = (
  identity: MasterDataIdentity,
  searchTermLower: string
) => {
  if (
    'gender' in identity &&
    identity.gender &&
    fuzzyMatch(identity.gender, searchTermLower)
  ) {
    return true;
  }
  if (
    'address' in identity &&
    identity.address &&
    fuzzyMatch(identity.address, searchTermLower)
  ) {
    return true;
  }
  if (
    'phone' in identity &&
    identity.phone &&
    fuzzyMatch(identity.phone, searchTermLower)
  ) {
    return true;
  }
  if (
    'email' in identity &&
    identity.email &&
    fuzzyMatch(identity.email, searchTermLower)
  ) {
    return true;
  }
  if (
    'birth_date' in identity &&
    identity.birth_date &&
    fuzzyMatch(identity.birth_date.toString(), searchTermLower)
  ) {
    return true;
  }
  return false;
};

const matchesDoctorField = (
  identity: MasterDataIdentity,
  searchTermLower: string
) => {
  if (
    'specialization' in identity &&
    identity.specialization &&
    fuzzyMatch(identity.specialization, searchTermLower)
  ) {
    return true;
  }
  if (
    'license_number' in identity &&
    identity.license_number &&
    fuzzyMatch(identity.license_number, searchTermLower)
  ) {
    return true;
  }
  if (
    'phone' in identity &&
    identity.phone &&
    fuzzyMatch(identity.phone, searchTermLower)
  ) {
    return true;
  }
  if (
    'email' in identity &&
    identity.email &&
    fuzzyMatch(identity.email, searchTermLower)
  ) {
    return true;
  }
  if (
    'experience_years' in identity &&
    identity.experience_years &&
    fuzzyMatch(identity.experience_years.toString(), searchTermLower)
  ) {
    return true;
  }
  return false;
};

const matchesCustomerField = (
  identity: MasterDataIdentity,
  searchTermLower: string
) => {
  if (
    'phone' in identity &&
    identity.phone &&
    fuzzyMatch(identity.phone, searchTermLower)
  ) {
    return true;
  }
  if (
    'email' in identity &&
    identity.email &&
    fuzzyMatch(identity.email, searchTermLower)
  ) {
    return true;
  }
  if (
    'address' in identity &&
    identity.address &&
    fuzzyMatch(identity.address, searchTermLower)
  ) {
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
    return matchesSupplierField(identity, searchTermLower);
  }
  if (tableName === 'patients') {
    return matchesPatientField(identity, searchTermLower);
  }
  if (tableName === 'doctors') {
    return matchesDoctorField(identity, searchTermLower);
  }
  if (tableName === 'customers') {
    return matchesCustomerField(identity, searchTermLower);
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
