import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaChevronDown } from 'react-icons/fa';
import { IoMenu } from 'react-icons/io5';
import { AnimatePresence, motion } from 'motion/react';
import Input from '@/components/input';
import FormField from '@/components/form-field';
import Button from '@/components/button';
import { formatRupiah } from '@/lib/formatters';
import type { CustomerLevel } from '@/types/database';
import { PriceInput, MarginEditor } from '../atoms';
import {
  basePriceSchema,
  sellPriceComparisonSchema,
} from '@/schemas/manual/itemValidation';

interface ItemPricingFormProps {
  isExpanded?: boolean;
  onExpand?: () => void;
  stackClassName?: string;
  stackStyle?: React.CSSProperties;
  formData: {
    base_price: number;
    sell_price: number;
  };
  displayBasePrice: string;
  displaySellPrice: string;
  baseUnit: string;
  marginEditing: {
    isEditing: boolean;
    percentage: string;
  };
  calculatedMargin: number | null;
  onBasePriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSellPriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMarginChange: (percentage: string) => void;
  onStartEditMargin: () => void;
  onStopEditMargin: () => void;
  onMarginInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMarginKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showLevelPricing?: boolean;
  onShowLevelPricing?: () => void;
  onHideLevelPricing?: () => void;
  levelPricing?: {
    levels: CustomerLevel[];
    isLoading: boolean;
    discountByLevel: Record<string, number>;
    onDiscountChange: (levelId: string, value: string) => void;
    onCreateLevel: (payload: {
      level_name: string;
      price_percentage: number;
      description?: string | null;
    }) => Promise<CustomerLevel>;
    isCreating: boolean;
  };
  disabled?: boolean;
}

