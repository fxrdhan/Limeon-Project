import React, { useEffect, useRef, useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { Transition, TransitionChild } from '@headlessui/react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import HistoryTimelineList from '../organisms/HistoryTimelineList';
import { useHistorySelection } from '../hooks/useHistoryManagement';
import Button from '@/components/button';
import { TbAlertTriangle, TbArrowBackUp, TbClock } from 'react-icons/tb';

interface HistoryItem {
  id: string;
  version_number: number;
  changed_at: string;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  entity_data: Record<string, unknown>;
  changed_fields?: Record<string, { from: unknown; to: unknown }>;
  user_name?: string | null;
}

interface ItemHistoryPortalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[] | null;
  isLoading: boolean;
  selectedVersion: number | null;
  onVersionSelect: (
    version: number,
    entityData: Record<string, unknown>
  ) => void;
  triggerRef: React.RefObject<HTMLElement>;
  currentVersion?: number;
  entityTable?: string;
  entityId?: string;
}

type RestoreMode = 'soft' | 'hard';

const ItemHistoryPortal: React.FC<ItemHistoryPortalProps> = ({
  isOpen,
  onClose,
  history,
  isLoading,
  onVersionSelect,
  triggerRef,
  entityTable = 'items',
  entityId,
}) => {
  const portalRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreTargetVersion, setRestoreTargetVersion] = useState<
    number | null
  >(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('soft');
  const [isRestoring, setIsRestoring] = useState(false);

  // Use shared history selection hook with keyboard navigation
  const { selectedVersion: hookSelectedVersion, handleVersionClick } =
    useHistorySelection({
      history,
      compareMode: false,
      onVersionSelect: item => {
        // Update form with selected version data
        // Portal stays open so user can browse multiple versions
        const historyItem = item as HistoryItem;
        onVersionSelect(historyItem.version_number, historyItem.entity_data);
      },
      enableKeyboardNav: isOpen, // Only enable keyboard nav when portal is open
    });

  // Calculate position based on trigger element
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.right - 350, // Align right edge of modal with right edge of button
      });
      setIsPositioned(true);
    } else if (!isOpen) {
      setIsPositioned(false);
    }
  }, [isOpen, triggerRef]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        portalRef.current &&
        !portalRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleRestore = async (version: number) => {
    setRestoreTargetVersion(version);
    setRestoreMode('soft');
    setShowRestoreDialog(true);
  };

  const closeRestoreDialog = () => {
    setShowRestoreDialog(false);
    setTimeout(() => {
      setRestoreTargetVersion(null);
      setRestoreMode('soft');
    }, 250);
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTargetVersion || !entityId) return;

    setIsRestoring(true);
    try {
      const targetVersion = history?.find(
        h => h.version_number === restoreTargetVersion
      );
      if (!targetVersion) {
        throw new Error(`Version ${restoreTargetVersion} not found`);
      }

      if (restoreMode === 'hard') {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'hard_rollback_entity',
          {
            p_entity_table: entityTable,
            p_entity_id: entityId,
            p_target_version: restoreTargetVersion,
          }
        );

        if (rpcError) {
          throw new Error(`Hard rollback failed: ${rpcError.message}`);
        }

        toast.success(
          `Berhasil menghapus ${rpcData.deleted_count} versi setelah v${restoreTargetVersion}`
        );
      } else {
        const restoreData = { ...targetVersion.entity_data };
        delete restoreData.id;
        delete restoreData.created_at;
        delete restoreData.updated_at;

        const { error: updateError } = await supabase
          .from(entityTable)
          .update({
            ...restoreData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', entityId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        toast.success(`Berhasil restore ke versi ${restoreTargetVersion}`);
      }

      await queryClient.invalidateQueries();
      closeRestoreDialog();
      onClose();
    } catch (error) {
      console.error('Restore error:', error);
      toast.error(
        `Gagal ${restoreMode === 'hard' ? 'rollback' : 'restore'}: ${error}`
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const portalContent = (
    <AnimatePresence>
      {isOpen && isPositioned && (
        <motion.div
          ref={portalRef}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[60] bg-white rounded-xl shadow-xl border border-gray-200 w-[350px] max-h-[600px] flex flex-col"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
            <h3 className="font-medium text-sm">Riwayat Perubahan</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Pilih versi untuk melihat data
            </p>
          </div>

          {/* Content - Reuse HistoryTimelineList with keyboard navigation */}
          <div className="flex-1 overflow-hidden">
            <HistoryTimelineList
              history={history}
              isLoading={isLoading}
              onVersionClick={handleVersionClick}
              selectedVersion={hookSelectedVersion}
              selectedVersions={
                hookSelectedVersion ? [hookSelectedVersion] : []
              }
              showRestoreButton={true}
              onRestore={handleRestore}
              emptyMessage="Tidak ada riwayat perubahan"
              loadingMessage="Loading history..."
              allowMultiSelect={false}
              autoScrollToSelected={true}
              skipEntranceAnimation={hookSelectedVersion !== null}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {createPortal(portalContent, document.body)}

      {/* Restore Dialog */}
      {createPortal(
        <Transition show={showRestoreDialog} as={Fragment}>
          <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto">
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
                onClick={closeRestoreDialog}
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
              <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 z-10">
                <div className="flex items-center gap-3 mb-4">
                  <TbArrowBackUp className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold">
                    Restore ke Versi {restoreTargetVersion}
                  </h3>
                </div>

                <p className="text-gray-600 mb-6">
                  Pilih metode restore yang sesuai dengan kebutuhan Anda:
                </p>

                <div className="space-y-3 mb-6">
                  {/* Soft Restore */}
                  <label
                    className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      restoreMode === 'soft'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      value="soft"
                      checked={restoreMode === 'soft'}
                      onChange={e =>
                        setRestoreMode(e.target.value as RestoreMode)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <TbClock className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">
                          Soft Restore (Recommended)
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Membuat versi baru dengan data dari v
                        {restoreTargetVersion}. History lengkap tetap tersimpan.
                      </p>
                    </div>
                  </label>

                  {/* Hard Rollback */}
                  <label
                    className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      restoreMode === 'hard'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="restoreMode"
                      value="hard"
                      checked={restoreMode === 'hard'}
                      onChange={e =>
                        setRestoreMode(e.target.value as RestoreMode)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <TbAlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-gray-900">
                          Hard Rollback (Destructive)
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Menghapus SEMUA versi setelah v{restoreTargetVersion}{' '}
                        secara permanen.
                      </p>
                      <div className="flex items-start gap-2 text-xs text-red-700 bg-red-100 p-2 rounded">
                        <TbAlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Peringatan:</strong> Aksi ini tidak dapat
                          dibatalkan!
                        </span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="text"
                    onClick={closeRestoreDialog}
                    disabled={isRestoring}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    variant={restoreMode === 'hard' ? 'danger' : 'primary'}
                    onClick={handleRestoreConfirm}
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
      )}
    </>
  );
};

export default ItemHistoryPortal;
