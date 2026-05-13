/// <reference types="vite-plus/client" />

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createTypedCombobox,
  PharmaComboboxSelect,
} from '../../../src/components/combobox';
import '../../../src/App.css';

type MedicineOption = {
  code: string;
  disabled?: boolean;
  id: string;
  name: string;
};

const PrimitiveCombobox = createTypedCombobox<MedicineOption>();

const medicineOptions: MedicineOption[] = [
  { code: 'AMX', id: 'med-amoxicillin', name: 'Amoxicillin 500 mg' },
  { code: 'CTM', id: 'med-ctm', name: 'CTM 4 mg' },
  { code: 'IBU', id: 'med-ibuprofen', name: 'Ibuprofen 200 mg' },
  { code: 'OME', id: 'med-omeprazole', name: 'Omeprazole 20 mg' },
  { code: 'PRC', id: 'med-paracetamol', name: 'Paracetamol Tablet' },
  {
    code: 'RAN',
    disabled: true,
    id: 'med-ranitidine',
    name: 'Ranitidine Nonaktif',
  },
  { code: 'VIT', id: 'med-vitamin-c', name: 'Vitamin C 500 mg' },
];

const categoryOptions: MedicineOption[] = [
  { code: 'ATN', id: 'cat-antiaritmia', name: 'Antiaritmia' },
  { code: 'ATS', id: 'cat-antitusif', name: 'Antitusif' },
  { code: 'AKG', id: 'cat-antikoagulan', name: 'Antikoagulan' },
  { code: 'ACD', id: 'cat-antiacne', name: 'Antiacne' },
  { code: 'AKV', id: 'cat-antikonvulsan', name: 'Antikonvulsan' },
  { code: 'ADB', id: 'cat-antidiabetes', name: 'Antidiabetes' },
  { code: 'ADR', id: 'cat-antidiare', name: 'Antidiare' },
  { code: 'ANL', id: 'cat-analgesik', name: 'Analgesik' },
  { code: 'ANT', id: 'cat-antibiotik', name: 'Antibiotik' },
  { code: 'HST', id: 'cat-antihistamin', name: 'Antihistamin' },
  { code: 'MUK', id: 'cat-mukolitik', name: 'Mukolitik' },
  { code: 'MYD', id: 'cat-mydriatic', name: 'Mydriatic' },
  { code: 'MIN', id: 'cat-mineral', name: 'Mineral' },
  { code: 'NSA', id: 'cat-nsaid', name: 'NSAID' },
  { code: 'NTP', id: 'cat-nootropik', name: 'Nootropik' },
  { code: 'ONK', id: 'cat-onkologi', name: 'Onkologi' },
  { code: 'OFT', id: 'cat-oftalmologi', name: 'Oftalmologi' },
  { code: 'OST', id: 'cat-osteoporosis', name: 'Osteoporosis' },
  { code: 'VIT', id: 'cat-vitamin', name: 'Vitamin' },
];

const optionLabel = (option: MedicineOption) => option.name;
const optionValue = (option: MedicineOption) => option.id;

