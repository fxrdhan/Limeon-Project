import { createContext } from 'react';
import type { ConfirmDialogContextType } from '@/types';

export type ConfirmDialogState = Omit<
  ConfirmDialogContextType,
  'openConfirmDialog' | 'closeConfirmDialog'
>;

export const initialConfirmDialogState: ConfirmDialogState = {
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Ya',
  cancelText: 'Batal',
  onConfirm: () => {},
  onCancel: () => {},
  variant: 'primary',
};

export const ConfirmDialogContext = createContext<
  ConfirmDialogContextType | undefined
>(undefined);
