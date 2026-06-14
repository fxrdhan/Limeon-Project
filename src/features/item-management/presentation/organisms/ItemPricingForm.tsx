import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import {
  TbArrowBackUp,
  TbChevronDown,
  TbMenu2,
  TbSettings,
} from 'react-icons/tb';
import { AnimatePresence, motion } from 'motion/react';
import Switch from '@/components/switch';
import { PharmaEntityComboboxSelect } from '@/components/combobox';
import FormField from '@/components/form-field';
import {
  COLLAPSIBLE_SECTION_HEADER_CLASS,
  SURFACE_CARD_CLASS,
} from '@/styles/uiPrimitives';
import PriceInput from '../atoms/PriceInput';
import MarginEditor from '../atoms/core/MarginEditor';
import {
  basePriceSchema,
  sellPriceComparisonSchema,
} from '@/schemas/manual/itemValidation';
import {
  buildBaselineDrafts,
  buildBaselineUpdates,
  getBaselineCreateState,
  getBaselinePlaceholderName,
} from './item-pricing-form/baselineUtils';
import { BaselineSettingsPortal } from './item-pricing-form/BaselineSettingsPortal';
import { LevelPricingPanel } from './item-pricing-form/LevelPricingPanel';
import { PricingMenuPortal } from './item-pricing-form/PricingMenuPortal';
import type { ItemPricingFormProps } from './item-pricing-form/types';
import { useAnchoredPopover } from './item-pricing-form/useAnchoredPopover';

