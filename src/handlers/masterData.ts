import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useConfirmDialog } from "@/components/dialog-box";
import { fuzzyMatch, getScore } from "@/utils/search";
import { useSupabaseRealtime } from "@/hooks/supabaseRealtime";
import { useAlert } from "@/components/alert/hooks";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type {
  Category,
  ItemType,
  Unit,
  Item,
  Supplier,
  UnitConversion,
  UnitData,
  DBItem,
  RawUnitConversion,
  UseMasterDataManagementOptions,
} from "@/types";

type MasterDataItem = Category | ItemType | Unit | Item | Supplier;

export const useMasterDataManagement = (
  tableName: string,
  entityNameLabel: string,
  options?: UseMasterDataManagementOptions,
) => {
  const { openConfirmDialog } = useConfirmDialog();
  const queryClient = useQueryClient();
  const alert = useAlert();

  const { realtime = false, isCustomModalOpen } = options || {};

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const actualIsModalOpen =
    isCustomModalOpen ?? (isAddModalOpen || isEditModalOpen);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isEditModalOpen && editingItem) {
      timer = setTimeout(() => {
        setEditingItem(null);
      }, 300);
    }
    return () => clearTimeout(timer);
  }, [editingItem, isEditModalOpen]);

  const fetchData = async (page: number, searchTerm: string, limit: number) => {
    const from = (page - 1) * limit;

    if (tableName === "items") {
      const to = from + limit - 1;
      const itemsQuery = supabase.from("items").select(`
                id,
                name,
                manufacturer,
                code,
                barcode,
                base_price,
                sell_price,
                stock,
                unit_conversions,
                category_id,
                type_id,
                unit_id,
                item_categories (name),
                item_types (name),
                item_units (name)
            `);

      const countQuery = supabase.from("items").select("id", { count: "exact" });

      // Don't filter at Supabase level - let local filtering handle comprehensive search
      // This ensures we get all data and can search across all fields including relations
      console.log(
        "🔍 SUPABASE QUERY - Fetching all data for local filtering. Search term:",
        searchTerm || "none",
      );

      const [itemsResult, countResult, allUnitsForConversionRes] =
        await Promise.all([
          itemsQuery.order("name").range(from, to),
          countQuery,
          supabase.from("item_units").select("id, name"),
        ]);

      if (itemsResult.error) {
        console.error("🔍 SUPABASE QUERY - Error:", itemsResult.error);
        throw itemsResult.error;
      }
      if (countResult.error) throw countResult.error;
      if (allUnitsForConversionRes.error) throw allUnitsForConversionRes.error;

      console.log(
        "🔍 SUPABASE QUERY - Raw results:",
        itemsResult.data?.length || 0,
        "items",
      );
      console.log(
        "🔍 SUPABASE QUERY - Sample raw item:",
        itemsResult.data?.[0],
      );

      const allUnitsForConversion: UnitData[] =
        allUnitsForConversionRes.data || [];

      const completedData = (itemsResult.data || []).map((item: DBItem) => {
        let parsedConversions: UnitConversion[] = [];
        if (typeof item.unit_conversions === "string") {
          try {
            parsedConversions = JSON.parse(item.unit_conversions || "[]");
          } catch (e) {
            console.error(
              "Error parsing unit_conversions for item:",
              item.id,
              e,
            );
          }
        } else if (Array.isArray(item.unit_conversions)) {
          parsedConversions = item.unit_conversions;
        }

        const mappedConversions: UnitConversion[] = parsedConversions.map(
          (conv: RawUnitConversion) => {
            const unitDetail = allUnitsForConversion.find(
              (u) => u.name === conv.unit_name,
            );
            return {
              id: conv.id || Date.now().toString() + Math.random(),
              conversion_rate: conv.conversion_rate || conv.conversion || 0,
              unit_name: conv.unit_name || "Unknown",
              to_unit_id: unitDetail ? unitDetail.id : "",
              unit: unitDetail
                ? { id: unitDetail.id, name: unitDetail.name }
                : { id: "", name: conv.unit_name || "Unknown Unit" },
              conversion: conv.conversion_rate || conv.conversion || 0,
              basePrice: conv.basePrice ?? 0,
              sellPrice: conv.sellPrice ?? 0,
            };
          },
        );

        const getName = (
          field: { name: string }[] | { name: string } | null | undefined,
        ): string => {
          if (!field) return "";
          if (Array.isArray(field)) {
            return field.length > 0 && field[0]?.name ? field[0].name : "";
          }
          return field.name || "";
        };

        return {
          id: item.id,
          name: item.name,
          manufacturer: item.manufacturer,
          code: item.code,
          barcode: item.barcode,
          base_price: item.base_price,
          sell_price: item.sell_price,
          stock: item.stock,
          unit_conversions: mappedConversions,
          category: { name: getName(item.item_categories) },
          type: { name: getName(item.item_types) },
          unit: { name: getName(item.item_units) },
        } as Item;
      });

      let filteredData = completedData;
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        console.log("🔍 LOCAL FILTERING - Search term:", searchTermLower);
        console.log(
          "🔍 LOCAL FILTERING - Raw data from Supabase:",
          completedData.length,
          "items",
        );
        console.log("🔍 LOCAL FILTERING - Sample item:", completedData[0]);

        if (Array.isArray(completedData)) {
          filteredData = completedData
            .filter((item) => {
              const matches =
                fuzzyMatch(item.name, searchTermLower) ||
                (item.code && fuzzyMatch(item.code, searchTermLower)) ||
                (item.barcode && fuzzyMatch(item.barcode, searchTermLower)) ||
                (item.category?.name &&
                  fuzzyMatch(item.category.name, searchTermLower)) ||
                (item.type?.name &&
                  fuzzyMatch(item.type.name, searchTermLower)) ||
                (item.unit?.name &&
                  fuzzyMatch(item.unit.name, searchTermLower)) ||
                (item.base_price &&
                  fuzzyMatch(item.base_price.toString(), searchTermLower)) ||
                (item.sell_price &&
                  fuzzyMatch(item.sell_price.toString(), searchTermLower)) ||
                (item.stock &&
                  fuzzyMatch(item.stock.toString(), searchTermLower)) ||
                (item.unit_conversions &&
                  item.unit_conversions.some(
                    (uc) =>
                      uc.unit?.name &&
                      fuzzyMatch(uc.unit.name, searchTermLower),
                  ));

              if (matches && searchTermLower.includes("analgesik")) {
                console.log("🎯 LOCAL FILTERING - Found match:", {
                  name: item.name,
                  category: item.category?.name,
                  type: item.type?.name,
                  unit: item.unit?.name,
                });
              }

              return matches;
            })
            .sort((a, b) => {
              const scoreA = getScore(a, searchTermLower);
              const scoreB = getScore(b, searchTermLower);
              if (scoreA !== scoreB) return scoreB - scoreA;
              return a.name.localeCompare(b.name);
            });

          console.log(
            "🔍 LOCAL FILTERING - Filtered results:",
            filteredData.length,
            "items",
          );
        } else {
          filteredData = [];
        }
      }

      // When searching, return the filtered count, not the total DB count
      const finalCount = searchTerm
        ? filteredData.length
        : countResult.count || 0;
      return { data: filteredData, totalItems: finalCount };
    } else {
      const to = from + limit - 1;
      let query = supabase.from(tableName).select("*", { count: "exact" });

      if (searchTerm) {
        const fuzzySearchPattern = `%${searchTerm
          .toLowerCase()
          .split("")
          .join("%")}%`;
        if (
          tableName === "item_categories" ||
          tableName === "item_types" ||
          tableName === "item_units"
        ) {
          query = query.or(
            `name.ilike.${fuzzySearchPattern},description.ilike.${fuzzySearchPattern}`,
          );
        } else {
          query = query.ilike("name", fuzzySearchPattern);
        }
      }

      // Always use pagination, whether searching or not
      const { data, error, count } = await query.order("name").range(from, to);

      if (error) {
        console.error(`Error fetching data for ${tableName}:`, error);
        throw error;
      }

      let processedData = (data || []) as MasterDataItem[];

      if (searchTerm && processedData.length > 0) {
        const searchTermLower = searchTerm.toLowerCase();
        processedData = processedData
          .filter((item) => {
            if (item.name && fuzzyMatch(item.name, searchTermLower))
              return true;
            if (
              "description" in item &&
              item.description &&
              fuzzyMatch(item.description, searchTermLower)
            )
              return true;
            if (tableName === "suppliers") {
              const supplier = item as Supplier;
              if (
                supplier.address &&
                fuzzyMatch(supplier.address, searchTermLower)
              )
                return true;
              if (supplier.phone && fuzzyMatch(supplier.phone, searchTermLower))
                return true;
              if (supplier.email && fuzzyMatch(supplier.email, searchTermLower))
                return true;
              if (
                supplier.contact_person &&
                fuzzyMatch(supplier.contact_person, searchTermLower)
              )
                return true;
            }
            return false;
          })
          .sort((a, b) => {
            const nameScore = (itemToSort: MasterDataItem) => {
              if (
                itemToSort.name &&
                itemToSort.name.toLowerCase().startsWith(searchTermLower)
              )
                return 3;
              if (
                itemToSort.name &&
                itemToSort.name.toLowerCase().includes(searchTermLower)
              )
                return 2;
              if (
                itemToSort.name &&
                fuzzyMatch(itemToSort.name, searchTermLower)
              )
                return 1;
              return 0;
            };
            const scoreA = nameScore(a);
            const scoreB = nameScore(b);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return a.name.localeCompare(b.name);
          });
      }
      return { data: processedData, totalItems: count || 0 };
    }
  };

  const {
    data: queryData,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: [tableName, currentPage, itemsPerPage, debouncedSearch],
    queryFn: () => fetchData(currentPage, debouncedSearch, itemsPerPage),
    placeholderData: keepPreviousData,
    staleTime: 0, // Always consider data stale for instant updates
    gcTime: 5 * 60 * 1000, // Keep cache for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: false,
  });

  const currentData = useMemo(() => queryData?.data || [], [queryData?.data]);
  const totalItems = queryData?.totalItems || 0;
  const queryError = error instanceof Error ? error : null;

  const addMutation = useMutation({
    mutationFn: async (newItem: { name: string; description?: string }) => {
      const { error } = await supabase.from(tableName).insert(newItem);
      if (error) throw error;
    },
    onSuccess: () => {
      // Immediate cache invalidation and refetch
      queryClient.invalidateQueries({ queryKey: [tableName] });
      queryClient.refetchQueries({
        queryKey: [tableName],
        type: "active",
      });
      setIsAddModalOpen(false);
    },
    onError: (error: Error) => {
      alert.error(`Gagal menambahkan ${entityNameLabel}: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedItem: {
      id: string;
      name: string;
      description?: string;
    }) => {
      const { id, ...updateData } = updatedItem;
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      // Immediate cache invalidation and refetch
      queryClient.invalidateQueries({ queryKey: [tableName] });
      queryClient.refetchQueries({
        queryKey: [tableName],
        type: "active",
      });
      setIsEditModalOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => {
      alert.error(`Gagal memperbarui ${entityNameLabel}: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Immediate cache invalidation and refetch
      queryClient.invalidateQueries({ queryKey: [tableName] });
      queryClient.refetchQueries({
        queryKey: [tableName],
        type: "active",
      });
      setIsEditModalOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => {
      alert.error(`Gagal menghapus ${entityNameLabel}: ${error.message}`);
    },
  });

  const handleEdit = useCallback((item: MasterDataItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  }, []);

  const handleModalSubmit = useCallback(
    async (itemData: { id?: string; name: string; description?: string }) => {
      if (itemData.id) {
        await updateMutation.mutateAsync(
          itemData as { id: string; name: string; description?: string },
        );
      } else {
        await addMutation.mutateAsync(itemData);
      }
    },
    [addMutation, updateMutation],
  );

  const handlePageChange = (newPage: number) => setCurrentPage(newPage);
  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();

        if (currentData.length > 0) {
          const firstItem = currentData[0] as MasterDataItem;
          handleEdit(firstItem);
        } else if (debouncedSearch.trim() !== "") {
          setIsAddModalOpen(true);
        }
      }
    },
    [currentData, handleEdit, debouncedSearch],
  );

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Only enable realtime if explicitly requested and not already handled by parent component
  useSupabaseRealtime(tableName, null, {
    enabled: realtime && !actualIsModalOpen,
    debounceMs: 0, // Instant updates for better responsiveness
    onRealtimeEvent: async (payload) => {
      console.log(
        `🔥 MASTER DATA (${tableName}) - Realtime event received:`,
        payload.eventType,
        payload,
      );
      console.log(
        `🔥 MASTER DATA (${tableName}) - Immediate cache invalidation and refetch`,
      );

      // Immediate cache invalidation for all queries of this table
      await queryClient.invalidateQueries({ queryKey: [tableName] });

      // Force immediate refetch for maximum responsiveness
      queryClient
        .refetchQueries({
          queryKey: [tableName],
          type: "active",
        })
        .then(() => {
          console.log(
            `🔥 MASTER DATA (${tableName}) - Data refreshed successfully`,
          );
        })
        .catch((error) => {
          console.error(
            `❌ MASTER DATA (${tableName}) - Error refreshing data:`,
            error,
          );
        });
    },
    showDiffInConsole: true,
    detailedLogging: true,
  });

  return {
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    editingItem,
    setEditingItem,
    search,
    setSearch,
    debouncedSearch,
    setDebouncedSearch,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    data: currentData,
    totalItems,
    totalPages,
    isLoading,
    isError,
    queryError,
    isFetching,
    addMutation,
    updateMutation,
    deleteMutation,
    handleEdit,
    handleModalSubmit,
    handlePageChange,
    handleItemsPerPageChange,
    handleKeyDown,
    openConfirmDialog,
    queryClient,
  };
};
