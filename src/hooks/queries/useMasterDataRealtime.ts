import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';
import {
  useCategories,
  useMedicineTypes,
  useUnits,
  useItems,
} from '@/hooks/queries';
import type {
  Category,
  MedicineType,
  Unit,
  Item,
  ItemManufacturer,
} from '@/types/database';
import type { ItemDosage } from '@/features/item-management/domain/entities/Item';
import { useQuery } from '@tanstack/react-query';

interface UseMasterDataRealtimeOptions {
  enabled?: boolean;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
}

// Categories Realtime Hook
export const useCategoriesRealtime = (
  options?: UseMasterDataRealtimeOptions
) => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );

  const categoriesQuery = useCategories(options);

  useEffect(() => {
    // Always clean up existing subscription first
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Only set up new subscription if enabled
    if (options?.enabled === false) return;

    const channel = supabase
      .channel('realtime-categories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_categories',
        },
        (payload: { eventType: string; new?: unknown; old?: unknown }) => {
          console.log('🔔 Categories realtime change detected:', payload);

          switch (payload.eventType) {
            case 'INSERT': {
              console.log('➕ New category inserted:', payload.new);
              const insertKeysToInvalidate =
                getInvalidationKeys.masterData.categories();
              insertKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            case 'UPDATE': {
              console.log('✏️ Category updated:', payload.new);
              const updatedCategory = payload.new as Category;

              queryClient.setQueryData(
                QueryKeys.masterData.categories.detail(updatedCategory.id),
                updatedCategory
              );

              const updateKeysToInvalidate =
                getInvalidationKeys.masterData.categories();
              updateKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            case 'DELETE': {
              console.log('🗑️ Category deleted:', payload.old);
              const deletedCategory = payload.old as Category;

              queryClient.removeQueries({
                queryKey: QueryKeys.masterData.categories.detail(
                  deletedCategory.id
                ),
              });

              const deleteKeysToInvalidate =
                getInvalidationKeys.masterData.categories();
              deleteKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            default:
              console.log('🔄 Unknown category event type:', payload.eventType);
          }
        }
      )
      .subscribe(status => {
        console.log('📡 Categories realtime subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up categories realtime subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [options?.enabled, queryClient]);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        console.log(
          '🧹 Component unmounting - cleaning up categories realtime subscription'
        );
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);

  return categoriesQuery;
};

// Medicine Types Realtime Hook
export const useMedicineTypesRealtime = (
  options?: UseMasterDataRealtimeOptions
) => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );

  const typesQuery = useMedicineTypes(options);

  useEffect(() => {
    // Always clean up existing subscription first
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Only set up new subscription if enabled
    if (options?.enabled === false) return;

    const channel = supabase
      .channel('realtime-types')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_types',
        },
        (payload: { eventType: string; new?: unknown; old?: unknown }) => {
          console.log('🔔 Types realtime change detected:', payload);

          switch (payload.eventType) {
            case 'INSERT': {
              console.log('➕ New type inserted:', payload.new);
              const insertKeysToInvalidate =
                getInvalidationKeys.masterData.types();
              insertKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            case 'UPDATE': {
              console.log('✏️ Type updated:', payload.new);
              const updatedType = payload.new as MedicineType;

              queryClient.setQueryData(
                QueryKeys.masterData.types.detail(updatedType.id),
                updatedType
              );

              const updateKeysToInvalidate =
                getInvalidationKeys.masterData.types();
              updateKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            case 'DELETE': {
              console.log('🗑️ Type deleted:', payload.old);
              const deletedType = payload.old as MedicineType;

              queryClient.removeQueries({
                queryKey: QueryKeys.masterData.types.detail(deletedType.id),
              });

              const deleteKeysToInvalidate =
                getInvalidationKeys.masterData.types();
              deleteKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            default:
              console.log('🔄 Unknown type event type:', payload.eventType);
          }
        }
      )
      .subscribe(status => {
        console.log('📡 Types realtime subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up types realtime subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [options?.enabled, queryClient]);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        console.log(
          '🧹 Component unmounting - cleaning up types realtime subscription'
        );
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);

  return typesQuery;
};

// Units Realtime Hook
export const useUnitsRealtime = (options?: UseMasterDataRealtimeOptions) => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );

  const unitsQuery = useUnits(options);

  useEffect(() => {
    // Always clean up existing subscription first
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Only set up new subscription if enabled
    if (options?.enabled === false) return;

    const channel = supabase
      .channel('realtime-units')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_units',
        },
        (payload: { eventType: string; new?: unknown; old?: unknown }) => {
          console.log('🔔 Units realtime change detected:', payload);

          switch (payload.eventType) {
            case 'INSERT': {
              console.log('➕ New unit inserted:', payload.new);
              const insertKeysToInvalidate =
                getInvalidationKeys.masterData.units();
              insertKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            case 'UPDATE': {
              console.log('✏️ Unit updated:', payload.new);
              const updatedUnit = payload.new as Unit;

              queryClient.setQueryData(
                QueryKeys.masterData.units.detail(updatedUnit.id),
                updatedUnit
              );

              const updateKeysToInvalidate =
                getInvalidationKeys.masterData.units();
              updateKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            case 'DELETE': {
              console.log('🗑️ Unit deleted:', payload.old);
              const deletedUnit = payload.old as Unit;

              queryClient.removeQueries({
                queryKey: QueryKeys.masterData.units.detail(deletedUnit.id),
              });

              const deleteKeysToInvalidate =
                getInvalidationKeys.masterData.units();
              deleteKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            default:
              console.log('🔄 Unknown unit event type:', payload.eventType);
          }
        }
      )
      .subscribe(status => {
        console.log('📡 Units realtime subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up units realtime subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [options?.enabled, queryClient]);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        console.log(
          '🧹 Component unmounting - cleaning up units realtime subscription'
        );
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);

  return unitsQuery;
};

// Enhanced Items Realtime Hook with conditional enabling
export const useItemsRealtime = (options?: UseMasterDataRealtimeOptions) => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );

  const itemsQuery = useItems(options);

  useEffect(() => {
    // Always clean up existing subscription first
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Only set up new subscription if enabled
    if (options?.enabled === false) return;

    const channel = supabase
      .channel('realtime-items')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
        },
        (payload: { eventType: string; new?: unknown; old?: unknown }) => {
          console.log('🔔 Items realtime change detected:', payload);

          switch (payload.eventType) {
            case 'INSERT': {
              console.log('➕ New item inserted:', payload.new);
              const insertKeysToInvalidate = getInvalidationKeys.items.all();
              insertKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            case 'UPDATE': {
              console.log('✏️ Item updated:', payload.new);
              const updatedItem = payload.new as Item;

              queryClient.setQueryData(
                QueryKeys.items.detail(updatedItem.id),
                updatedItem
              );

              const updateKeysToInvalidate = getInvalidationKeys.items.all();
              updateKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            case 'DELETE': {
              console.log('🗑️ Item deleted:', payload.old);
              const deletedItem = payload.old as Item;

              queryClient.removeQueries({
                queryKey: QueryKeys.items.detail(deletedItem.id),
              });

              const deleteKeysToInvalidate = getInvalidationKeys.items.all();
              deleteKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            default:
              console.log('🔄 Unknown item event type:', payload.eventType);
          }
        }
      )
      .subscribe(status => {
        console.log('📡 Items realtime subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up items realtime subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [options?.enabled, queryClient]);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        console.log(
          '🧹 Component unmounting - cleaning up items realtime subscription'
        );
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);

  return itemsQuery;
};

// Dosages Realtime Hook
export const useDosagesRealtime = (options?: UseMasterDataRealtimeOptions) => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );

  // Base query for dosages
  const dosagesQuery = useQuery<ItemDosage[]>({
    queryKey: QueryKeys.masterData.dosages.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_dosages')
        .select('id, kode, name, description, created_at, updated_at')
        .order('kode');

      if (error) throw error;
      return data || [];
    },
    enabled: options?.enabled ?? true,
  });

  useEffect(() => {
    // Always clean up existing subscription first
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Only set up new subscription if enabled
    if (options?.enabled === false) return;

    const channel = supabase
      .channel('realtime-dosages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_dosages',
        },
        (payload: { eventType: string; new?: unknown; old?: unknown }) => {
          console.log('🔔 Dosages realtime change detected:', payload);

          switch (payload.eventType) {
            case 'INSERT': {
              console.log('➕ New dosage inserted:', payload.new);
              const insertKeysToInvalidate =
                getInvalidationKeys.masterData.dosages();
              insertKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            case 'UPDATE': {
              console.log('✏️ Dosage updated:', payload.new);
              const updatedDosage = payload.new as ItemDosage;

              queryClient.setQueryData(
                QueryKeys.masterData.dosages.detail(updatedDosage.id),
                updatedDosage
              );

              const updateKeysToInvalidate =
                getInvalidationKeys.masterData.dosages();
              updateKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            case 'DELETE': {
              console.log('🗑️ Dosage deleted:', payload.old);
              const deletedDosage = payload.old as ItemDosage;

              queryClient.removeQueries({
                queryKey: QueryKeys.masterData.dosages.detail(deletedDosage.id),
              });

              const deleteKeysToInvalidate =
                getInvalidationKeys.masterData.dosages();
              deleteKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            default:
              console.log('🔄 Unknown dosage event type:', payload.eventType);
          }
        }
      )
      .subscribe(status => {
        console.log('📡 Dosages realtime subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up dosages realtime subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [options?.enabled, queryClient]);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        console.log(
          '🧹 Component unmounting - cleaning up dosages realtime subscription'
        );
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);

  return dosagesQuery;
};

// Manufacturers Realtime Hook
export const useManufacturersRealtime = (
  options?: UseMasterDataRealtimeOptions
) => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );

  // Base query for manufacturers
  const manufacturersQuery = useQuery<ItemManufacturer[]>({
    queryKey: QueryKeys.masterData.manufacturers?.list() || [
      'manufacturers',
      'list',
    ],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_manufacturers')
        .select('id, kode, name, address, created_at, updated_at')
        .order('kode');

      if (error) throw error;
      return data || [];
    },
    enabled: options?.enabled ?? true,
  });

  useEffect(() => {
    // Always clean up existing subscription first
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Only set up new subscription if enabled
    if (options?.enabled === false) return;

    const channel = supabase
      .channel('realtime-manufacturers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_manufacturers',
        },
        (payload: { eventType: string; new?: unknown; old?: unknown }) => {
          console.log('🔔 Manufacturers realtime change detected:', payload);

          switch (payload.eventType) {
            case 'INSERT': {
              console.log('➕ New manufacturer inserted:', payload.new);
              const insertKeysToInvalidate =
                getInvalidationKeys.masterData.manufacturers?.() || [
                  ['manufacturers'],
                ];
              insertKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            case 'UPDATE': {
              console.log('✏️ Manufacturer updated:', payload.new);
              const updatedManufacturer = payload.new as ItemManufacturer;

              queryClient.setQueryData(
                QueryKeys.masterData.manufacturers?.detail(
                  updatedManufacturer.id
                ) || ['manufacturers', 'detail', updatedManufacturer.id],
                updatedManufacturer
              );

              const updateKeysToInvalidate =
                getInvalidationKeys.masterData.manufacturers?.() || [
                  ['manufacturers'],
                ];
              updateKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            case 'DELETE': {
              console.log('🗑️ Manufacturer deleted:', payload.old);
              const deletedManufacturer = payload.old as ItemManufacturer;

              queryClient.removeQueries({
                queryKey: QueryKeys.masterData.manufacturers?.detail(
                  deletedManufacturer.id
                ) || ['manufacturers', 'detail', deletedManufacturer.id],
              });

              const deleteKeysToInvalidate =
                getInvalidationKeys.masterData.manufacturers?.() || [
                  ['manufacturers'],
                ];
              deleteKeysToInvalidate.forEach((keySet: readonly string[]) => {
                queryClient.invalidateQueries({ queryKey: keySet });
              });
              break;
            }

            default:
              console.log(
                '🔄 Unknown manufacturer event type:',
                payload.eventType
              );
          }
        }
      )
      .subscribe(status => {
        console.log('📡 Manufacturers realtime subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up manufacturers realtime subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [options?.enabled, queryClient]);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        console.log(
          '🧹 Component unmounting - cleaning up manufacturers realtime subscription'
        );
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);

  return manufacturersQuery;
};
