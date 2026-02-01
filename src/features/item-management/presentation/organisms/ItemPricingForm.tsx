import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  TbArrowBack,
  TbArrowBackUp,
  TbChevronDown,
  TbMenu2,
  TbSettings,
  TbTrash,
} from 'react-icons/tb';
import { AnimatePresence, motion } from 'motion/react';
import Switch from '@/components/switch';
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
    is_level_pricing_active?: boolean;
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
  isLevelPricingActive?: boolean;
  onLevelPricingActiveChange?: (active: boolean) => void;
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
    onUpdateLevels: (
      payload: { id: string; price_percentage: number }[]
    ) => Promise<{ id: string; price_percentage: number }[]>;
    isUpdating: boolean;
    onDeleteLevel: (payload: {
      id: string;
      levels: CustomerLevel[];
    }) => Promise<{ id: string }>;
    isDeleting: boolean;
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
  isLevelPricingActive,
  onLevelPricingActiveChange,
  showLevelPricing = false,
  onShowLevelPricing,
  onHideLevelPricing,
  levelPricing,
  disabled = false,
}: ItemPricingFormProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [baselineOpen, setBaselineOpen] = useState(false);
  const [baselinePosition, setBaselinePosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [levelInputValues, setLevelInputValues] = useState<
    Record<string, string>
  >({});
  const [baselineDrafts, setBaselineDrafts] = useState<Record<string, string>>(
    {}
  );
  const [isSavingBaseline, setIsSavingBaseline] = useState(false);
  const [baselineAddOpen, setBaselineAddOpen] = useState(false);
  const [baselineNewName, setBaselineNewName] = useState('');
  const [baselineNewDiscount, setBaselineNewDiscount] = useState('');
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const baselineButtonRef = useRef<HTMLButtonElement | null>(null);
  const baselineRef = useRef<HTMLDivElement | null>(null);
  const baselineNameInputRef = useRef<HTMLInputElement | null>(null);
  const baselineDiscountInputRef = useRef<HTMLInputElement | null>(null);

  const handleBasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBasePriceChange(e);
    setTimeout(() => {
      if (formData.base_price > 0 && calculatedMargin !== null) {
        onMarginChange(calculatedMargin.toFixed(1));
      }
    }, 0);
  };

  const openBaselineModal = () => {
    if (!levelPricing) return;
    if (baselineOpen) {
      setBaselineOpen(false);
      setBaselineAddOpen(false);
      setBaselineNewName('');
      setBaselineNewDiscount('');
      return;
    }
    const drafts: Record<string, string> = {};
    levelPricing.levels.forEach(level => {
      const baselineDiscount = Math.max(
        0,
        100 - Number(level.price_percentage || 0)
      );
      drafts[level.id] = baselineDiscount.toString();
    });
    setBaselineDrafts(drafts);
    setBaselineAddOpen(false);
    setBaselineNewName('');
    setBaselineNewDiscount('');
    setMenuOpen(false);
    setBaselineOpen(true);
  };

  const handleBaselineChange = (levelId: string, value: string) => {
    setBaselineDrafts(prev => ({
      ...prev,
      [levelId]: value,
    }));
  };

  const handleDeleteBaselineLevel = async (levelId: string) => {
    if (!levelPricing) return;
    if (levelPricing.isDeleting) return;

    await levelPricing.onDeleteLevel({
      id: levelId,
      levels: levelPricing.levels,
    });

    setBaselineDrafts(prev => {
      if (!Object.prototype.hasOwnProperty.call(prev, levelId)) {
        return prev;
      }
      const next = { ...prev };
      delete next[levelId];
      return next;
    });
  };

  const parsedNewBaselineDiscount = baselineNewDiscount.trim()
    ? Number(baselineNewDiscount.replace(',', '.'))
    : 0;
  const normalizedNewBaselineDiscount = Number.isNaN(parsedNewBaselineDiscount)
    ? 0
    : Math.min(Math.max(parsedNewBaselineDiscount, 0), 100);
  const canCreateBaselineLevel =
    baselineNewDiscount.trim().length > 0 &&
    !Number.isNaN(parsedNewBaselineDiscount);

  const handleAddBaselineLevel = async () => {
    if (!levelPricing) return;

    if (!baselineAddOpen) {
      setBaselineAddOpen(true);
      setBaselineNewName('');
      setBaselineNewDiscount('');
      return;
    }

    if (!canCreateBaselineLevel || levelPricing.isCreating) return;

    const placeholderName = `Level ${levelPricing.levels.length + 1}`;
    const created = await levelPricing.onCreateLevel({
      level_name: baselineNewName.trim() || placeholderName,
      price_percentage: Math.max(0, 100 - normalizedNewBaselineDiscount),
      description: null,
    });

    setBaselineDrafts(prev => ({
      ...prev,
      [created.id]: normalizedNewBaselineDiscount.toString(),
    }));
    setBaselineAddOpen(false);
    setBaselineNewName('');
    setBaselineNewDiscount('');
  };

  const isBaselineAddActive =
    baselineAddOpen &&
    canCreateBaselineLevel &&
    !disabled &&
    !levelPricing?.isCreating;

  const handleSaveBaseline = async () => {
    if (!levelPricing) return;
    if (levelPricing.isUpdating) return;

    const updates = levelPricing.levels
      .map(level => {
        const currentDiscount = Math.max(
          0,
          100 - Number(level.price_percentage || 0)
        );
        const rawValue = baselineDrafts[level.id] ?? currentDiscount.toString();
        const parsedValue = rawValue.trim()
          ? Number(rawValue.replace(',', '.'))
          : 0;
        const normalized = Number.isNaN(parsedValue)
          ? 0
          : Math.min(Math.max(parsedValue, 0), 100);
        const nextPricePercentage = Math.max(0, 100 - normalized);

        return {
          id: level.id,
          price_percentage: nextPricePercentage,
          hasChange: Math.abs(normalized - currentDiscount) > 0.001,
        };
      })
      .filter(update => update.hasChange)
      .map(({ id, price_percentage }) => ({ id, price_percentage }));

    if (!updates.length) {
      setBaselineOpen(false);
      return;
    }

    try {
      setIsSavingBaseline(true);
      await levelPricing.onUpdateLevels(updates);
      setBaselineOpen(false);
    } finally {
      setIsSavingBaseline(false);
    }
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

  const updateBaselinePosition = useCallback(() => {
    if (!baselineButtonRef.current) return;
    const rect = baselineButtonRef.current.getBoundingClientRect();
    const menuWidth = 260;
    const left = Math.max(12, rect.right - menuWidth);
    setBaselinePosition({
      top: rect.bottom + 8,
      left,
    });
  }, []);

  useEffect(() => {
    if (!baselineOpen) return;
    updateBaselinePosition();

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (baselineRef.current?.contains(target)) return;
      if (baselineButtonRef.current?.contains(target)) return;
      setBaselineOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBaselineOpen(false);
    };

    const handleReposition = () => updateBaselinePosition();

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
  }, [baselineOpen, updateBaselinePosition]);

  useEffect(() => {
    if (!baselineOpen || !baselineAddOpen) return;
    baselineNameInputRef.current?.focus();
  }, [baselineAddOpen, baselineOpen]);

  const renderLevelPricing = () => {
    if (!levelPricing) return null;
    const levelPricingEnabled =
      isLevelPricingActive ?? formData.is_level_pricing_active ?? true;

    return (
      <div className="p-4 md:p-5 space-y-4">
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
              const baselineDiscount = Math.max(
                0,
                100 - Number(level.price_percentage || 0)
              );
              const hasOverride = Object.prototype.hasOwnProperty.call(
                levelPricing.discountByLevel,
                level.id
              );
              const overrideDiscount =
                levelPricing.discountByLevel[level.id] ?? 0;
              const displayDiscount = hasOverride
                ? overrideDiscount
                : baselineDiscount;
              const hasInputValue = Object.prototype.hasOwnProperty.call(
                levelInputValues,
                level.id
              );
              const inputValue = hasInputValue
                ? levelInputValues[level.id]
                : displayDiscount.toString();
              const finalPrice =
                (formData.sell_price || 0) * (1 - displayDiscount / 100);

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
                        Diskon item {displayDiscount}% dari harga jual
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-700">
                      Diskon item (%)
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        value={inputValue}
                        min={0}
                        max={100}
                        step={0.1}
                        onChange={event => {
                          const nextValue = event.target.value;
                          setLevelInputValues(prev => ({
                            ...prev,
                            [level.id]: nextValue,
                          }));
                          levelPricing.onDiscountChange(level.id, nextValue);
                        }}
                        onBlur={() => {
                          setLevelInputValues(prev => {
                            if (
                              !Object.prototype.hasOwnProperty.call(
                                prev,
                                level.id
                              )
                            ) {
                              return prev;
                            }
                            if (prev[level.id] !== '') {
                              return prev;
                            }
                            const next = { ...prev };
                            delete next[level.id];
                            return next;
                          });
                        }}
                        placeholder="0"
                        disabled={disabled || !levelPricingEnabled}
                        className="w-24"
                      />
                      <Input
                        value={formatRupiah(finalPrice)}
                        readOnly
                        disabled
                        className="w-32"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50">
          <div className="px-4 py-3 text-sm text-slate-500">
            Tambah level hanya tersedia lewat menu baseline.
          </div>
        </div>
      </div>
    );
  };

  const handleHeaderToggle = () => {
    setMenuOpen(false);
    if (showLevelPricing) {
      setLevelInputValues({});
      setBaselineOpen(false);
      setBaselineAddOpen(false);
      setBaselineNewName('');
      setBaselineNewDiscount('');
      onHideLevelPricing?.();
      return;
    }
    onExpand?.();
  };

  const sectionRef = useRef<HTMLElement>(null);
  const focusFirstField = () => {
    const container = sectionRef.current?.querySelector<HTMLElement>(
      '[data-section-content]'
    );
    if (!container) return;
    const firstFocusable = container.querySelector<HTMLElement>(
      'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  };

  return (
    <section
      ref={sectionRef}
      className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${stackClassName || ''}`}
      style={stackStyle}
      data-stack-card="true"
    >
      <div
        className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none"
        onClick={handleHeaderToggle}
        onFocus={event => {
          if (!isExpanded && event.currentTarget.matches(':focus-visible')) {
            onExpand?.();
            setTimeout(focusFirstField, 0);
          }
        }}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleHeaderToggle();
            setTimeout(focusFirstField, 0);
          }
        }}
        tabIndex={21}
        role="button"
        aria-expanded={isExpanded}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          {showLevelPricing
            ? 'Pengaturan Level Pelanggan'
            : 'Harga Pokok & Jual'}
        </h2>
        <div className="flex items-center gap-1">
          {showLevelPricing ? (
            <div
              onClick={event => event.stopPropagation()}
              onMouseDown={event => event.stopPropagation()}
            >
              <Switch
                size="small"
                checked={
                  isLevelPricingActive ??
                  formData.is_level_pricing_active ??
                  true
                }
                disabled={disabled}
                onChange={(checked: boolean) =>
                  onLevelPricingActiveChange?.(checked)
                }
              />
            </div>
          ) : null}
          {showLevelPricing ? (
            <button
              type="button"
              ref={baselineButtonRef}
              className="p-1 -ml-1 mr-2 text-slate-500 hover:text-slate-700 cursor-pointer"
              onClick={event => {
                event.stopPropagation();
                if (disabled) return;
                openBaselineModal();
              }}
            >
              <TbSettings size={18} />
            </button>
          ) : null}
          {isExpanded ? (
            <button
              type="button"
              ref={menuButtonRef}
              className="p-1 -ml-2 text-slate-500 hover:text-slate-700 cursor-pointer"
              onClick={event => {
                event.stopPropagation();
                if (disabled) return;
                setMenuOpen(prev => !prev);
              }}
            >
              <TbMenu2 size={18} />
            </button>
          ) : null}
          {showLevelPricing ? (
            <button
              type="button"
              className="p-1 text-slate-500 hover:text-slate-700 cursor-pointer"
              onClick={event => {
                event.stopPropagation();
                setLevelInputValues({});
                setBaselineOpen(false);
                setBaselineAddOpen(false);
                setBaselineNewName('');
                setBaselineNewDiscount('');
                onHideLevelPricing?.();
              }}
            >
              <TbArrowBackUp size={18} />
            </button>
          ) : (
            <TbChevronDown
              size={18}
              className={`text-slate-500 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          )}
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
              <div
                className="p-4 md:p-5 flex flex-col space-y-4"
                data-section-content="true"
              >
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
                    tabIndex={22}
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
                    tabIndex={23}
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
                    tabIndex={24}
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
      {createPortal(
        <AnimatePresence>
          {menuOpen && menuPosition ? (
            <motion.div
              className="fixed z-50"
              style={{ top: menuPosition.top, left: menuPosition.left }}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <div
                ref={menuRef}
                className="w-[190px] rounded-lg border border-slate-200 bg-white shadow-lg p-1"
              >
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
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
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      )}
      {createPortal(
        <AnimatePresence>
          {baselineOpen && baselinePosition && levelPricing ? (
            <motion.div
              className="fixed z-50"
              style={{ top: baselinePosition.top, left: baselinePosition.left }}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <div
                ref={baselineRef}
                className="w-[260px] rounded-lg border border-slate-200 bg-white shadow-lg"
              >
                <div className="px-3 py-2 border-b border-slate-200 text-sm font-semibold text-slate-700">
                  Atur baseline
                </div>
                <div className="p-3 space-y-3">
                  {levelPricing.levels.map(level => {
                    const currentDiscount = Math.max(
                      0,
                      100 - Number(level.price_percentage || 0)
                    );
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
                                handleSaveBaseline();
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
                            onClick={() => handleDeleteBaselineLevel(level.id)}
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
                    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-2 space-y-2">
                      <Input
                        ref={baselineNameInputRef}
                        value={baselineNewName}
                        onChange={event =>
                          setBaselineNewName(event.target.value)
                        }
                        placeholder={`Level ${levelPricing.levels.length + 1}`}
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
                              handleAddBaselineLevel();
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
                              handleAddBaselineLevel();
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
                    onClick={() => {
                      setBaselineOpen(false);
                      setBaselineAddOpen(false);
                      setBaselineNewName('');
                      setBaselineNewDiscount('');
                    }}
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
      )}
    </section>
  );
}
