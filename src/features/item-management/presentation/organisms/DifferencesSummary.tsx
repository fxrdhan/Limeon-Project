import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DiffText } from '../molecules';

interface DifferencesSummaryProps {
  compData: {
    isKodeDifferent?: boolean;
    isNameDifferent?: boolean;
    isDescriptionDifferent?: boolean;
    leftKode: string;
    rightKode: string;
    leftName: string;
    rightName: string;
    leftDescription: string;
    rightDescription: string;
  } | null;
  originalData: {
    originalLeftKode: string;
    originalRightKode: string;
    originalLeftName: string;
    originalRightName: string;
    originalLeftDescription: string;
    originalRightDescription: string;
  } | null;
  isDualMode: boolean;
  entityName: string;
  kodeRef: React.RefObject<HTMLDivElement | null>;
  nameRef: React.RefObject<HTMLDivElement | null>;
  descriptionRef: React.RefObject<HTMLDivElement | null>;
}

const DifferencesSummary: React.FC<DifferencesSummaryProps> = ({
  compData,
  originalData,
  isDualMode,
  entityName,
  kodeRef,
  nameRef,
  descriptionRef,
}) => {
  if (!compData) return null;

  // For dual mode, we need to swap old/new because leftVersion=newer, rightVersion=older
  // For single mode, leftVersion=older, rightVersion=current(newer), so no swap needed
  const getOldText = (left: string, right: string) =>
    isDualMode ? right : left;
  const getNewText = (left: string, right: string) =>
    isDualMode ? left : right;

  return (
    <AnimatePresence mode="wait">
      {(compData.isKodeDifferent ||
        compData.isNameDifferent ||
        compData.isDescriptionDifferent) && (
        <motion.div
          key="differences"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="bg-white p-0">
            <h4 className="text-sm font-medium text-slate-800 mb-3">
              {isDualMode
                ? 'Perbedaan antara kedua versi:'
                : 'Berbeda dari saat ini:'}
            </h4>
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
            >
              <AnimatePresence>
                {compData.isKodeDifferent && (
                  <motion.div
                    key="code-diff"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="text-xs font-medium text-slate-700 mb-0">
                      Code:
                    </div>
                    <div className="relative overflow-hidden">
                      <div
                        ref={kodeRef}
                        className="px-4 py-4 max-h-[80px] overflow-y-auto scrollbar-thin"
                      >
                        <DiffText
                          oldText={getOldText(
                            originalData?.originalLeftKode || compData.leftKode,
                            originalData?.originalRightKode ||
                              compData.rightKode
                          )}
                          newText={getNewText(
                            originalData?.originalLeftKode || compData.leftKode,
                            originalData?.originalRightKode ||
                              compData.rightKode
                          )}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {compData.isNameDifferent && (
                  <motion.div
                    key="name-diff"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="text-xs font-medium text-slate-700 mb-0">
                      Nama:
                    </div>
                    <div className="relative overflow-hidden">
                      <div
                        ref={nameRef}
                        className="px-4 py-4 max-h-[100px] overflow-y-auto scrollbar-thin"
                      >
                        <DiffText
                          oldText={getOldText(
                            originalData?.originalLeftName || compData.leftName,
                            originalData?.originalRightName ||
                              compData.rightName
                          )}
                          newText={getNewText(
                            originalData?.originalLeftName || compData.leftName,
                            originalData?.originalRightName ||
                              compData.rightName
                          )}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {compData.isDescriptionDifferent && (
                  <motion.div
                    key="description-diff"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="text-xs font-medium text-slate-700 mb-2">
                      {entityName === 'Produsen' ? 'Alamat:' : 'Deskripsi:'}
                    </div>
                    <div className="relative overflow-hidden">
                      <div
                        ref={descriptionRef}
                        className="px-4 pb-4 pt-2 max-h-[150px] overflow-y-auto scrollbar-thin"
                      >
                        <DiffText
                          oldText={getOldText(
                            originalData?.originalLeftDescription ||
                              compData.leftDescription,
                            originalData?.originalRightDescription ||
                              compData.rightDescription
                          )}
                          newText={getNewText(
                            originalData?.originalLeftDescription ||
                              compData.leftDescription,
                            originalData?.originalRightDescription ||
                              compData.rightDescription
                          )}
                          className="text-sm leading-relaxed"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}

      {!compData.isKodeDifferent &&
        !compData.isNameDifferent &&
        !compData.isDescriptionDifferent && (
          <motion.div
            key="no-differences"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <span className="text-sm text-green-700">
                ✓{' '}
                {isDualMode
                  ? 'Kedua versi identik'
                  : 'Sama dengan data saat ini'}
              </span>
            </div>
          </motion.div>
        )}
    </AnimatePresence>
  );
};

export default DifferencesSummary;
