import { fuzzyMatch } from '@/utils/search';
import type { Supplier as SupplierType } from '@/types';

const getSupplierSearchScore = (supplier: SupplierType, query: string) => {
  const nameLower = supplier.name?.toLowerCase?.() ?? '';
  const addressLower = supplier.address?.toLowerCase?.() ?? '';
  const phoneLower = supplier.phone?.toLowerCase?.() ?? '';
  const emailLower = supplier.email?.toLowerCase?.() ?? '';
  const contactLower = supplier.contact_person?.toLowerCase?.() ?? '';

  if (nameLower.startsWith(query)) return 5;
  if (nameLower.includes(query)) return 4;
  if (emailLower.includes(query)) return 3;
  if (phoneLower.includes(query)) return 2;
  if (addressLower.includes(query) || contactLower.includes(query)) return 1;
  return 0;
};

export const filterSuppliersForDisplay = (
  suppliersData: SupplierType[],
  supplierSearch: string
) => {
  const query = supplierSearch.trim().toLowerCase();
  if (!query || query.startsWith('#')) return suppliersData;

  return suppliersData
    .filter(supplier => {
      return (
        fuzzyMatch(supplier.name, query) ||
        (supplier.address && fuzzyMatch(supplier.address, query)) ||
        (supplier.phone && fuzzyMatch(supplier.phone, query)) ||
        (supplier.email && fuzzyMatch(supplier.email, query)) ||
        (supplier.contact_person && fuzzyMatch(supplier.contact_person, query))
      );
    })
    .sort((a, b) => {
      const scoreA = getSupplierSearchScore(a, query);
      const scoreB = getSupplierSearchScore(b, query);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.name.localeCompare(b.name);
    });
};
