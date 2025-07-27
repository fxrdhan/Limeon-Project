import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Button from "@/components/button";
import Input from "@/components/input";
import DescriptiveTextarea from "@/components/descriptive-textarea";
import { DiffText } from "../../ui";
import type { ComparisonModalProps } from "../../../types";

const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  entityName,
  selectedVersion,
  currentData,
}) => {
  if (!selectedVersion) return null;

  // Get version data
  const versionData = selectedVersion.entity_data;
  const versionName = String(versionData?.name || "");
  const versionDescription = String(versionData?.description || "");

  // Check if values are different
  const isNameDifferent = currentData.name !== versionName;
  const isDescriptionDifferent = currentData.description !== versionDescription;

  if (!selectedVersion) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="comparison-modal"
          className="fixed top-1/2 left-1/2 transform -translate-y-1/2 translate-x-0 z-[60]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            type: "tween",
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
              {/* Version Info */}
              <div className="rounded-lg p-2">
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      selectedVersion.action_type === "INSERT"
                        ? "bg-green-100 text-green-700"
                        : selectedVersion.action_type === "UPDATE"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {selectedVersion.action_type}
                  </span>
                  <span className="text-xs text-gray-600">
                    {new Date(selectedVersion.changed_at).toLocaleString(
                      "id-ID",
                    )}
                  </span>
                  <span className="font-mono bg-purple-100 text-purple-700 px-2 py-1 rounded ml-auto">
                    v{selectedVersion.version_number}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Form Fields */}
              <Input
                label={`Nama ${entityName}`}
                value={versionName}
                placeholder={`Nama ${entityName.toLowerCase()}`}
                required
                readOnly
                tabIndex={-1}
                className="pointer-events-none select-none"
              />

              <DescriptiveTextarea
                label="Deskripsi"
                name="description"
                value={versionDescription}
                onChange={() => {}} // No-op since readOnly
                placeholder="Deskripsi"
                readOnly
                autoFocus={false}
                tabIndex={-1}
                textareaClassName="text-sm min-h-[80px] resize-none pointer-events-none select-none"
                rows={3}
                showInitially={!!versionDescription}
                expandOnClick={true}
              />

              {/* Differences Summary */}
              <AnimatePresence mode="wait">
                {(isNameDifferent || isDescriptionDifferent) && (
                  <motion.div
                    key="differences"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-yellow-800 mb-3">
                        Berbeda dari saat ini:
                      </h4>
                      <motion.div
                        className="space-y-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.2 }}
                      >
                        <AnimatePresence>
                          {isNameDifferent && (
                            <motion.div
                              key="name-diff"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="text-xs font-medium text-yellow-700 mb-1">
                                Nama:
                              </div>
                              <DiffText
                                oldText={versionName}
                                newText={currentData.name}
                                mode="character"
                                className="text-sm"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <AnimatePresence>
                          {isDescriptionDifferent && (
                            <motion.div
                              key="description-diff"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="text-xs font-medium text-yellow-700 mb-1">
                                Deskripsi:
                              </div>
                              <DiffText
                                oldText={versionDescription}
                                newText={currentData.description}
                                mode="character"
                                className="text-sm leading-relaxed"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {!isNameDifferent && !isDescriptionDifferent && (
                  <motion.div
                    key="no-differences"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <span className="text-sm text-green-700">
                        ✓ Sama dengan data saat ini
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t-2 border-gray-200 rounded-b-lg">
              <Button type="button" variant="text" onClick={onClose}>
                Tutup
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default ComparisonModal;
