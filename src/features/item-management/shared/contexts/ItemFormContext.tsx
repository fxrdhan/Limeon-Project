import React, { createContext, useMemo } from "react";
import type {
  ItemManagementContextValue,
  ItemManagementProviderProps
} from "../types";

// eslint-disable-next-line react-refresh/only-export-components
export const ItemManagementContext = createContext<
  ItemManagementContextValue | undefined
>(undefined);

export const ItemManagementProvider: React.FC<ItemManagementProviderProps> = ({
  children,
  value,
}) => {
  // Memoize context value to prevent unnecessary re-renders
  const memoizedValue = useMemo(() => value, [value]);

  return (
    <ItemManagementContext.Provider value={memoizedValue}>
      {children}
    </ItemManagementContext.Provider>
  );
};
