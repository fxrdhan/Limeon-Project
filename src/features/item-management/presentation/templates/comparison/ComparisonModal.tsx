import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEntityModal } from '../../../shared/contexts/EntityModalContext';
import type { VersionData } from '../../../shared/types';
import {
  useModalAnimation,
  useComparisonData,
  useAutoScroll,
} from './hooks';
import {
  ComparisonHeader,
  DualModeContent,
  DifferencesSummary,
  ComparisonFooter,
} from '../../organisms';
import { SingleModeContent } from '../../molecules';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  selectedVersion?: VersionData;
  currentData: {
    kode?: string;
    code?: string;
    name: string;
    description: string;
  };
  // Dual comparison support
  isDualMode?: boolean;
  versionA?: VersionData;
  versionB?: VersionData;
  onFlipVersions?: () => void;
  // Restore functionality
  onRestore?: (version: number) => Promise<void>;
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  entityName,
  selectedVersion,
  currentData,
  isDualMode = false,
  versionA,
  versionB,
  onRestore,
}) => {
  const { comparison, uiActions } = useEntityModal();
  const { isFlipped } = comparison;

  // Refs for checking overflow
  const kodeRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);

  // Use custom hooks
  const { isClosing, handleClose } = useModalAnimation({ isOpen, onClose });

  const { compData, originalData } = useComparisonData({
    isDualMode,
    selectedVersion,
    currentData,
    versionA,
    versionB,
    isFlipped,
    entityName,
  });


  useAutoScroll({
    isOpen,
    kodeRef,
    nameRef,
    descriptionRef,
    compData,
  });


  // Early return for invalid states
  if (!isDualMode && !selectedVersion) return null;
  if (isDualMode && (!versionA || !versionB)) return null;
  if (!compData) return null;

  // Check if restore should be available (only for single mode, not dual mode, and when there are differences)
  const canRestore = !isDualMode && !!selectedVersion && !!onRestore;

  // Only show restore button if there are actual differences to restore
  const hasDifferences = compData
    ? (compData.isKodeDifferent ?? false) ||
      (compData.isNameDifferent ?? false) ||
      (compData.isDescriptionDifferent ?? false)
    : false;
  const shouldShowRestore = canRestore && hasDifferences;

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="comparison-modal"
          variants={modalVariants}
          initial="hidden"
          animate={isClosing ? 'exit' : 'visible'}
          exit="exit"
          transition={{
            duration: 0.25,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="fixed top-1/2 left-1/2 transform -translate-y-1/2 translate-x-2 z-[60]"
          onAnimationComplete={() => {
            // Prevent auto-focus on form elements
            if (document.activeElement) {
              (document.activeElement as HTMLElement).blur();
            }
          }}
        >
          <div
            className={`relative bg-white rounded-xl shadow-xl max-w-[90vw] ${isDualMode ? 'w-[600px]' : 'w-[400px]'}`}
          >
            {/* Hidden element to capture initial focus */}
            <div tabIndex={0} className="sr-only" aria-hidden="true"></div>

            {/* Header */}
            <ComparisonHeader
              isDualMode={isDualMode}
              isFlipped={isFlipped}
              compData={compData}
              onFlipVersions={uiActions.flipVersions}
            />

            {/* Content */}
            <div className="p-6 space-y-4">
              {isDualMode ? (
                <DualModeContent
                  isFlipped={isFlipped}
                  compData={compData}
                  entityName={entityName}
                />
              ) : (
                <SingleModeContent
                  compData={compData}
                  entityName={entityName}
                />
              )}

              {/* Differences Summary */}
              <DifferencesSummary
                compData={compData}
                originalData={originalData}
                isDualMode={isDualMode}
                entityName={entityName}
                isFlipped={isFlipped}
                kodeRef={kodeRef}
                nameRef={nameRef}
                descriptionRef={descriptionRef}
              />
            </div>

            {/* Footer */}
            <ComparisonFooter
              shouldShowRestore={shouldShowRestore}
              selectedVersion={selectedVersion}
              onRestore={onRestore}
              onClose={handleClose}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ComparisonModal;
