import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FaExchangeAlt } from 'react-icons/fa';
import Button from '@/components/button';
import Input from '@/components/input';
import DescriptiveTextarea from '@/components/descriptive-textarea';
import { DiffText } from '../../molecules';
import { useEntityModal } from '../../../shared/contexts/EntityModalContext';
import type { VersionData } from '../../../shared/types';

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

  // State to track overflow status
  const [overflowStates, setOverflowStates] = React.useState({
    kode: false,
    name: false,
    description: false,
  });

  // Function to check if element overflows
  const checkOverflow = (element: HTMLElement | null) => {
    if (!element) return false;
    return element.scrollHeight > element.clientHeight;
  };

  // Auto-scroll to first highlighted text EVERY TIME content changes (must be before early returns)
  useEffect(() => {
    // Only run when modal is actually opened
    if (!isOpen) return;

    const scrollToFirstHighlight = (
      container: HTMLDivElement | null,
      retryCount = 0
    ) => {
      if (!container) return;

      // Use multiple requestAnimationFrame for better timing - especially for equal->diff transitions
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Find first highlighted element (either added or removed text)
            const highlightedElement = container.querySelector(
              '.bg-green-400, .bg-red-400'
            );
            if (highlightedElement) {
              // Smooth scroll to first highlight - no jarring reset to top
              highlightedElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest',
              });
            } else if (retryCount < 3) {
              // Retry if highlighted elements not found yet (useful for equal->diff transitions)
              setTimeout(
                () => scrollToFirstHighlight(container, retryCount + 1),
                100
              );
            }
          });
        });
      });
    };

    // Longer delay to ensure DOM is fully updated with new content and highlights
    const timer = setTimeout(() => {
      // Priority order: description (usually longest), name, then kode
      // Only scroll if container actually overflows (is scrollable)
      if (descriptionRef.current && checkOverflow(descriptionRef.current)) {
        scrollToFirstHighlight(descriptionRef.current);
      } else if (nameRef.current && checkOverflow(nameRef.current)) {
        scrollToFirstHighlight(nameRef.current);
      } else if (kodeRef.current && checkOverflow(kodeRef.current)) {
        scrollToFirstHighlight(kodeRef.current);
      }
    }, 400); // Longer delay to handle equal->diff transitions properly

    return () => clearTimeout(timer);
  }, [
    isOpen,
    isFlipped,
    selectedVersion?.version_number,
    versionA?.version_number,
    versionB?.version_number,
  ]); // Trigger on content changes - retry mechanism handles equal->diff transitions

  // Update overflow states when content changes
  useEffect(() => {
    if (!isOpen) return;

    const updateOverflowStates = () => {
      setOverflowStates({
        kode: checkOverflow(kodeRef.current),
        name: checkOverflow(nameRef.current),
        description: checkOverflow(descriptionRef.current),
      });
    };

    // Check overflow after content is rendered
    const timer = setTimeout(updateOverflowStates, 100);
    
    // Also check on resize
    window.addEventListener('resize', updateOverflowStates);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateOverflowStates);
    };
  }, [
    isOpen,
    isFlipped,
    selectedVersion?.version_number,
    versionA?.version_number,
    versionB?.version_number,
  ]);

  // Helper function to get code field from entity data (supports both 'code' and 'kode')
  const getCodeField = (
    entityData: Record<string, unknown> | undefined | null
  ) => {
    return String(entityData?.code || entityData?.kode || '');
  };

  // Helper functions to get effective versions based on flip state
  const getEffectiveVersionA = () => (isFlipped ? versionB : versionA);
  const getEffectiveVersionB = () => (isFlipped ? versionA : versionB);

  // Get original data for diff computation (never changes, prevents recomputation)
  const getOriginalComparisonData = () => {
    if (isDualMode && versionA && versionB) {
      const versionAData = versionA.entity_data;
      const versionBData = versionB.entity_data;
      const isManufacturer = entityName === 'Produsen';
      return {
        originalLeftKode: getCodeField(versionAData),
        originalLeftName: String(versionAData?.name || ''),
        originalLeftDescription: String(
          isManufacturer
            ? versionAData?.address || ''
            : versionAData?.description || ''
        ),
        originalRightKode: getCodeField(versionBData),
        originalRightName: String(versionBData?.name || ''),
        originalRightDescription: String(
          isManufacturer
            ? versionBData?.address || ''
            : versionBData?.description || ''
        ),
      };
    }
    return null;
  };

  // Get comparison data based on mode
  const getComparisonData = () => {
    const isManufacturer = entityName === 'Produsen';

    if (isDualMode && versionA && versionB) {
      const effectiveVersionA = getEffectiveVersionA();
      const effectiveVersionB = getEffectiveVersionB();
      const versionAData = effectiveVersionA?.entity_data;
      const versionBData = effectiveVersionB?.entity_data;
      return {
        leftKode: getCodeField(versionAData),
        leftName: String(versionAData?.name || ''),
        leftDescription: String(
          isManufacturer
            ? versionAData?.address || ''
            : versionAData?.description || ''
        ),
        rightKode: getCodeField(versionBData),
        rightName: String(versionBData?.name || ''),
        rightDescription: String(
          isManufacturer
            ? versionBData?.address || ''
            : versionBData?.description || ''
        ),
        leftVersion: effectiveVersionA,
        rightVersion: effectiveVersionB,
        isKodeDifferent:
          getCodeField(versionA.entity_data) !==
          getCodeField(versionB.entity_data),
        isNameDifferent:
          versionA.entity_data?.name !== versionB.entity_data?.name,
        isDescriptionDifferent: isManufacturer
          ? versionA.entity_data?.address !== versionB.entity_data?.address
          : versionA.entity_data?.description !==
            versionB.entity_data?.description,
      };
    } else if (selectedVersion) {
      const versionData = selectedVersion.entity_data;
      const versionKode = getCodeField(versionData);
      const versionName = String(versionData?.name || '');
      const versionDescription = String(
        isManufacturer
          ? versionData?.address || ''
          : versionData?.description || ''
      );
      return {
        leftKode: versionKode,
        leftName: versionName,
        leftDescription: versionDescription,
        rightKode: currentData.code || currentData.kode || '',
        rightName: currentData.name,
        rightDescription: currentData.description,
        leftVersion: selectedVersion,
        rightVersion: null,
        isKodeDifferent:
          (currentData.code || currentData.kode || '') !== versionKode,
        isNameDifferent: currentData.name !== versionName,
        isDescriptionDifferent: currentData.description !== versionDescription,
      };
    }
    return null;
  };

  // Get comparison data first (needed for overflow detection dependencies)
  const compData = getComparisonData();
  const originalData = getOriginalComparisonData();

  // Update overflow states when modal opens or content changes (must be before early return)
  useEffect(() => {
    if (!isOpen) return;

    const updateOverflowStatesWithRetry = (retryCount = 0) => {
      const updateOverflowStates = () => {
        setOverflowStates({
          kode: checkOverflow(kodeRef.current),
          name: checkOverflow(nameRef.current),
          description: checkOverflow(descriptionRef.current),
        });
      };

      // For equal->diff transitions, we need to wait for AnimatePresence to mount elements
      const hasAnyDiff = compData?.isKodeDifferent || compData?.isNameDifferent || compData?.isDescriptionDifferent;
      
      if (hasAnyDiff) {
        // Check if refs are available (elements are mounted)
        const refsReady = (compData?.isKodeDifferent ? kodeRef.current : true) &&
                         (compData?.isNameDifferent ? nameRef.current : true) &&
                         (compData?.isDescriptionDifferent ? descriptionRef.current : true);
        
        if (!refsReady && retryCount < 5) {
          // Retry with increasing delay for AnimatePresence mounting
          setTimeout(() => updateOverflowStatesWithRetry(retryCount + 1), 100 + (retryCount * 50));
          return;
        }
      }
      
      updateOverflowStates();
    };

    // Initial delay, then retry mechanism for equal->diff transitions
    const timer = setTimeout(() => updateOverflowStatesWithRetry(), 200);
    
    return () => clearTimeout(timer);
  }, [
    isOpen,
    isFlipped,
    selectedVersion?.version_number,
    versionA?.version_number,
    versionB?.version_number,
    // Also trigger when diff content status changes (equal <-> diff)
    compData?.isKodeDifferent,
    compData?.isNameDifferent,
    compData?.isDescriptionDifferent,
  ]);

  // Early return for invalid states
  if (!isDualMode && !selectedVersion) return null;
  if (isDualMode && (!versionA || !versionB)) return null;
  if (!compData) return null;

  const handleRestore = async () => {
    if (!selectedVersion || !onRestore) return;

    if (
      confirm(
        `Yakin ingin mengembalikan data ke versi ${selectedVersion.version_number}?`
      )
    ) {
      try {
        await onRestore(selectedVersion.version_number);
        onClose(); // Close modal after successful restore
      } catch (error) {
        alert('Gagal mengembalikan versi: ' + error);
      }
    }
  };

  // Check if restore should be available (only for single mode, not dual mode, and when there are differences)
  const canRestore = !isDualMode && selectedVersion && onRestore;

  // Only show restore button if there are actual differences to restore
  const hasDifferences = compData
    ? compData.isKodeDifferent ||
      compData.isNameDifferent ||
      compData.isDescriptionDifferent
    : false;
  const shouldShowRestore = canRestore && hasDifferences;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="comparison-modal"
          className="fixed top-1/2 left-1/2 transform -translate-y-1/2 translate-x-2 z-[60]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            type: 'tween',
            duration: 0.25,
            ease: [0.25, 0.46, 0.45, 0.94], // Custom easing for smooth enter/exit
          }}
          onAnimationComplete={() => {
            // Prevent auto-focus on form elements
            if (document.activeElement) {
              (document.activeElement as HTMLElement).blur();
            }
          }}
        >
          <div className="relative bg-white rounded-xl shadow-xl w-96">
            {/* Hidden element to capture initial focus */}
            <div tabIndex={0} className="sr-only" aria-hidden="true"></div>
            {/* Header */}
            <div className="p-2.5 border-b-2 bg-gray-100 border-gray-200 rounded-t-xl">
              {isDualMode ? (
                /* Dual Mode Header */
                <div className="space-y-2">
                  <div className="grid grid-cols-5 gap-2 items-center">
                    {/* Left Version */}
                    <div
                      className={`col-span-2 ${isFlipped ? 'bg-purple-50 rounded-lg p-2' : 'bg-blue-50 rounded-lg p-2'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`font-mono px-1.5 py-0.5 rounded text-xs ${
                            isFlipped
                              ? 'bg-purple-200 text-purple-800'
                              : 'bg-blue-200 text-blue-800'
                          }`}
                        >
                          v{compData.leftVersion?.version_number}
                        </span>
                      </div>
                      <div
                        className={`text-xs ${isFlipped ? 'text-purple-600' : 'text-blue-600'}`}
                      >
                        {compData.leftVersion &&
                          new Date(
                            compData.leftVersion.changed_at
                          ).toLocaleString('id-ID')}
                      </div>
                    </div>

                    {/* Center Flip Button */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={uiActions.flipVersions}
                        className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        title="Swap positions"
                      >
                        <FaExchangeAlt size={14} />
                      </button>
                    </div>

                    {/* Right Version */}
                    <div
                      className={`col-span-2 ${isFlipped ? 'bg-blue-50 rounded-lg p-2' : 'bg-purple-50 rounded-lg p-2'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`font-mono px-1.5 py-0.5 rounded text-xs ${
                            isFlipped
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-purple-200 text-purple-800'
                          }`}
                        >
                          v{compData.rightVersion?.version_number}
                        </span>
                      </div>
                      <div
                        className={`text-xs ${isFlipped ? 'text-blue-600' : 'text-purple-600'}`}
                      >
                        {compData.rightVersion &&
                          new Date(
                            compData.rightVersion.changed_at
                          ).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Single Mode Header */
                <div className="rounded-lg p-2">
                  <div className="flex items-center gap-3 text-sm">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        compData.leftVersion?.action_type === 'INSERT'
                          ? 'bg-green-100 text-green-700'
                          : compData.leftVersion?.action_type === 'UPDATE'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {compData.leftVersion?.action_type}
                    </span>
                    <span className="text-xs text-gray-600">
                      {compData.leftVersion &&
                        new Date(
                          compData.leftVersion.changed_at
                        ).toLocaleString('id-ID')}
                    </span>
                    <span className="font-mono bg-purple-100 text-purple-700 px-2 py-1 rounded ml-auto">
                      v{compData.leftVersion?.version_number}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {isDualMode ? (
                /* Dual Mode Content - Side by Side Comparison */
                <div className="space-y-4">
                  {/* Kode Comparison */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kode
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`border rounded-lg p-3 ${
                          isFlipped
                            ? 'border-purple-200 bg-purple-50'
                            : 'border-blue-200 bg-blue-50'
                        }`}
                      >
                        <div
                          className={`text-xs mb-1 font-mono ${isFlipped ? 'text-purple-600' : 'text-blue-600'}`}
                        >
                          v{compData.leftVersion?.version_number}
                        </div>
                        <div className="text-sm font-mono">
                          {compData.leftKode || (
                            <span className="text-gray-400 italic">Empty</span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`border rounded-lg p-3 ${
                          isFlipped
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-purple-200 bg-purple-50'
                        }`}
                      >
                        <div
                          className={`text-xs mb-1 font-mono ${isFlipped ? 'text-blue-600' : 'text-purple-600'}`}
                        >
                          v{compData.rightVersion?.version_number}
                        </div>
                        <div className="text-sm font-mono">
                          {compData.rightKode || (
                            <span className="text-gray-400 italic">Empty</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Name Comparison */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama {entityName}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`border rounded-lg p-3 ${
                          isFlipped
                            ? 'border-purple-200 bg-purple-50'
                            : 'border-blue-200 bg-blue-50'
                        }`}
                      >
                        <div
                          className={`text-xs mb-1 font-mono ${isFlipped ? 'text-purple-600' : 'text-blue-600'}`}
                        >
                          v{compData.leftVersion?.version_number}
                        </div>
                        <div className="text-sm font-medium">
                          {compData.leftName || (
                            <span className="text-gray-400 italic">Empty</span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`border rounded-lg p-3 ${
                          isFlipped
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-purple-200 bg-purple-50'
                        }`}
                      >
                        <div
                          className={`text-xs mb-1 font-mono ${isFlipped ? 'text-blue-600' : 'text-purple-600'}`}
                        >
                          v{compData.rightVersion?.version_number}
                        </div>
                        <div className="text-sm font-medium">
                          {compData.rightName || (
                            <span className="text-gray-400 italic">Empty</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description/Address Comparison */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {entityName === 'Produsen' ? 'Alamat' : 'Deskripsi'}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`border rounded-lg p-3 ${
                          isFlipped
                            ? 'border-purple-200 bg-purple-50'
                            : 'border-blue-200 bg-blue-50'
                        }`}
                      >
                        <div
                          className={`text-xs mb-1 font-mono ${isFlipped ? 'text-purple-600' : 'text-blue-600'}`}
                        >
                          v{compData.leftVersion?.version_number}
                        </div>
                        <div className="text-sm whitespace-pre-wrap min-h-[60px] max-h-[120px] overflow-y-auto">
                          {compData.leftDescription || (
                            <span className="text-gray-400 italic">Empty</span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`border rounded-lg p-3 ${
                          isFlipped
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-purple-200 bg-purple-50'
                        }`}
                      >
                        <div
                          className={`text-xs mb-1 font-mono ${isFlipped ? 'text-blue-600' : 'text-purple-600'}`}
                        >
                          v{compData.rightVersion?.version_number}
                        </div>
                        <div className="text-sm whitespace-pre-wrap min-h-[60px] max-h-[120px] overflow-y-auto">
                          {compData.rightDescription || (
                            <span className="text-gray-400 italic">Empty</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Single Mode Content - Traditional Form with Diff */
                <div className="space-y-4">
                  <Input
                    label="Kode"
                    value={compData.leftKode}
                    placeholder="Kode"
                    readOnly
                    tabIndex={-1}
                    className="pointer-events-none select-none font-mono"
                  />

                  <Input
                    label={`Nama ${entityName}`}
                    value={compData.leftName}
                    placeholder={`Nama ${entityName.toLowerCase()}`}
                    required
                    readOnly
                    tabIndex={-1}
                    className="pointer-events-none select-none"
                  />

                  <DescriptiveTextarea
                    label={entityName === 'Produsen' ? 'Alamat' : 'Deskripsi'}
                    name={entityName === 'Produsen' ? 'address' : 'description'}
                    value={compData.leftDescription}
                    onChange={() => {}} // No-op since readOnly
                    placeholder={
                      entityName === 'Produsen' ? 'Alamat' : 'Deskripsi'
                    }
                    readOnly
                    autoFocus={false}
                    tabIndex={-1}
                    textareaClassName="text-sm min-h-[80px] max-h-[120px] resize-none cursor-default"
                    rows={3}
                    showInitially={!!compData.leftDescription}
                    expandOnClick={true}
                  />
                </div>
              )}

              {/* Differences Summary */}
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
                              key="kode-diff"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="text-xs font-medium text-slate-700 mb-0">
                                Kode:
                              </div>
                              <div className="relative overflow-hidden">
                                <div
                                  ref={kodeRef}
                                  className="px-4 py-4 max-h-[80px] overflow-y-auto scrollbar-thin"
                                >
                                  <DiffText
                                    oldText={
                                      originalData?.originalLeftKode ||
                                      compData.leftKode
                                    }
                                    newText={
                                      originalData?.originalRightKode ||
                                      compData.rightKode
                                    }
                                    className="text-sm font-mono"
                                    isFlipped={isFlipped}
                                  />
                                </div>
                                {/* Conditional gradient fade overlay - only when content overflows */}
                                {overflowStates.kode && (
                                  <div className="absolute inset-0 pointer-events-none rounded">
                                    <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white via-white/60 to-transparent"></div>
                                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white via-white/60 to-transparent"></div>
                                    <div className="absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-white via-white/60 to-transparent"></div>
                                    <div className="absolute top-0 bottom-0 right-0 w-4 bg-gradient-to-l from-white via-white/60 to-transparent"></div>
                                  </div>
                                )}
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
                                    oldText={
                                      originalData?.originalLeftName ||
                                      compData.leftName
                                    }
                                    newText={
                                      originalData?.originalRightName ||
                                      compData.rightName
                                    }
                                    className="text-sm"
                                    isFlipped={isFlipped}
                                  />
                                </div>
                                {/* Conditional gradient fade overlay - only when content overflows */}
                                {overflowStates.name && (
                                  <div className="absolute inset-0 pointer-events-none rounded">
                                    <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white via-white/60 to-transparent"></div>
                                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white via-white/60 to-transparent"></div>
                                    <div className="absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-white via-white/60 to-transparent"></div>
                                    <div className="absolute top-0 bottom-0 right-0 w-4 bg-gradient-to-l from-white via-white/60 to-transparent"></div>
                                  </div>
                                )}
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
                              <div className="text-xs font-medium text-slate-700 mb-0">
                                {entityName === 'Produsen'
                                  ? 'Alamat:'
                                  : 'Deskripsi:'}
                              </div>
                              <div className="relative overflow-hidden">
                                <div
                                  ref={descriptionRef}
                                  className="px-4 py-4 max-h-[150px] overflow-y-auto scrollbar-thin"
                                >
                                  <DiffText
                                    oldText={
                                      originalData?.originalLeftDescription ||
                                      compData.leftDescription
                                    }
                                    newText={
                                      originalData?.originalRightDescription ||
                                      compData.rightDescription
                                    }
                                    className="text-sm leading-relaxed"
                                    isFlipped={isFlipped}
                                  />
                                </div>
                                {/* Conditional gradient fade overlay - only when content overflows */}
                                {overflowStates.description && (
                                  <div className="absolute inset-0 pointer-events-none rounded">
                                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white via-white/65 to-transparent"></div>
                                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/65 to-transparent"></div>
                                    <div className="absolute top-0 bottom-0 left-0 w-5 bg-gradient-to-r from-white via-white/60 to-transparent"></div>
                                    <div className="absolute top-0 bottom-0 right-0 w-5 bg-gradient-to-l from-white via-white/60 to-transparent"></div>
                                  </div>
                                )}
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
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-4 border-t-2 border-gray-200 rounded-b-lg">
              {shouldShowRestore ? (
                <Button
                  type="button"
                  variant="text"
                  onClick={handleRestore}
                  className="text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                  title={`Restore ke versi ${selectedVersion?.version_number}`}
                >
                  Restore v{selectedVersion?.version_number}
                </Button>
              ) : (
                <div></div>
              )}
              <Button type="button" variant="text" onClick={onClose}>
                Tutup
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ComparisonModal;
