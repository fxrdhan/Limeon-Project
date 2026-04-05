import React, { useState, useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { AlertMessage, AlertItemProps } from '@/types';
import { AlertContext } from './hooks';

const DEFAULT_DURATION = 5000;

const typeStyles: Record<AlertMessage['type'], string> = {
  success: 'border-green-300 bg-green-50 text-green-700',
  error: 'border-red-300 bg-red-50 text-red-700',
  warning: 'border-yellow-300 bg-yellow-50 text-yellow-700',
  info: 'border-blue-300 bg-blue-50 text-blue-700',
  online: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  offline:
    'border-red-600 bg-linear-to-r from-red-500 to-orange-500 text-white',
};

const indicatorStyles: Record<AlertMessage['type'], string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
  online: 'bg-emerald-500',
  offline: 'bg-white',
};

const AlertIndicator = ({
  type,
  icon,
}: {
  type: AlertMessage['type'];
  icon?: ReactNode;
}) => {
  if (icon) {
    return <div className="mt-0.5 shrink-0 text-xl">{icon}</div>;
  }

  return (
    <div className="mt-1 shrink-0">
      <span
        className={`block h-2.5 w-2.5 rounded-full ${indicatorStyles[type]}`}
      />
    </div>
  );
};

const AlertItem = ({
  id,
  message,
  type,
  duration = DEFAULT_DURATION,
  icon,
  persistent = false,
  onClose,
}: AlertItemProps) => {
  useEffect(() => {
    if (persistent) {
      return;
    }

    const timer = window.setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [duration, id, onClose, persistent]);

  return (
    <div
      className={`pointer-events-auto mb-3 flex w-full max-w-md items-start gap-3 rounded-xl border p-4 shadow-lg ${typeStyles[type]}`}
    >
      <AlertIndicator type={type} icon={icon} />
      <div className="grow text-sm break-words">{message}</div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-black/10 focus:outline-hidden focus:ring-2 focus:ring-current"
        aria-label="Tutup notifikasi"
      >
        x
      </button>
    </div>
  );
};

export const AlertProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);

  const addAlert = useCallback(
    (
      message: string,
      type: AlertMessage['type'],
      options: {
        duration?: number;
        icon?: ReactNode;
        persistent?: boolean;
        id?: string;
      } = {}
    ) => {
      const newId =
        options.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newAlert: AlertMessage = { id: newId, message, type, ...options };

      setAlerts(previousAlerts => {
        const existingIndex = options.id
          ? previousAlerts.findIndex(alert => alert.id === options.id)
          : -1;

        if (existingIndex === -1) {
          return [newAlert, ...previousAlerts];
        }

        const updatedAlerts = [...previousAlerts];
        updatedAlerts[existingIndex] = newAlert;
        return updatedAlerts;
      });
    },
    []
  );

  const removeAlert = useCallback((id: string) => {
    setAlerts(previousAlerts =>
      previousAlerts.filter(alert => alert.id !== id)
    );
  }, []);

  useEffect(() => {
    const handleOffline = () => {
      addAlert('Koneksi terputus. Anda sedang offline.', 'offline', {
        persistent: true,
        id: 'network-status',
      });
    };

    const handleOnline = () => {
      removeAlert('network-status');
      addAlert('Koneksi tersambung kembali. Anda sedang online.', 'online', {
        duration: 3000,
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [addAlert, removeAlert]);

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert }}>
      {children}
      {typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed top-5 left-1/2 z-9999 flex w-full max-w-md -translate-x-1/2 flex-col items-center px-4">
              {alerts.map(alert => (
                <AlertItem
                  key={alert.id}
                  {...alert}
                  onClose={() => removeAlert(alert.id)}
                />
              ))}
            </div>,
            document.body
          )
        : null}
    </AlertContext.Provider>
  );
};
