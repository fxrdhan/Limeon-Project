import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { VersionData } from '../../../shared/types';
import { useComparisonData } from './hooks';
import { ComparisonHeader, DualModeContent } from '../../organisms';
import { SingleModeContent } from '../../molecules';

interface ComparisonModalProps {
  isOpen: boolean;
  isClosing?: boolean;
  entityName: string;
  selectedVersion?: VersionData;
  currentData: {
    code?: string;
    name: string;
    description: string;
  };
  // Dual comparison support
  isDualMode?: boolean;
  versionA?: VersionData;
  versionB?: VersionData;
  isFlipped?: boolean;
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  isClosing = false,
  entityName,
  selectedVersion,
  currentData,
  isDualMode = false,
  versionA,
  versionB,
  isFlipped = false,
}) => {
  const { compData, originalData } = useComparisonData({
    isDualMode,
    selectedVersion,
    currentData,
    versionA,
    versionB,
    entityName,
  });

  // Early return for invalid states
  if (!isDualMode && !selectedVersion) return null;
  if (isDualMode && (!versionA || !versionB)) return null;
  if (!compData) return null;

  const modalVariants = {
    hidden: { opacity: 0, x: -50, scale: 0.98 },
    visible: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -50, scale: 0.98 },
  };

  return createPortal(
    <AnimatePresence>
      {(isOpen || isClosing) && (
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
          className="fixed top-1/2 left-1/2 transform -translate-y-1/2 translate-x-0 z-[51]"
          onAnimationComplete={() => {
            // Prevent auto-focus on form elements
            if (document.activeElement) {
              (document.activeElement as HTMLElement).blur();
            }
          }}
        >
          <div className="relative bg-white rounded-xl shadow-xl max-w-[90vw] w-[340px]">
            {/* Hidden element to capture initial focus */}
            <div tabIndex={0} className="sr-only" aria-hidden="true"></div>

            {/* Header */}
            <ComparisonHeader isDualMode={isDualMode} compData={compData} />

            {/* Content */}
            <div className="p-6">
              {isDualMode ? (
                <DualModeContent
                  compData={compData}
                  entityName={entityName}
                  originalData={originalData}
                  isFlipped={isFlipped}
                />
              ) : (
                <SingleModeContent
                  compData={compData}
                  entityName={entityName}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ComparisonModal;