// eslint-disable-next-line react-refresh/only-export-components -- Playwright fixture entrypoint
function ComboboxRegressionHarness() {
  const [selectedMedicine, setSelectedMedicine] =
    useState<MedicineOption | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<MedicineOption | null>(categoryOptions[10] ?? null);
  const [bottomMedicine, setBottomMedicine] = useState<MedicineOption | null>(
    null
  );
  const [wideMedicine, setWideMedicine] = useState<MedicineOption | null>(null);
  const [primitiveValue, setPrimitiveValue] = useState<MedicineOption | null>(
    null
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 px-4 py-12">
        <div>
          <h1 className="text-xl font-semibold">Combobox regression harness</h1>
          <p className="mt-1 text-sm text-slate-600">
            Browser-only fixture for permanent combobox regressions.
          </p>
        </div>

        <div className="space-y-2">
          <label
            className="block text-sm font-semibold"
            htmlFor="medicine-combobox"
          >
            Obat
          </label>
          <PharmaComboboxSelect<MedicineOption>
            items={medicineOptions}
            value={selectedMedicine}
            onValueChange={setSelectedMedicine}
            item={{
              toLabel: optionLabel,
              toValue: optionValue,
              isDisabled: (option: MedicineOption) => Boolean(option.disabled),
            }}
            field={{
              id: 'medicine-combobox',
              name: 'medicine_id',
              label: 'Obat',
            }}
            display={{
              placeholder: 'Pilih obat',
              indicator: 'check',
              renderOptionMeta: (option: MedicineOption) => option.code,
            }}
            search={{
              placeholder: 'Cari obat',
            }}
          />
        </div>

        <div className="space-y-2">
          <label
            className="block text-sm font-semibold"
            htmlFor="category-combobox"
          >
            Kategori
          </label>
          <PharmaComboboxSelect<MedicineOption>
            items={categoryOptions}
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            item={{
              toLabel: optionLabel,
              toValue: optionValue,
            }}
            field={{
              id: 'category-combobox',
              name: 'category_id',
              label: 'Kategori',
            }}
            display={{
              placeholder: 'Pilih kategori',
              indicator: 'check',
              renderOptionMeta: (option: MedicineOption) => option.code,
            }}
            search={{
              placeholder: 'Cari kategori',
            }}
          />
        </div>

        <div
          data-testid="wide-popup-stage"
          className="flex justify-end space-y-2"
        >
          <div className="w-40 space-y-2">
            <label
              className="block text-sm font-semibold"
              htmlFor="wide-popup-combobox"
            >
              Popup lebar
            </label>
            <PharmaComboboxSelect<MedicineOption>
              items={medicineOptions}
              value={wideMedicine}
              onValueChange={setWideMedicine}
              item={{
                toLabel: optionLabel,
                toValue: optionValue,
              }}
              field={{
                id: 'wide-popup-combobox',
                name: 'wide_medicine_id',
                label: 'Popup lebar',
              }}
              display={{
                placeholder: 'Pilih',
                renderOptionMeta: (option: MedicineOption) => option.code,
              }}
              search={{
                placeholder: 'Cari popup lebar',
              }}
              popup={{
                className:
                  'w-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl',
                matchAnchorWidth: false,
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <PrimitiveCombobox.Root
            items={medicineOptions}
            value={primitiveValue}
            onValueChange={setPrimitiveValue}
            itemToStringLabel={optionLabel}
            itemToStringValue={optionValue}
          >
            <PrimitiveCombobox.Label className="block text-sm font-semibold">
              Primitive custom trigger
            </PrimitiveCombobox.Label>
            <PrimitiveCombobox.Trigger
              id="primitive-custom-trigger"
              className="flex min-h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm"
            >
              <PrimitiveCombobox.Value placeholder="Primitive value" />
            </PrimitiveCombobox.Trigger>
            <PrimitiveCombobox.Portal>
              <PrimitiveCombobox.Positioner sideOffset={4}>
                <PrimitiveCombobox.Popup className="w-full overflow-hidden rounded-lg bg-white shadow-thin-md">
                  <PrimitiveCombobox.List className="max-h-56 overflow-y-auto p-1">
                    {option => (
                      <PrimitiveCombobox.Item
                        key={option.id}
                        disabled={Boolean(option.disabled)}
                        className="cursor-pointer rounded-md px-3 py-2 text-sm text-slate-800 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-emerald-50"
                      >
                        {option.name}
                      </PrimitiveCombobox.Item>
                    )}
                  </PrimitiveCombobox.List>
                </PrimitiveCombobox.Popup>
              </PrimitiveCombobox.Positioner>
            </PrimitiveCombobox.Portal>
          </PrimitiveCombobox.Root>
        </div>
      </section>

      <section
        data-testid="bottom-stage"
        className="flex min-h-screen items-end justify-center bg-white px-4 pb-3"
      >
        <div className="w-full max-w-sm space-y-2">
          <label
            className="block text-sm font-semibold"
            htmlFor="bottom-combobox"
          >
            Posisi bawah
          </label>
          <PharmaComboboxSelect<MedicineOption>
            items={medicineOptions}
            value={bottomMedicine}
            onValueChange={setBottomMedicine}
            item={{
              toLabel: optionLabel,
              toValue: optionValue,
              isDisabled: (option: MedicineOption) => Boolean(option.disabled),
            }}
            field={{
              id: 'bottom-combobox',
              name: 'bottom_medicine_id',
              label: 'Posisi bawah',
            }}
            display={{
              placeholder: 'Pilih obat',
              indicator: 'radio',
            }}
            search={{
              enabled: false,
            }}
          />
        </div>
      </section>
    </main>
  );
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Combobox regression harness root element is missing');
}

createRoot(rootElement).render(<ComboboxRegressionHarness />);
