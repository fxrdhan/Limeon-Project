import React from "react";

// Alert system types
export type AlertType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "offline"
  | "online";

export interface AlertMessage {
  id: string;
  message: string;
  type: AlertType;
  duration?: number;
  persistent?: boolean;
  icon?: React.ReactNode;
}

export interface AlertContextType {
  alerts: AlertMessage[];
  addAlert: (
    message: string,
    type: AlertType,
    options?: { duration?: number; icon?: React.ReactNode },
  ) => void;
  removeAlert: (id: string) => void;
}

export interface AlertItemProps extends AlertMessage {
  onClose: () => void;
}

export interface AlertHook {
  success: (
    message: string,
    options?: { duration?: number; icon?: React.ReactNode },
  ) => void;
  error: (
    message: string,
    options?: { duration?: number; icon?: React.ReactNode },
  ) => void;
  warning: (
    message: string,
    options?: { duration?: number; icon?: React.ReactNode },
  ) => void;
  info: (
    message: string,
    options?: { duration?: number; icon?: React.ReactNode },
  ) => void;
}