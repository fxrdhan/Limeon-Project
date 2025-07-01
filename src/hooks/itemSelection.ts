import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { fuzzyMatch, getScore } from "@/utils/search";
import { useSupabaseRealtime } from "@/hooks/supabaseRealtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Item, UnitConversion } from "@/types";

interface UseItemSelectionOptions {
  disableRealtime?: boolean;
}

export const useItemSelection = (options: UseItemSelectionOptions = {}) => {
  const { disableRealtime = false } = options;
  const queryClient = useQueryClient();
  const [searchItem, setSearchItem] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select(
          `
                    id, name, code, barcode, base_price, sell_price, stock, unit_id, base_unit, unit_conversions,
                    item_categories (name),
                    item_types (name),
                    item_units (name)
                `,
        )
        .order("name");

      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedData = (data || []).map((item: any) => {
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
        return {
          ...item,
          category: { name: item.item_categories?.name || "" },
          type: { name: item.item_types?.name || "" },
          unit: { name: item.item_units?.name || "" },
          unit_conversions: parsedConversions,
        };
      });
      return mappedData as Item[];
    } catch (error) {
      console.error("Error fetching items:", error);
      return [];
    }
  }, []);

  // Use React Query for consistent caching with item-list page
  const { data: items = [], refetch: refetchQuery } = useQuery({
    queryKey: ["items"], // Use same base key as masterData
    queryFn: fetchItems,
    staleTime: 30 * 1000,
    refetchOnMount: true,
  });

  const getItemByID = (itemId: string): Item | undefined => {
    const item = items.find((item) => item.id === itemId);
    if (item) {
      if (typeof item.unit_conversions === "string") {
        try {
          item.unit_conversions = JSON.parse(item.unit_conversions || "[]");
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          item.unit_conversions = [];
        }
      }
      item.unit_conversions = item.unit_conversions || [];
    }
    return item;
  };

  const filteredItems = items
    .filter((item) => {
      const searchTermLower = searchItem.toLowerCase();
      if (searchTermLower === "") return true;
      return (
        fuzzyMatch(item.name, searchTermLower) ||
        (item.code && fuzzyMatch(item.code, searchTermLower)) ||
        (item.barcode && fuzzyMatch(item.barcode, searchTermLower))
      );
    })
    .sort((a, b) => {
      const searchTermLower = searchItem.toLowerCase();
      if (searchTermLower === "") return 0;

      const scoreA = getScore(a, searchTermLower);
      const scoreB = getScore(b, searchTermLower);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      return a.name.localeCompare(b.name);
    });

  // Add realtime subscription for items
  useSupabaseRealtime("items", ["items"], {
    enabled: !disableRealtime,
    onRealtimeEvent: (payload) => {
      console.log("🔥 ITEM SELECTION - Realtime event received:", payload.eventType, payload);
      // Invalidate React Query cache when realtime events occur
      queryClient.invalidateQueries({ queryKey: ["items"] });
      console.log("🔥 ITEM SELECTION - Cache invalidated for items");
    },
    showDiffInConsole: true,
    detailedLogging: true,
  });

  const refetchItems = useCallback(() => {
    refetchQuery();
  }, [refetchQuery]);

  return {
    items,
    searchItem,
    setSearchItem,
    showItemDropdown,
    setShowItemDropdown,
    selectedItem,
    setSelectedItem,
    filteredItems,
    getItemByID,
    refetchItems,
  };
};