export default function ItemPricingForm({
  isExpanded = true,
  onExpand,
  stackClassName,
  stackStyle,
  formData,
  displayBasePrice,
  displaySellPrice,
  baseUnitId,
  baseUnit,
  baseUnitOptions,
  marginEditing,
  calculatedMargin,
  onBaseUnitChange,
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
  const [baselineOpen, setBaselineOpen] = useState(false);
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
  const baselineNameInputRef = useRef<HTMLInputElement | null>(null);
  const baselineDiscountInputRef = useRef<HTMLInputElement | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const pendingFocusRef = useRef(false);

  const {
    anchorRef: menuButtonRef,
    popoverRef: menuRef,
    position: menuPosition,
  } = useAnchoredPopover({
    isOpen: menuOpen,
    menuWidth: 190,
    setIsOpen: setMenuOpen,
  });
  const {
    anchorRef: baselineButtonRef,
    popoverRef: baselineRef,
    position: baselinePosition,
  } = useAnchoredPopover({
    isOpen: baselineOpen,
    menuWidth: 260,
    setIsOpen: setBaselineOpen,
  });

  const handleBasePriceChange = (event: ChangeEvent<HTMLInputElement>) => {
    onBasePriceChange(event);
    setTimeout(() => {
      if (formData.base_price > 0 && calculatedMargin !== null) {
        onMarginChange(calculatedMargin.toFixed(1));
      }
    }, 0);
  };

  const fetchBaseUnitHoverDetail = useCallback(
    async (unitId: string) =>
      baseUnitOptions.find(unit => unit.id === unitId) ?? null,
    [baseUnitOptions]
  );

  const resetBaselineAddForm = useCallback(() => {
    setBaselineAddOpen(false);
    setBaselineNewName('');
    setBaselineNewDiscount('');
  }, []);

  const closeBaselinePopover = useCallback(() => {
    setBaselineOpen(false);
    resetBaselineAddForm();
  }, [resetBaselineAddForm]);

  const hideLevelPricing = useCallback(() => {
    setLevelInputValues({});
    closeBaselinePopover();
    onHideLevelPricing?.();
  }, [closeBaselinePopover, onHideLevelPricing]);

  const openBaselineModal = () => {
    if (!levelPricing) return;
    if (baselineOpen) {
      closeBaselinePopover();
      return;
    }

    setBaselineDrafts(buildBaselineDrafts(levelPricing.levels));
    resetBaselineAddForm();
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

  const {
    canCreate: canCreateBaselineLevel,
    normalizedDiscount: normalizedNewBaselineDiscount,
    pricePercentage: newBaselinePricePercentage,
  } = getBaselineCreateState(baselineNewDiscount);

  const handleAddBaselineLevel = async () => {
    if (!levelPricing) return;

    if (!baselineAddOpen) {
      setBaselineAddOpen(true);
      setBaselineNewName('');
      setBaselineNewDiscount('');
      return;
    }

    if (!canCreateBaselineLevel || levelPricing.isCreating) return;

    const created = await levelPricing.onCreateLevel({
      level_name:
        baselineNewName.trim() ||
        getBaselinePlaceholderName(levelPricing.levels),
      price_percentage: newBaselinePricePercentage,
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

    const updates = buildBaselineUpdates(levelPricing.levels, baselineDrafts);

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

  useEffect(() => {
    if (!baselineOpen || !baselineAddOpen) return;
    baselineNameInputRef.current?.focus();
  }, [baselineAddOpen, baselineOpen]);

  const handleHeaderToggle = () => {
    setMenuOpen(false);
    if (showLevelPricing) {
      hideLevelPricing();
      return;
    }
    onExpand?.();
  };

  const focusFirstField = useCallback(() => {
    const container = sectionRef.current?.querySelector<HTMLElement>(
      '[data-section-content]'
    );
    if (!container) return;
    const basePriceInput = container.querySelector<HTMLInputElement>(
      'input[name="base_price"]'
    );
    if (basePriceInput) {
      basePriceInput.focus();
      return;
    }
    const firstFocusable = container.querySelector<HTMLElement>(
      'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }, []);

  useEffect(() => {
    if (!isExpanded || !pendingFocusRef.current) return;
    pendingFocusRef.current = false;
    requestAnimationFrame(() => focusFirstField());
  }, [focusFirstField, isExpanded]);

  return (
    <section
      ref={sectionRef}
      className={`${SURFACE_CARD_CLASS} ${stackClassName || ''}`}
      style={stackStyle}
      data-stack-card="true"
    >
      <div
        className={COLLAPSIBLE_SECTION_HEADER_CLASS}
        onClick={handleHeaderToggle}
        onFocus={event => {
          if (!isExpanded && event.currentTarget.matches(':focus-visible')) {
            pendingFocusRef.current = true;
            onExpand?.();
          }
        }}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            pendingFocusRef.current = true;
            handleHeaderToggle();
          }
        }}
        tabIndex={21}
        role="button"
        aria-expanded={isExpanded}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          {showLevelPricing
            ? 'Pengaturan Level Pelanggan'
            : 'Unit & Harga Dasar'}
        </h2>
        <div className="flex items-center gap-1">
          {showLevelPricing ? (
            <div
              onClick={event => event.stopPropagation()}
              onMouseDown={event => event.stopPropagation()}
              role="presentation"
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
                hideLevelPricing();
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
              levelPricing ? (
                <LevelPricingPanel
                  disabled={disabled}
                  formData={formData}
                  isLevelPricingActive={isLevelPricingActive}
                  levelInputValues={levelInputValues}
                  levelPricing={levelPricing}
                  setLevelInputValues={setLevelInputValues}
                />
              ) : null
            ) : (
              <div
                className="p-4 md:p-5 flex flex-col space-y-4"
                data-section-content="true"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Unit Dasar" required={true}>
                    <div className="space-y-2">
                      <PharmaEntityComboboxSelect
                        items={baseUnitOptions}
                        valueId={baseUnitId}
                        onValueIdChange={onBaseUnitChange}
                        field={{
                          name: 'base_inventory_unit_id',
                          required: true,
                        }}
                        display={{ placeholder: 'Pilih Unit Dasar' }}
                        validation={{
                          enabled: true,
                          autoHide: true,
                          autoHideDelay: 3000,
                        }}
                        hoverDetail={{
                          enabled: true,
                          delay: 400,
                          fetch: fetchBaseUnitHoverDetail,
                        }}
                        interaction={{ disabled }}
                      />
                      <p className="text-xs text-slate-500">
                        Harga pokok dan harga jual dihitung per{' '}
                        <span className="font-semibold text-slate-700">
                          {baseUnit || 'unit dasar'}
                        </span>
                        .
                      </p>
                    </div>
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

      <PricingMenuPortal
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onShowLevelPricing={onShowLevelPricing}
        position={menuPosition}
        popoverRef={menuRef}
        showLevelPricing={showLevelPricing}
      />
      <BaselineSettingsPortal
        baselineAddOpen={baselineAddOpen}
        baselineDiscountInputRef={baselineDiscountInputRef}
        baselineDrafts={baselineDrafts}
        baselineNameInputRef={baselineNameInputRef}
        baselineNewDiscount={baselineNewDiscount}
        baselineNewName={baselineNewName}
        canCreateBaselineLevel={canCreateBaselineLevel}
        disabled={disabled}
        handleAddBaselineLevel={handleAddBaselineLevel}
        handleBaselineChange={handleBaselineChange}
        handleDeleteBaselineLevel={handleDeleteBaselineLevel}
        handleSaveBaseline={handleSaveBaseline}
        isBaselineAddActive={isBaselineAddActive}
        isOpen={baselineOpen}
        isSavingBaseline={isSavingBaseline}
        levelPricing={levelPricing}
        onClose={closeBaselinePopover}
        popoverRef={baselineRef}
        position={baselinePosition}
        setBaselineNewDiscount={setBaselineNewDiscount}
        setBaselineNewName={setBaselineNewName}
      />
    </section>
  );
}
