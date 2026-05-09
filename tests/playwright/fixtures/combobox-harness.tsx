/// <reference types="vite-plus/client" />

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Combobox,
  PharmaComboboxSelect,
} from '../../../src/components/combobox';
import '../../../src/App.css';

type MedicineOption = {
  code: string;
  disabled?: boolean;
  id: string;
  name: string;
};

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

const optionLabel = (option: MedicineOption) => option.name;
const optionValue = (option: MedicineOption) => option.id;

// eslint-disable-next-line react-refresh/only-export-components -- Playwright fixture entrypoint
function ComboboxRegressionHarness() {
  const [selectedMedicine, setSelectedMedicine] =
    useState<MedicineOption | null>(null);
  const [bottomMedicine, setBottomMedicine] = useState<MedicineOption | null>(
    null
  );
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
            id="medicine-combobox"
            name="medicine_id"
            items={medicineOptions}
            value={selectedMedicine}
            onValueChange={setSelectedMedicine}
            itemToStringLabel={optionLabel}
            itemToStringValue={optionValue}
            isItemDisabled={(option: MedicineOption) =>
              Boolean(option.disabled)
            }
            label="Obat"
            placeholder="Pilih obat"
            searchPlaceholder="Cari obat"
            indicator="check"
            renderOptionMeta={(option: MedicineOption) => option.code}
          />
        </div>

        <div className="space-y-2">
          <Combobox.Root
            items={medicineOptions}
            value={primitiveValue}
            onValueChange={setPrimitiveValue}
            itemToStringLabel={optionLabel}
            itemToStringValue={optionValue}
          >
            <Combobox.Label className="block text-sm font-semibold">
              Primitive custom trigger
            </Combobox.Label>
            <Combobox.Trigger
              id="primitive-custom-trigger"
              className="flex min-h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm"
            >
              <Combobox.Value placeholder="Primitive value" />
            </Combobox.Trigger>
            <Combobox.Portal>
              <Combobox.Positioner sideOffset={4}>
                <Combobox.Popup className="w-full overflow-hidden rounded-lg bg-white shadow-thin-md">
                  <Combobox.List className="max-h-56 overflow-y-auto p-1">
                    {medicineOptions.map((option, index) => (
                      <Combobox.Item
                        key={option.id}
                        value={option}
                        index={index}
                        disabled={Boolean(option.disabled)}
                        className="cursor-pointer rounded-md px-3 py-2 text-sm text-slate-800 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-emerald-50"
                      >
                        {option.name}
                      </Combobox.Item>
                    ))}
                  </Combobox.List>
                </Combobox.Popup>
              </Combobox.Positioner>
            </Combobox.Portal>
          </Combobox.Root>
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
            id="bottom-combobox"
            name="bottom_medicine_id"
            items={medicineOptions}
            value={bottomMedicine}
            onValueChange={setBottomMedicine}
            itemToStringLabel={optionLabel}
            itemToStringValue={optionValue}
            isItemDisabled={(option: MedicineOption) =>
              Boolean(option.disabled)
            }
            label="Posisi bawah"
            placeholder="Pilih obat"
            searchable={false}
            indicator="radio"
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
