import type { Dispatch, RefObject, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { TbArrowBack, TbTrash } from 'react-icons/tb';
import { AnimatePresence, motion } from 'motion/react';
import Button from '@/components/button';
import Input from '@/components/input';
import { POPOVER_SURFACE_CLASS } from '@/styles/uiPrimitives';
import {
  getBaselineDiscount,
  getBaselinePlaceholderName,
} from './baselineUtils';
import type { LevelPricingConfig, PopoverPosition } from './types';

interface BaselineSettingsPortalProps {
  baselineAddOpen: boolean;
  baselineDiscountInputRef: RefObject<HTMLInputElement | null>;
  baselineDrafts: Record<string, string>;
  baselineNameInputRef: RefObject<HTMLInputElement | null>;
  baselineNewDiscount: string;
  baselineNewName: string;
  canCreateBaselineLevel: boolean;
  disabled: boolean;
  handleAddBaselineLevel: () => Promise<void>;
  handleBaselineChange: (levelId: string, value: string) => void;
  handleDeleteBaselineLevel: (levelId: string) => Promise<void>;
  handleSaveBaseline: () => Promise<void>;
  isBaselineAddActive: boolean;
  isOpen: boolean;
  isSavingBaseline: boolean;
  levelPricing?: LevelPricingConfig;
  onClose: () => void;
  popoverRef: RefObject<HTMLDivElement | null>;
  position: PopoverPosition | null;
  setBaselineNewDiscount: Dispatch<SetStateAction<string>>;
  setBaselineNewName: Dispatch<SetStateAction<string>>;
}

export function BaselineSettingsPortal({
  baselineAddOpen,
  baselineDiscountInputRef,
  baselineDrafts,
  baselineNameInputRef,
  baselineNewDiscount,
  baselineNewName,
  canCreateBaselineLevel,
  disabled,
  handleAddBaselineLevel,
  handleBaselineChange,
  handleDeleteBaselineLevel,
  handleSaveBaseline,
  isBaselineAddActive,
  isOpen,
  isSavingBaseline,
  levelPricing,
  onClose,
  popoverRef,
  position,
  setBaselineNewDiscount,
  setBaselineNewName,
}: BaselineSettingsPortalProps) {
  return createPortal(
    <AnimatePresence>
      {isOpen && position && levelPricing ? (
        <motion.div
          className="fixed z-50"
          style={{ top: position.top, left: position.left }}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          <div
            ref={popoverRef}
            className={`w-[260px] ${POPOVER_SURFACE_CLASS}`}
          >
            <div className="px-3 py-2 border-b border-slate-200 text-sm font-semibold text-slate-700">
              Atur baseline
            </div>
            <div className="p-3 space-y-3">
              {levelPricing.levels.map(level => {
                const currentDiscount = getBaselineDiscount(level);
                const value =
                  baselineDrafts[level.id] ?? currentDiscount.toString();

                return (
                  <div
                    key={level.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="text-sm font-medium text-slate-700 min-w-[72px] whitespace-nowrap">
                      {level.level_name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={value}
                        min={0}
                        max={100}
                        step={0.1}
                        onChange={event =>
                          handleBaselineChange(level.id, event.target.value)
                        }
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleSaveBaseline();
                          }
                        }}
                        disabled={disabled}
                        className="w-20 text-sm"
                      />
                      <button
                        type="button"
                        className={`text-slate-400 transition-colors ${
                          disabled || levelPricing.isDeleting
                            ? 'cursor-not-allowed'
                            : 'hover:text-rose-500 cursor-pointer'
                        }`}
                        onClick={() => {
                          void handleDeleteBaselineLevel(level.id);
                        }}
                        disabled={disabled || levelPricing.isDeleting}
                        aria-label="Hapus level"
                      >
                        <TbTrash size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {baselineAddOpen ? (
              <div className="px-3 pb-3">
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-2 space-y-2">
                  <Input
                    ref={baselineNameInputRef}
                    value={baselineNewName}
                    onChange={event => setBaselineNewName(event.target.value)}
                    placeholder={getBaselinePlaceholderName(
                      levelPricing.levels
                    )}
                    disabled={disabled || levelPricing.isCreating}
                    className="text-sm"
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        baselineDiscountInputRef.current?.focus();
                      }
                    }}
                  />
                  <div className="relative">
                    <Input
                      ref={baselineDiscountInputRef}
                      type="number"
                      value={baselineNewDiscount}
                      min={0}
                      max={100}
                      step={0.1}
                      onChange={event =>
                        setBaselineNewDiscount(event.target.value)
                      }
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void handleAddBaselineLevel();
                        }
                      }}
                      placeholder="Diskon (%)"
                      disabled={disabled || levelPricing.isCreating}
                      className="text-sm pr-10"
                    />
                    <button
                      type="button"
                      className={`absolute inset-y-0 right-0 flex items-center pr-3 text-lg font-bold transition-colors duration-300 ${
                        isBaselineAddActive
                          ? 'text-primary cursor-pointer'
                          : 'text-slate-300 cursor-not-allowed'
                      }`}
                      onClick={() => {
                        if (isBaselineAddActive) {
                          void handleAddBaselineLevel();
                        }
                      }}
                      title="Tekan Enter atau klik untuk menambah"
                      disabled={!isBaselineAddActive}
                      aria-label="Tambah level baseline"
                    >
                      <TbArrowBack size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex items-center justify-between px-3 pb-3">
              <Button
                type="button"
                variant="text"
                size="sm"
                onClick={onClose}
                disabled={disabled || isSavingBaseline}
              >
                Tutup
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddBaselineLevel}
                isLoading={levelPricing.isCreating}
                disabled={
                  disabled ||
                  isSavingBaseline ||
                  (baselineAddOpen && !canCreateBaselineLevel) ||
                  levelPricing.isCreating
                }
              >
                Tambah
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
