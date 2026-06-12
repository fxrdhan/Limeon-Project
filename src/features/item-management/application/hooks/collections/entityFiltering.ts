import { filterAndRank } from '../data/searchCore';
import { fuzzyMatch } from '@/utils/search';

interface EntityFilterItem {
  name: string;
  code?: unknown;
  description?: unknown;
  address?: unknown;
  nci_code?: unknown;
  abbreviation?: unknown;
}

const matchesOptionalStringField = <T extends EntityFilterItem>(
  entity: T,
  field: keyof EntityFilterItem,
  searchTermLower: string
) => {
  const value = entity[field];
  return typeof value === 'string' && fuzzyMatch(value, searchTermLower);
};

const matchesEntity = <T extends EntityFilterItem>(
  entity: T,
  searchTermLower: string
) => {
  if (
    typeof entity.code === 'string' &&
    fuzzyMatch(entity.code.toLowerCase(), searchTermLower)
  ) {
    return true;
  }

  if (entity.name && fuzzyMatch(entity.name, searchTermLower)) {
    return true;
  }

  return (
    matchesOptionalStringField(entity, 'description', searchTermLower) ||
    matchesOptionalStringField(entity, 'address', searchTermLower) ||
    matchesOptionalStringField(entity, 'nci_code', searchTermLower) ||
    matchesOptionalStringField(entity, 'abbreviation', searchTermLower)
  );
};

const scoreEntity = <T extends EntityFilterItem>(
  entity: T,
  searchTermLower: string
) => {
  if (
    typeof entity.code === 'string' &&
    entity.code.toLowerCase().startsWith(searchTermLower)
  ) {
    return 5;
  }
  if (
    typeof entity.code === 'string' &&
    entity.code.toLowerCase().includes(searchTermLower)
  ) {
    return 4;
  }
  if (entity.name && entity.name.toLowerCase().startsWith(searchTermLower)) {
    return 3;
  }
  if (entity.name && entity.name.toLowerCase().includes(searchTermLower)) {
    return 2;
  }
  if (entity.name && fuzzyMatch(entity.name, searchTermLower)) {
    return 1;
  }
  return 0;
};

const compareEntity = <T extends EntityFilterItem>(a: T, b: T) => {
  if (typeof a.code === 'string' && typeof b.code === 'string') {
    return a.code.localeCompare(b.code);
  }
  return a.name.localeCompare(b.name);
};

export const filterEntityData = <T extends EntityFilterItem>({
  data,
  searchTerm,
}: {
  data: T[];
  searchTerm: string;
}): T[] => {
  if (!searchTerm) {
    return data;
  }

  return filterAndRank<T>({
    data,
    searchTerm,
    matcher: matchesEntity,
    scorer: scoreEntity,
    tieBreaker: compareEntity,
  });
};
