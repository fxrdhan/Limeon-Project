import { useContext } from "react";
import type { AlertHook } from "@/types";
import { AlertContext } from "./AlertContext";

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