export default function ItemPricingForm({
  isExpanded = true,
  onExpand,
  stackClassName,
  stackStyle,
  formData,
  displayBasePrice,
  displaySellPrice,
  baseUnit,
  marginEditing,
  calculatedMargin,
  onBasePriceChange,
  onSellPriceChange,
  onMarginChange,
  onStartEditMargin,
  onStopEditMargin,
  onMarginInputChange,
  onMarginKeyDown,
  showLevelPricing = false,
  onShowLevelPricing,
  onHideLevelPricing,
  levelPricing,
  disabled = false,
}: ItemPricingFormProps) {
  const [isAddingLevel, setIsAddingLevel] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelPercentage, setNewLevelPercentage] = useState('100');
  const [newLevelDescription, setNewLevelDescription] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleBasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBasePriceChange(e);
    setTimeout(() => {
      if (formData.base_price > 0 && calculatedMargin !== null) {
        onMarginChange(calculatedMargin.toFixed(1));
      }
    }, 0);
  };

  const handleStartAddLevel = () => {
    setIsAddingLevel(true);
    setNewLevelName('');
    setNewLevelPercentage('100');
    setNewLevelDescription('');
  };

  const handleCancelAddLevel = () => {
    setIsAddingLevel(false);
    setNewLevelName('');
    setNewLevelPercentage('100');
    setNewLevelDescription('');
  };

  const parsedNewLevelPercentage = Number(newLevelPercentage);
  const isPercentageValid =
    !Number.isNaN(parsedNewLevelPercentage) &&
    parsedNewLevelPercentage >= 0 &&
    parsedNewLevelPercentage <= 100;
  const canSaveLevel =
    newLevelName.trim().length > 0 &&
    isPercentageValid &&
    !disabled &&
    !levelPricing?.isCreating;

  const handleCreateLevel = async () => {
    if (!levelPricing) return;
    if (!canSaveLevel) return;

    await levelPricing.onCreateLevel({
      level_name: newLevelName.trim(),
      price_percentage: parsedNewLevelPercentage,
      description: newLevelDescription.trim() || null,
    });

    handleCancelAddLevel();
  };

  const updateMenuPosition = useCallback(() => {
    if (!menuButtonRef.current) return;
    const rect = menuButtonRef.current.getBoundingClientRect();
    const menuWidth = 190;
    const left = Math.max(12, rect.right - menuWidth);
    setMenuPosition({
      top: rect.bottom + 8,
      left,
    });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    updateMenuPosition();

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    const handleReposition = () => updateMenuPosition();

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [menuOpen, updateMenuPosition]);

  const renderLevelPricing = () => {
    if (!levelPricing) return null;

    const baseSellPrice = formData.sell_price || 0;

    return (
      <div className="p-4 md:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-700">
              Pengaturan Level Pelanggan
            </div>
            <div className="text-xs text-slate-500">
              Harga jual dasar: {formatRupiah(baseSellPrice)}
            </div>
          </div>
          {onHideLevelPricing ? (
            <Button
              type="button"
              variant="text"
              size="sm"
              onClick={onHideLevelPricing}
            >
              Kembali
            </Button>
          ) : null}
        </div>

        {levelPricing.isLoading ? (
          <div className="text-sm text-slate-500">
            Memuat level pelanggan...
          </div>
        ) : levelPricing.levels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Belum ada level pelanggan. Tambahkan level baru di bawah.
          </div>
        ) : (
          <div className="space-y-3">
            {levelPricing.levels.map(level => {
              const discountValue = levelPricing.discountByLevel[level.id] || 0;

              return (
                <div
                  key={level.id}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-700">
                        {level.level_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Diskon item {discountValue || 0}% dari harga jual
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <FormField label="Diskon item (%)">
                      <Input
                        type="number"
                        value={
                          discountValue > 0 ? discountValue.toString() : ''
                        }
                        min={0}
                        max={100}
                        step={0.1}
                        onChange={event =>
                          levelPricing.onDiscountChange(
                            level.id,
                            event.target.value
                          )
                        }
                        placeholder="0"
                        disabled={disabled}
                      />
                    </FormField>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
          {isAddingLevel ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Nama level">
                  <Input
                    value={newLevelName}
                    onChange={event => setNewLevelName(event.target.value)}
                    placeholder="Level baru"
                    disabled={disabled || levelPricing.isCreating}
                  />
                </FormField>
                <FormField label="Persentase harga (%)">
                  <Input
                    type="number"
                    value={newLevelPercentage}
                    min={0}
                    max={100}
                    step={0.1}
                    onChange={event =>
                      setNewLevelPercentage(event.target.value)
                    }
                    placeholder="100"
                    disabled={disabled || levelPricing.isCreating}
                  />
                </FormField>
              </div>
              <FormField label="Deskripsi (opsional)">
                <Input
                  value={newLevelDescription}
                  onChange={event => setNewLevelDescription(event.target.value)}
                  placeholder="Harga khusus untuk member"
                  disabled={disabled || levelPricing.isCreating}
                />
              </FormField>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="text"
                  size="sm"
                  onClick={handleCancelAddLevel}
                  disabled={levelPricing.isCreating}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateLevel}
                  isLoading={levelPricing.isCreating}
                  disabled={!canSaveLevel || levelPricing.isCreating}
                >
                  Simpan Level
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-600">
                Tambah level pelanggan baru dan atur persentasenya.
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleStartAddLevel}
                disabled={disabled}
              >
                Tambah Level
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${stackClassName || ''}`}
      style={stackStyle}
      data-stack-card="true"
    >
      <div
        className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none"
        onClick={() => {
          setMenuOpen(false);
          onExpand?.();
        }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Harga Pokok & Jual
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            ref={menuButtonRef}
            className="p-1 text-slate-500 hover:text-slate-700"
            onClick={event => {
              event.stopPropagation();
              if (disabled) return;
              setMenuOpen(prev => !prev);
            }}
          >
            <IoMenu size={16} />
          </button>
          <FaChevronDown
            size={12}
            className={`text-slate-500 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            key={showLevelPricing ? 'pricing-levels' : 'pricing-default'}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            {showLevelPricing ? (
              renderLevelPricing()
            ) : (
              <div className="p-4 md:p-5 flex flex-col space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Kemasan Dasar">
                    <Input
                      type="text"
                      value={baseUnit}
                      readOnly={true}
                      className="w-full"
                    />
                  </FormField>

                  <PriceInput
                    label="Harga Pokok"
                    name="base_price"
                    value={displayBasePrice}
                    onChange={handleBasePriceChange}
                    tabIndex={12}
                    validationSchema={basePriceSchema}
                    required={true}
                    readOnly={disabled}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6 focus:outline-hidden">
                  <MarginEditor
                    isEditing={marginEditing.isEditing}
                    marginPercentage={marginEditing.percentage}
                    calculatedMargin={calculatedMargin}
                    tabIndex={13}
                    onStartEdit={onStartEditMargin}
                    onStopEdit={onStopEditMargin}
                    onChange={onMarginInputChange}
                    onKeyDown={onMarginKeyDown}
                    disabled={disabled}
                  />

                  <PriceInput
                    label="Harga Jual"
                    name="sell_price"
                    value={displaySellPrice}
                    onChange={onSellPriceChange}
                    tabIndex={14}
                    validationSchema={sellPriceComparisonSchema(
                      displayBasePrice
                    )}
                    required={true}
                    readOnly={disabled}
                  />
                </div>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
      {menuOpen && menuPosition
        ? createPortal(
            <div
              className="fixed z-50"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              <div
                ref={menuRef}
                className="w-[190px] rounded-lg border border-slate-200 bg-white shadow-lg p-1"
              >
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    showLevelPricing
                      ? 'text-emerald-600 bg-emerald-50'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  onClick={() => {
                    if (!onShowLevelPricing) return;
                    onShowLevelPricing();
                    setMenuOpen(false);
                  }}
                >
                  Atur per-level
                </button>
                <div className="px-3 py-2 text-sm text-slate-400 cursor-not-allowed">
                  Atur per-volume
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
