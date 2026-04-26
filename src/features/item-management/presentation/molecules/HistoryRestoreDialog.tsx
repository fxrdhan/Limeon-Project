import React, { Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Transition, TransitionChild } from '@headlessui/react';
import Button from '@/components/button';
import { TbAlertTriangle, TbArrowBackUp, TbClock } from 'react-icons/tb';

export type RestoreMode = 'soft' | 'hard';

interface HistoryRestoreDialogProps {
  isOpen: boolean;
  targetVersion: number | null;
  restoreMode: RestoreMode;
  isRestoring: boolean;
  onRestoreModeChange: (mode: RestoreMode) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const HistoryRestoreDialog: React.FC<HistoryRestoreDialogProps> = ({
  isOpen,
  targetVersion,
  restoreMode,
  isRestoring,
  onRestoreModeChange,
  onCancel,
  onConfirm,
}) => {
  return createPortal(
    <Transition show={isOpen} as={Fragment}>
      <div className="fixed inset-0 z-[10070] flex items-center justify-center overflow-y-auto">
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
            aria-hidden="true"
          />
        </TransitionChild>

        <TransitionChild
          as={Fragment}
          enter="transition-all duration-300 ease-out"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="transition-all duration-200 ease-in"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className="relative z-10 mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <TbArrowBackUp className="h-6 w-6 text-blue-600" />
              <h3 className="text-xl font-semibold">
                Restore ke Versi {targetVersion}
              </h3>
            </div>

            <div className="mb-6 space-y-3">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all ${
                  restoreMode === 'soft'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="restoreMode"
                  value="soft"
                  checked={restoreMode === 'soft'}
                  onChange={event =>
                    onRestoreModeChange(event.target.value as RestoreMode)
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <TbClock className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-slate-900">
                      Soft Restore (Recommended)
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Membuat versi baru dengan data dari v{targetVersion}.
                    History lengkap tetap tersimpan untuk audit trail. Anda
                    dapat undo jika perlu.
                  </p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all ${
                  restoreMode === 'hard'
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="restoreMode"
                  value="hard"
                  checked={restoreMode === 'hard'}
                  onChange={event =>
                    onRestoreModeChange(event.target.value as RestoreMode)
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <TbAlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-slate-900">
                      Hard Rollback (Destructive)
                    </span>
                  </div>
                  <p className="mb-2 text-sm text-slate-600">
                    Menghapus semua versi setelah v{targetVersion} secara
                    permanen. Data yang dihapus tidak dapat dikembalikan.
                  </p>
                  <div className="flex items-start gap-2 rounded bg-red-100 p-2 text-xs text-red-700">
                    <TbAlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                      <strong>Peringatan:</strong> Aksi ini tidak dapat
                      dibatalkan! gunakan hanya jika yakin.
                    </span>
                  </div>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="text"
                onClick={onCancel}
                disabled={isRestoring}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant={restoreMode === 'hard' ? 'danger' : 'primary'}
                onClick={onConfirm}
                disabled={isRestoring}
              >
                {isRestoring
                  ? 'Processing...'
                  : restoreMode === 'hard'
                    ? 'Hard Rollback'
                    : 'Soft Restore'}
              </Button>
            </div>
          </div>
        </TransitionChild>
      </div>
    </Transition>,
    document.body
  );
};

export default HistoryRestoreDialog;
