# Dropdown Component

`Dropdown` adalah komponen form terkontrol berbasis Base UI Combobox. Public API tetap memakai tipe `DropdownProps` dan `CheckboxDropdownProps` dari `src/types/components.ts`, sehingga pemakai yang mengimpor `@/components/dropdown` tidak perlu mengubah kontrak props.

## Fitur

- Single-select dengan value `string`.
- Multi-select dengan `withCheckbox` dan value `string[]`.
- Indikator visual radio lewat `withRadio`.
- Search client-side dengan fuzzy matching dan highlight karakter yang cocok.
- Add-new action saat hasil pencarian kosong.
- Required validation melalui `ValidationOverlay`.
- Popup portal dan positioning Base UI/Floating UI.
- Persisted open dan frozen menu untuk workflow add-new modal.
- Hover-to-open.
- Hover detail portal.
- Auto-scroll ke pilihan aktif saat popup dibuka.
- Virtualisasi ringan untuk list besar.

## Struktur

```txt
dropdown/
|-- index.tsx                  # Implementasi Base UI Combobox
|-- constants.ts               # Konstanta layout, timing, search, validation
|-- README.md
|-- index.test.tsx             # Test perilaku publik dropdown
`-- utils/
    |-- dropdownUtils.ts       # Search scoring, filtering, match ranges
    `-- dropdownUtils.test.ts
```

## Import

```tsx
import Dropdown from '@/components/dropdown';
import type { DropdownOption } from '@/types';
```

## Single Select

```tsx
<Dropdown
  name="supplier_id"
  value={supplierId}
  onChange={setSupplierId}
  options={supplierOptions}
  placeholder="-- Pilih Supplier --"
/>
```

## Checkbox Multi Select

```tsx
<Dropdown
  name="visible_columns"
  value={selectedColumnIds}
  onChange={setSelectedColumnIds}
  options={columnOptions}
  withCheckbox
/>
```

## Add New

`onAddNew` dipanggil dengan search term aktif ketika user menekan Enter pada hasil kosong atau tombol plus. Popup akan tetap terbuka melalui state internal/persisted agar workflow modal bisa mempertahankan konteks pilihan.

```tsx
<Dropdown
  name="manufacturer_id"
  value={manufacturerId}
  onChange={setManufacturerId}
  options={manufacturerOptions}
  onAddNew={searchTerm => openManufacturerModal(searchTerm)}
  persistOpen={persistedDropdownName === 'manufacturer_id'}
  freezePersistedMenu={isManufacturerModalOpen}
  onPersistOpenClear={clearPersistedDropdown}
/>
```
