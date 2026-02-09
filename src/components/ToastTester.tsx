import React from 'react';
import toast from 'react-hot-toast';
import { config } from '@/config';

const ToastTester: React.FC = () => {
  // Don't render if disabled in config
  if (!config.toast_tester_enabled) {
    return null;
  }

  const toastMessages = [
    { type: 'success', message: 'Item berhasil ditambahkan' },
    { type: 'success', message: 'Item berhasil diperbarui' },
    { type: 'success', message: 'Item berhasil dihapus' },
    { type: 'error', message: 'Gagal menghapus item' },
    { type: 'error', message: 'Gagal menyimpan data item' },
  ];

  const triggerRandomToast = () => {
    const randomIndex = Math.floor(Math.random() * toastMessages.length);
    const { type, message } = toastMessages[randomIndex];

    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  return (
    <button
      onClick={triggerRandomToast}
      className="fixed bottom-4 left-4 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-lg flex items-center gap-2 transition-colors z-50 cursor-pointer border border-blue-500"
      title="Random Toast Tester"
    >
      🎲<span>Trigger Toast</span>
    </button>
  );
};

export default ToastTester;
