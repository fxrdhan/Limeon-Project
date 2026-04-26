import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import HistoryTimelineList from '../organisms/HistoryTimelineList';
import HistoryRestoreDialog from './HistoryRestoreDialog';
import type { RestoreMode } from './HistoryRestoreDialog';
import { useHistorySelection } from '../hooks/useHistoryManagement';
import { TbHistoryToggle } from 'react-icons/tb';
import { itemHistoryService } from '../../infrastructure/itemHistory.service';

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
  onVersionDeselect?: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  currentVersion?: number;
  entityTable?: string;
  entityId?: string;
}

const PORTAL_MARGIN = 16;
const PORTAL_WIDTH = 350;
const PORTAL_TAB_WIDTH = 180;
const PORTAL_TAB_HEIGHT = 44;
const PORTAL_RADIUS = 16;

const ItemHistoryPortal: React.FC<ItemHistoryPortalProps> = ({
  isOpen,
  onClose,
  history,
  isLoading,
  onVersionSelect,
  onVersionDeselect,
  triggerRef,
  entityTable = 'items',
  entityId,
}) => {
  const portalRef = useRef<HTMLDivElement>(null);
  const hasViewedVersionRef = useRef(false);
  const queryClient = useQueryClient();
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 350,
    bodyMaxHeight: 420,
    bodyMinHeight: 460,
  });
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
        hasViewedVersionRef.current = true;
        onVersionSelect(historyItem.version_number, historyItem.entity_data);
      },
      onVersionDeselect: () => {
        hasViewedVersionRef.current = false;
        onVersionDeselect?.();
      },
      enableKeyboardNav: isOpen, // Only enable keyboard nav when portal is open
    });

  const handlePortalMouseLeave = () => {
    if (hookSelectedVersion !== null || !hasViewedVersionRef.current) return;
    hasViewedVersionRef.current = false;
    onVersionDeselect?.();
  };

  // Calculate position based on trigger element
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(PORTAL_WIDTH, viewportWidth - PORTAL_MARGIN * 2);
    const right = Math.min(viewportWidth - PORTAL_MARGIN, rect.right);
    const left = Math.max(PORTAL_MARGIN, right - width);
    const top = Math.max(PORTAL_MARGIN, rect.top - 12);
    const availableHeight = viewportHeight - top - PORTAL_MARGIN;
    const bodyMaxHeight = Math.max(
      180,
      availableHeight - PORTAL_TAB_HEIGHT + 1
    );

    setPosition({
      top,
      left,
      width,
      bodyMaxHeight,
      bodyMinHeight: Math.min(460, bodyMaxHeight),
    });
    setIsPositioned(true);
  }, [triggerRef]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

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
        const { data: rpcData, error: rpcError } =
          await itemHistoryService.hardRollbackEntity({
            entityTable,
            entityId,
            targetVersion: restoreTargetVersion,
          });

        if (rpcError) {
          throw new Error(`Hard rollback failed: ${rpcError.message}`);
        }

        toast.success(
          `Berhasil menghapus ${rpcData?.deleted_count ?? 0} versi setelah v${restoreTargetVersion}`
        );
      } else {
        const restoreData = { ...targetVersion.entity_data };
        delete restoreData.id;
        delete restoreData.created_at;
        delete restoreData.updated_at;

        const { error: updateError } =
          await itemHistoryService.softRestoreEntity({
            entityTable,
            entityId,
            restoreData,
          });

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
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error';
      toast.error(
        `Gagal ${restoreMode === 'hard' ? 'rollback' : 'restore'}: ${errorMessage}`
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const surfaceHeight = PORTAL_TAB_HEIGHT + position.bodyMinHeight;
  const tabLeft = Math.max(
    PORTAL_RADIUS * 2,
    position.width - PORTAL_TAB_WIDTH
  );
  const historyPortalPath = [
    `M 0 ${PORTAL_TAB_HEIGHT + PORTAL_RADIUS}`,
    `Q 0 ${PORTAL_TAB_HEIGHT} ${PORTAL_RADIUS} ${PORTAL_TAB_HEIGHT}`,
    `H ${tabLeft - PORTAL_RADIUS}`,
    `Q ${tabLeft} ${PORTAL_TAB_HEIGHT} ${tabLeft} ${PORTAL_TAB_HEIGHT - PORTAL_RADIUS}`,
    `V ${PORTAL_RADIUS}`,
    `Q ${tabLeft} 0 ${tabLeft + PORTAL_RADIUS} 0`,
    `H ${position.width - PORTAL_RADIUS}`,
    `Q ${position.width} 0 ${position.width} ${PORTAL_RADIUS}`,
    `V ${surfaceHeight - PORTAL_RADIUS}`,
    `Q ${position.width} ${surfaceHeight} ${position.width - PORTAL_RADIUS} ${surfaceHeight}`,
    `H ${PORTAL_RADIUS}`,
    `Q 0 ${surfaceHeight} 0 ${surfaceHeight - PORTAL_RADIUS}`,
    `V ${PORTAL_TAB_HEIGHT + PORTAL_RADIUS}`,
    'Z',
  ].join(' ');

  const portalContent = (
    <AnimatePresence>
      {isOpen && isPositioned && (
        <motion.div
          ref={portalRef}
          initial={{
            opacity: 0,
            scaleY: 0.96,
            y: -8,
          }}
          animate={{
            opacity: 1,
            scaleY: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            scaleY: 0.96,
            y: -8,
          }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-[60] origin-top-right"
          onMouseLeave={handlePortalMouseLeave}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
            height: `${surfaceHeight}px`,
          }}
        >
          <div className="relative h-full w-full">
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible drop-shadow-xl"
              viewBox={`0 0 ${position.width} ${surfaceHeight}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d={historyPortalPath}
                fill="white"
                stroke="#cbd5e1"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            <div className="relative z-10 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex h-[44px] min-w-[180px] select-none items-center justify-center gap-2 bg-transparent px-4 text-sm font-medium text-black outline-none hover:bg-transparent active:bg-transparent focus:bg-transparent focus:outline-none focus:ring-0"
                aria-label="Tutup riwayat perubahan"
              >
                <motion.span
                  layoutId="item-history-action-label"
                  className="inline-flex items-center"
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 34,
                  }}
                >
                  <TbHistoryToggle className="mr-1.5" size={16} />
                  Riwayat Perubahan
                </motion.span>
              </button>
            </div>

            <div
              className="relative z-10 overflow-hidden"
              style={{
                height: `${position.bodyMinHeight}px`,
              }}
            >
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
                disableHoverDetails={true}
                showExpandedRestoreActions={true}
                scrollContainerMaxHeight={Math.max(
                  120,
                  position.bodyMinHeight - 48
                )}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {createPortal(portalContent, document.body)}

      <HistoryRestoreDialog
        isOpen={showRestoreDialog}
        targetVersion={restoreTargetVersion}
        restoreMode={restoreMode}
        isRestoring={isRestoring}
        onRestoreModeChange={setRestoreMode}
        onCancel={closeRestoreDialog}
        onConfirm={handleRestoreConfirm}
      />
    </>
  );
};

export default ItemHistoryPortal;
