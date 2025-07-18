import { useContext, createContext } from "react";
import type { AlertHook, AlertContextType } from "@/types";

export const AlertContext = createContext<AlertContextType | undefined>(
  undefined,
);

export const useAlert = (): AlertHook => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert harus digunakan di dalam AlertProvider");
  }

  const { addAlert } = context;

  return {
    success: (message, options) => addAlert(message, "success", options),
    error: (message, options) => addAlert(message, "error", options),
    warning: (message, options) => addAlert(message, "warning", options),
    info: (message, options) => addAlert(message, "info", options),
  };
};
