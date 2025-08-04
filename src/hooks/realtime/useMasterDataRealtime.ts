import { QueryKeys } from '@/constants/queryKeys';
import { useSimpleRealtime } from './useSimpleRealtime';
import { 
  useCategories, 
  useMedicineTypes, 
  useUnits, 
  useItemUnits 
} from '../queries/useMasterData';
import { useDosages } from '../queries/useDosages';
import { useManufacturers } from '../queries/useManufacturers';
import { useItems } from '../queries/useItems';

interface RealtimeOptions {
  enabled?: boolean;
}

// Categories with realtime
export const useCategoriesRealtime = (options?: RealtimeOptions) => {
  const categoriesQuery = useCategories(options);
  
  useSimpleRealtime({
    table: 'item_categories',
    queryKeys: [
      QueryKeys.masterData.categories.all,
      QueryKeys.items.all, // Categories affect items
    ],
    enabled: options?.enabled ?? true, // Default enabled
  });

  return categoriesQuery;
};

// Types with realtime  
export const useMedicineTypesRealtime = (options?: RealtimeOptions) => {
  const typesQuery = useMedicineTypes(options);
  
  useSimpleRealtime({
    table: 'item_types',
    queryKeys: [
      QueryKeys.masterData.types.all,
      QueryKeys.items.all,
    ],
    enabled: options?.enabled ?? true,
  });

  return typesQuery;
};

// Units/Packages with realtime
export const useUnitsRealtime = (options?: RealtimeOptions) => {
  const unitsQuery = useUnits(options);
  
  useSimpleRealtime({
    table: 'item_packages',
    queryKeys: [
      QueryKeys.masterData.units.all,
      QueryKeys.items.all,
    ],
    enabled: options?.enabled ?? true,
  });

  return unitsQuery;
};

// Item Units with realtime
export const useItemUnitsRealtime = (options?: RealtimeOptions) => {
  const itemUnitsQuery = useItemUnits(options);
  
  useSimpleRealtime({
    table: 'item_units',
    queryKeys: [
      QueryKeys.masterData.itemUnits.all,
      QueryKeys.items.all,
    ],
    enabled: options?.enabled ?? true,
  });

  return itemUnitsQuery;
};

// Dosages with realtime
export const useDosagesRealtime = (options?: RealtimeOptions) => {
  const dosagesQuery = useDosages(options);
  
  useSimpleRealtime({
    table: 'item_dosages',
    queryKeys: [
      QueryKeys.masterData.dosages.all,
      QueryKeys.items.all,
    ],
    enabled: options?.enabled ?? true,
  });

  return dosagesQuery;
};

// Manufacturers with realtime
export const useManufacturersRealtime = (options?: RealtimeOptions) => {
  const manufacturersQuery = useManufacturers(options);
  
  useSimpleRealtime({
    table: 'item_manufacturers',
    queryKeys: [
      QueryKeys.masterData.manufacturers.all,
      QueryKeys.items.all,
    ],
    enabled: options?.enabled ?? true,
  });

  return manufacturersQuery;
};

// Items with realtime
export const useItemsRealtime = (options?: RealtimeOptions) => {
  const itemsQuery = useItems(options);
  
  useSimpleRealtime({
    table: 'items',
    queryKeys: [
      QueryKeys.items.all,
    ],
    enabled: options?.enabled ?? true,
  });

  return itemsQuery;
};