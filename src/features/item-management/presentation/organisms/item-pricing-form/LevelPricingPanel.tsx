import Input from '@/components/input';
import { formatRupiah } from '@/lib/formatters';
import { getBaselineDiscount } from './baselineUtils';
import type {
  ItemPricingFormProps,
  LevelPricingConfig,
  StringRecordSetter,
} from './types';

interface LevelPricingPanelProps {
  disabled: boolean;
  formData: ItemPricingFormProps['formData'];
  isLevelPricingActive?: boolean;
  levelInputValues: Record<string, string>;
  levelPricing: LevelPricingConfig;
  setLevelInputValues: StringRecordSetter;
}

export function LevelPricingPanel({
  disabled,
  formData,
  isLevelPricingActive,
  levelInputValues,
  levelPricing,
  setLevelInputValues,
}: LevelPricingPanelProps) {
  const levelPricingEnabled =
    isLevelPricingActive ?? formData.is_level_pricing_active ?? true;

  return (
    <div className="p-4 md:p-5 space-y-4">
      {levelPricing.isLoading ? (
        <div className="text-sm text-slate-500">Memuat level pelanggan...</div>
      ) : levelPricing.levels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Belum ada level pelanggan. Tambahkan level baru di bawah.
        </div>
      ) : (
        <div className="space-y-3">
          {levelPricing.levels.map(level => {
            const baselineDiscount = getBaselineDiscount(level);
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
                className="rounded-xl border border-slate-200 bg-white p-4"
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
                  <div className="text-sm text-slate-700">Diskon item (%)</div>
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

      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50">
        <div className="px-4 py-3 text-sm text-slate-500">
          Tambah level hanya tersedia lewat menu baseline.
        </div>
      </div>
    </div>
  );
}
