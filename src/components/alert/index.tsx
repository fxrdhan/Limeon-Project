import React, { useState, useCallback, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  TbAlertCircle,
  TbAlertTriangle,
  TbCircleCheck,
  TbInfoCircle,
  TbWifi,
  TbX,
} from 'react-icons/tb';
import classNames from 'classnames';
import type { AlertMessage, AlertItemProps } from '@/types';
import { AlertContext } from './hooks';

const DEFAULT_DURATION = 5000; // 5 detik

const typeIcons: Record<AlertMessage['type'], ReactNode> = {
  success: <TbCircleCheck className="text-green-500" />,
  error: <TbAlertCircle className="text-red-500" />,
  warning: <TbAlertTriangle className="text-yellow-500" />,
  info: <TbInfoCircle className="text-blue-500" />,
  online: <TbWifi className="text-green-500" />,
  offline: <TbWifi className="text-white" />,
};

const typeStyles: Record<AlertMessage['type'], string> = {
  success: 'bg-green-50 border-green-300 text-green-700',
  error: 'bg-red-50 border-red-300 text-red-700',
  warning: 'bg-yellow-50 border-yellow-300 text-yellow-700',
  info: 'bg-blue-50 border-blue-300 text-blue-700',
  online: 'bg-green-50 border-green-300 text-green-800',
  offline:
    'bg-linear-to-r from-red-500 to-orange-500 text-white border-red-600 animate-pulse',
};

const AlertItem: React.FC<AlertItemProps> = ({
  id,
  message,
  type,
  duration = DEFAULT_DURATION,
  icon,
  persistent = false,
  onClose,
}) => {
  useEffect(() => {
    if (persistent) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose, persistent]);

  const alertIcon = icon || typeIcons[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        duration: 0.3,
      }}
      className={classNames(
        'relative flex items-start p-4 mb-3 rounded-lg shadow-lg border w-full max-w-md overflow-hidden',
        typeStyles[type]
      )}
    >
      <div className="shrink-0 mr-3 mt-0.5 text-xl">{alertIcon}</div>
      <div className="grow text-sm break-words">{message}</div>
      <button
        onClick={onClose}
        className="ml-4 p-1 rounded-md hover:bg-black/10 focus:outline-hidden focus:ring-2 focus:ring-current transition-colors text-inherit"
        aria-label="Tutup notifikasi"
      >
        <TbX size={14} />
      </button>
    </motion.div>
  );
};

export const AlertProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);

  useEffect(() => {
    const handleOffline = () => {
      addAlert('Koneksi terputus. Anda sedang offline.', 'offline', {
        persistent: true,
        id: 'network-status',
      });
    };

    const handleOnline = () => {
      // First, remove the persistent offline alert
      removeAlert('network-status');
      // Then, show a temporary online notification
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      setAlerts(prevAlerts => {
        const existingIndex = options.id
          ? prevAlerts.findIndex(a => a.id === options.id)
          : -1;
        if (existingIndex > -1) {
          const updatedAlerts = [...prevAlerts];
          updatedAlerts[existingIndex] = newAlert;
          return updatedAlerts;
        }
        return [newAlert, ...prevAlerts];
      });
    },
    []
  );

  const removeAlert = useCallback((id: string) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
  }, []);

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-9999 flex flex-col items-center space-y-2 w-full max-w-md px-4 pointer-events-none">
            <AnimatePresence initial={false}>
              {alerts.map(alert => (
                <div key={alert.id} className="pointer-events-auto w-full">
                  <AlertItem {...alert} onClose={() => removeAlert(alert.id)} />
                </div>
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </AlertContext.Provider>
  );
};
