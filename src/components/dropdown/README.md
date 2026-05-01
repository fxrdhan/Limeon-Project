# Dropdown Component

Komponen `Dropdown` adalah komponen React terkontrol untuk memilih opsi tunggal atau banyak opsi dari daftar `DropdownOption`. Implementasinya berada di `src/components/dropdown`, sedangkan kontrak tipe publiknya diekspor dari `src/types/components.ts`.

## Ringkasan

`Dropdown` menangani beberapa workflow form yang umum dipakai di PharmaSys:

- Single-select default untuk field relasional seperti kategori, produsen, supplier, status, dan metode pembayaran.
- Single-select dengan indikator radio melalui `withRadio`.
- Multi-select dengan checkbox melalui `withCheckbox`.
- Search client-side dengan fuzzy matching, debounced filtering, highlight hasil pencarian, dan tombol add-new saat hasil kosong.
- Validasi required dengan integrasi `ValidationOverlay`.
- Portal menu ke `document.body` agar tidak terpotong container parent.
- Positioning otomatis terhadap viewport, termasuk opsi manual `top`, `bottom`, dan `left`.
- Hover detail portal untuk menampilkan metadata opsi tanpa mengubah pilihan.
- Keyboard navigation, focus management, auto-scroll ke opsi terpilih, dan virtualisasi untuk list besar.

## Import

```tsx
import Dropdown from '@/components/dropdown';
import type { DropdownOption, HoverDetailData } from '@/types';
```

## Struktur File

```txt
dropdown/
|-- index.tsx                         # Root orchestrator dan public component
|-- constants.ts                      # Timing, keyboard keys, search states, layout constants
|-- components/
|   |-- DropdownButton.tsx            # Trigger button
|   |-- DropdownMenu.tsx              # Portal content orchestrator
|   |-- HoverDetailPortal.tsx         # Detail popup untuk opsi
|   |-- OptionItem.tsx                # Adapter context ke OptionRow
|   |-- SearchBar.tsx                 # Search input dan add-new action
|   |-- button/                       # Button primitive khusus dropdown
|   |-- menu/                         # Portal, content wrapper, empty state, scroll indicators
|   |-- options/                      # Option row, radio indicator, checkbox indicator
|   `-- search/                       # Search input, icon, add-new button
|-- hooks/
|   |-- useDropdownState.ts           # Open, close, closing animation, active dropdown singleton
|   |-- useDropdownSearch.ts          # Search term, debounce, filter, sort, search state
|   |-- useDropdownValidation.ts      # Required validation state
|   |-- useDropdownPosition.ts        # Portal positioning and width calculation
|   |-- useKeyboardNavigation.ts      # Arrow, Tab, PageUp, PageDown, Enter, Escape
|   |-- useFocusManagement.ts         # Focus-out close and delayed focus handling
|   |-- useScrollManagement.ts        # Scroll indicators and selected-option restoration
|   |-- useDropdownEffects.ts         # Open side effects, hover-to-open, listeners
|   |-- useDropdownVirtualization.ts  # Windowed rendering for large option lists
|   |-- useHoverDetail.ts             # Hover detail visibility, fetch, suppression
|   `-- useTextExpansion.ts           # Truncated text expansion state
|-- providers/
|   |-- DropdownContext.tsx
|   `-- dropdownContext.ts
|-- types/
|   |-- components.ts
|   |-- context.ts
|   |-- hooks.ts
|   `-- index.ts
`-- utils/
    `-- dropdownUtils.ts              # Search scoring, sorting, match ranges, icon color
```

## Data Model

### DropdownOption

```ts
export interface DropdownOption {
  id: string;
  name: string;
  code?: string;
  description?: string;
  metaLabel?: string;
  metaTone?: 'default' | 'info' | 'success' | 'warning';
  updated_at?: string | null;
}
```

`id` adalah value yang dikirim ke `onChange`. `name` adalah label utama. Field opsional dipakai untuk search display, badge kecil pada trigger atau hover detail, dan payload dasar sebelum `onFetchHoverDetail` selesai.

### HoverDetailData

```ts
export interface HoverDetailData {
  id: string;
  code?: string;
  name: string;
  description?: string;
  metaLabel?: string;
  metaTone?: 'default' | 'info' | 'success' | 'warning';
  created_at?: string;
  updated_at?: string | null;
}
```

## API Props

### Single Selection

```ts
export interface DropdownProps {
  mode?: 'input' | 'text';
  options: DropdownOption[];
  value: string;
  tabIndex?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  name: string;
  required?: boolean;
  disabled?: boolean;
  onAddNew?: (searchTerm?: string) => void;
  persistOpen?: boolean;
  onPersistOpenClear?: () => void;
  freezePersistedMenu?: boolean;
  withRadio?: boolean;
  searchList?: boolean;
  autoScrollOnOpen?: boolean;
  validate?: boolean;
  showValidationOnBlur?: boolean;
  validationAutoHide?: boolean;
  validationAutoHideDelay?: number;
  hoverToOpen?: boolean;
  portalWidth?: string | number;
  position?: 'auto' | 'top' | 'bottom' | 'left';
  align?: 'left' | 'right';
  enableHoverDetail?: boolean;
  hoverDetailDelay?: number;
  onFetchHoverDetail?: (optionId: string) => Promise<HoverDetailData | null>;
}
```

### Multiple Selection

```ts
export interface CheckboxDropdownProps extends Omit<
  DropdownProps,
  'value' | 'onChange' | 'withRadio'
> {
  value: string[];
  onChange: (value: string[]) => void;
  withCheckbox: true;
}
```

`withCheckbox` mengubah kontrak `value` dan `onChange` menjadi array. `withRadio` hanya mengubah affordance visual single-select dan tidak mengubah tipe value.

## Defaults

| Prop                   | Default         | Catatan                                                                        |
| ---------------------- | --------------- | ------------------------------------------------------------------------------ |
| `mode`                 | `'input'`       | Trigger tampil seperti form control.                                           |
| `placeholder`          | `'-- Pilih --'` | Ditampilkan saat belum ada selected option.                                    |
| `persistOpen`          | `false`         | Menu normalnya tertutup setelah select single option atau outside interaction. |
| `freezePersistedMenu`  | `false`         | Saat `true`, portal tetap terlihat tetapi non-interactive.                     |
| `searchList`           | `true`          | Menampilkan search input di bagian atas menu.                                  |
| `autoScrollOnOpen`     | `true`          | Scroll list ke selected option saat pertama dibuka.                            |
| `required`             | `false`         | Mengaktifkan validasi required di hook.                                        |
| `disabled`             | `false`         | Menonaktifkan trigger dan handler interaksi.                                   |
| `validate`             | `false`         | Merender `ValidationOverlay` jika error perlu ditampilkan.                     |
| `showValidationOnBlur` | `true`          | Menampilkan overlay saat blur jika invalid.                                    |
| `validationAutoHide`   | `true`          | Diteruskan ke `ValidationOverlay`.                                             |
| `portalWidth`          | `'auto'`        | Lebar mengikuti trigger.                                                       |
| `position`             | `'auto'`        | Memilih atas atau bawah berdasarkan ruang viewport.                            |
| `align`                | `'right'`       | Right edge portal sejajar dengan right edge trigger.                           |
| `enableHoverDetail`    | `false`         | Hover detail tidak aktif kecuali diminta.                                      |
| `hoverDetailDelay`     | `800`           | Delay awal sebelum detail muncul.                                              |

## Basic Usage

### Single Select

```tsx
const [supplierId, setSupplierId] = useState('');

const suppliers: DropdownOption[] = [
  { id: 'supplier-a', name: 'Supplier A' },
  { id: 'supplier-b', name: 'Supplier B' },
];

<Dropdown
  name="supplier_id"
  value={supplierId}
  onChange={setSupplierId}
  options={suppliers}
  placeholder="-- Pilih Supplier --"
/>;
```

### Radio Style Single Select

Gunakan `withRadio` untuk pilihan enum yang tidak memerlukan search.

```tsx
<Dropdown
  name="payment_status"
  value={paymentStatus}
  onChange={setPaymentStatus}
  options={[
    { id: 'unpaid', name: 'Belum Dibayar' },
    { id: 'partial', name: 'Sebagian' },
    { id: 'paid', name: 'Lunas' },
  ]}
  withRadio
  searchList={false}
/>
```

### Checkbox Multi Select

```tsx
const [selectedIds, setSelectedIds] = useState<string[]>([]);

<Dropdown
  name="visible_columns"
  value={selectedIds}
  onChange={setSelectedIds}
  options={columnOptions}
  withCheckbox
/>;
```

Dalam mode checkbox, klik opsi akan toggle item di array dan menu tetap terbuka agar pengguna bisa memilih beberapa opsi.

### Text Mode Untuk Compact Controls

`mode="text"` dipakai untuk trigger kecil seperti selector bulan dan tahun pada calendar header.

```tsx
<Dropdown
  mode="text"
  portalWidth="120px"
  position="bottom"
  align="left"
  name="month-selector"
  value={month}
  onChange={setMonth}
  options={monthOptions}
  searchList={false}
/>
```

## Validasi

Validasi required dikelola oleh `useDropdownValidation`.

```tsx
<Dropdown
  name="category_id"
  value={categoryId}
  onChange={setCategoryId}
  options={categories}
  placeholder="Pilih Kategori"
  required
  validate
  showValidationOnBlur
  validationAutoHide
  validationAutoHideDelay={3000}
/>
```

Aturan penting:

- `required` mengecek value kosong dan menghasilkan pesan `Pilihan harus diisi`.
- `validate` diperlukan jika error harus tampil melalui `ValidationOverlay`.
- `required` tanpa `validate` tetap mempengaruhi state error trigger, tetapi overlay tidak dirender karena root component hanya merender `ValidationOverlay` saat `validate` bernilai `true`.
- Error dibersihkan setelah value valid dipilih.
- Untuk checkbox dropdown, validasi root saat ini mengevaluasi array dengan mengambil value pertama jika array tidak kosong.

## Search

Search aktif secara default melalui `searchList={true}`. Flow-nya:

1. User mengetik di search input, atau mengetik printable key pada trigger saat menu terbuka.
2. `useDropdownSearch` menyimpan `searchTerm` langsung dan `debouncedSearchTerm` setelah `DROPDOWN_CONSTANTS.DEBOUNCE_DELAY` (`150ms`).
3. `filterAndSortOptions` mencari opsi dengan `includes` atau `fuzzyMatch`.
4. Hasil diurutkan dengan score:
   - exact name match
   - name prefix
   - exact token
   - token prefix
   - token contains
   - name contains
   - fuzzy match
5. `OptionRow` menebalkan karakter yang cocok berdasarkan `getDropdownOptionMatchRanges`.

Jika `searchList={false}`, search input tidak dirender. Keyboard navigation tetap berjalan pada listbox untuk tombol navigasi.

## Add New Flow

`onAddNew` aktif ketika search tidak menemukan opsi dan search term tidak kosong.

```tsx
<Dropdown
  name="manufacturer_id"
  value={manufacturerId}
  onChange={setManufacturerId}
  options={manufacturers}
  onAddNew={term => {
    setInitialManufacturerName(term ?? '');
    setIsManufacturerModalOpen(true);
  }}
/>
```

User bisa memicu add-new dengan:

- tombol plus pada search bar,
- `Enter` saat search state `not-found`,
- `Enter` saat search state `typing` dan hasil masih kosong.

Saat add-new dipicu, root component:

- membatalkan pending focus,
- blur element aktif,
- mem-pin dropdown agar tetap terbuka,
- memanggil `onAddNew(term)`.

## Persisted And Frozen Menu

Props `persistOpen`, `onPersistOpenClear`, dan `freezePersistedMenu` dipakai ketika add-new membuka modal tetapi dropdown asal perlu tetap berada di konteks visual.

```tsx
<Dropdown
  name="category_id"
  value={categoryId}
  onChange={setCategoryId}
  options={categories}
  onAddNew={openCategoryModal}
  persistOpen={persistedDropdownName === 'category_id'}
  freezePersistedMenu={
    isCategoryModalOpen && persistedDropdownName === 'category_id'
  }
  onPersistOpenClear={() => setPersistedDropdownName(null)}
/>
```

Behavior:

- `persistOpen` membuat menu efektif tetap open meskipun state internal close.
- `freezePersistedMenu` membuat portal non-interactive dengan `pointer-events-none select-none` dan `aria-hidden`.
- Klik di luar dropdown akan clear persisted state dan menutup menu, kecuali klik berada di modal `[role="dialog"][aria-modal="true"]`.
- Saat dropdown lain dibuka, dropdown aktif sebelumnya ditutup melalui singleton active dropdown callback.

## Hover Detail

Hover detail menampilkan panel informasi di samping opsi. Data awal diambil dari `DropdownOption`, lalu bisa diperkaya oleh `onFetchHoverDetail`.

```tsx
<Dropdown
  name="unit_id"
  value={unitId}
  onChange={setUnitId}
  options={unitOptions}
  enableHoverDetail
  hoverDetailDelay={400}
  onFetchHoverDetail={async id => {
    const unit = await fetchUnitDetail(id);
    return unit
      ? {
          id: unit.id,
          code: unit.code,
          name: unit.name,
          description: unit.description,
          metaLabel: unit.statusLabel,
          metaTone: 'info',
        }
      : null;
  }}
/>
```

Detail penting:

- Delay awal memakai `hoverDetailDelay`; setelah portal terlihat, perpindahan opsi memperbarui data tanpa delay panjang.
- Portal diposisikan di kanan opsi jika ruang cukup, lalu fallback ke kiri.
- Saat user scroll list, portal disembunyikan sementara dan dipulihkan setelah scroll idle.
- Keyboard highlight juga bisa memicu hover detail secara immediate jika opsi highlighted terlihat penuh di viewport list.
- `onFetchHoverDetail` harus mengembalikan `HoverDetailData | null`; error fetch hanya dicatat ke console dan tidak memblokir dropdown.

## Positioning And Width

Positioning dihitung oleh `useDropdownPosition` berdasarkan `getBoundingClientRect()` trigger dan ukuran menu.

| Prop          | Nilai       | Behavior                                                                                        |
| ------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `position`    | `'auto'`    | Pilih drop up atau down berdasarkan ruang atas/bawah.                                           |
| `position`    | `'top'`     | Paksa drop up.                                                                                  |
| `position`    | `'bottom'`  | Paksa drop down.                                                                                |
| `position`    | `'left'`    | Tempatkan menu di kiri trigger jika ruang cukup, fallback ke alignment normal jika tidak cukup. |
| `align`       | `'right'`   | Right edge menu sejajar dengan right edge trigger.                                              |
| `align`       | `'left'`    | Left edge menu sejajar dengan left edge trigger.                                                |
| `portalWidth` | `'auto'`    | Lebar sama dengan trigger.                                                                      |
| `portalWidth` | `'content'` | Lebar dihitung dari opsi terpanjang, min `120px`, max `400px`.                                  |
| `portalWidth` | `number`    | Dipakai sebagai pixel width.                                                                    |
| `portalWidth` | `string`    | Diteruskan sebagai CSS width, contoh `'120px'`.                                                 |

Portal normal menggunakan `position: fixed`, kecuali mode `position="left"` yang memakai `absolute`. Z-index portal adalah `DROPDOWN_CONSTANTS.PORTAL_Z_INDEX` (`1060`).

## Keyboard Interaction

Dropdown menangani keyboard di trigger, search input, dan list container.

| Key           | Behavior                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `ArrowDown`   | Highlight opsi berikutnya, wrap ke awal.                                                               |
| `ArrowUp`     | Highlight opsi sebelumnya, wrap ke akhir.                                                              |
| `Tab`         | Saat menu terbuka, bergerak antar opsi dan mencegah default tab movement. `Shift+Tab` bergerak mundur. |
| `PageDown`    | Lompat sampai `DROPDOWN_CONSTANTS.PAGE_SIZE` (`5`) item ke bawah.                                      |
| `PageUp`      | Lompat sampai 5 item ke atas.                                                                          |
| `Enter`       | Pilih opsi highlighted, atau jalankan `onAddNew(searchTerm)` saat search kosong hasil.                 |
| `Escape`      | Tutup dropdown dan reset expanded text.                                                                |
| Printable key | Jika menu terbuka dan `searchList` aktif, key diarahkan ke search input.                               |

Saat keyboard navigation aktif, cursor disembunyikan pada area dropdown dan highlight list memakai pinned frame agar animasi scroll tidak membuat highlight hilang.

## Focus And Close Behavior

Open/close state dipisahkan menjadi:

- `isOpen`: menu aktif.
- `isClosing`: close animation masih berjalan.
- `applyOpenStyles`: class scale/opacity sudah boleh diterapkan setelah posisi siap.
- `effectiveIsOpen`: `isOpen || persistOpen || pinnedOpen`.

Close terjadi pada kondisi berikut:

- klik trigger saat menu terbuka,
- select single option,
- `Escape`,
- focus keluar dari dropdown ketika tidak persisted,
- pointer down di luar dropdown saat persisted tetapi tidak frozen,
- dropdown lain dibuka.

Saat menu terbuka, `useDropdownEffects` sementara mengatur `document.body.style.overflow = 'hidden'` dan memasang listener `scroll`, `resize`, dan `focusout` untuk menjaga posisi dan close behavior.

## Scroll And Virtualization

`useScrollManagement` menangani:

- deteksi apakah list scrollable,
- indikator top/bottom melalui `ScrollIndicators`,
- initial scroll ke selected option saat `autoScrollOnOpen=true`,
- scroll ke atas saat search menghasilkan filtered results,
- restore scroll ke selected option setelah search dikosongkan.

Virtualisasi aktif otomatis ketika jumlah hasil lebih besar dari `DROPDOWN_CONSTANTS.VIRTUALIZATION_THRESHOLD` (`100`). `useDropdownVirtualization`:

- mengestimasi tinggi item dengan `OPTION_ESTIMATED_HEIGHT` (`36`),
- mengukur tinggi nyata item yang dirender,
- hanya merender window terlihat ditambah overscan `6`,
- tetap menyediakan target scroll untuk keyboard navigation.

## Internal Data Flow

```txt
props
  -> index.tsx
      -> useDropdownState
      -> useDropdownSearch
      -> useDropdownValidation
      -> useDropdownPosition
      -> useKeyboardNavigation
      -> useFocusManagement
      -> useScrollManagement
      -> useDropdownEffects
      -> useHoverDetail
  -> DropdownProvider
      -> DropdownButton
      -> DropdownMenu
          -> SearchBar
          -> MenuContent
          -> OptionItem
              -> OptionRow
      -> ValidationOverlay
      -> HoverDetailPortal
```

State yang dibutuhkan child component dibagikan lewat `DropdownContext`. Root tetap memegang event handler utama agar selection, search, validasi, positioning, dan close behavior tidak tersebar sebagai prop drilling.

## Accessibility Notes

- Trigger memakai `aria-haspopup="menu"`, `aria-expanded`, dan `aria-controls` saat list terbuka.
- Menu portal memakai `role="menu"`.
- Options container memakai `role="listbox"`.
- Opsi memakai `role="option"` dan `aria-selected`.
- Disabled trigger memakai native `disabled`.
- Keyboard support tersedia untuk navigasi dan selection.

Catatan: role menu dan listbox saat ini berada dalam portal yang sama. Jika mengubah markup accessibility, pastikan behavior keyboard, tests, dan screen reader semantics diperiksa bersamaan.

## Constants

Nilai utama berada di `constants.ts`.

| Constant                   | Nilai  | Fungsi                                        |
| -------------------------- | ------ | --------------------------------------------- |
| `ANIMATION_DURATION`       | `100`  | Durasi close state sebelum DOM menu dilepas.  |
| `CLOSE_TIMEOUT`            | `200`  | Delay close untuk hover-to-open leave intent. |
| `HOVER_TIMEOUT`            | `100`  | Delay sebelum hover membuka dropdown.         |
| `DEBOUNCE_DELAY`           | `150`  | Debounce search term.                         |
| `FOCUS_DELAY`              | `50`   | Delay focus list saat open tanpa search.      |
| `VIEWPORT_MARGIN`          | `16`   | Margin aman portal dari viewport.             |
| `MAX_HEIGHT`               | `240`  | Tinggi maksimum list (`max-h-60`).            |
| `PAGE_SIZE`                | `5`    | Step PageUp/PageDown.                         |
| `VIRTUALIZATION_THRESHOLD` | `100`  | Batas aktivasi virtualisasi.                  |
| `VIRTUALIZATION_OVERSCAN`  | `6`    | Extra item di luar viewport.                  |
| `OPTION_ESTIMATED_HEIGHT`  | `36`   | Estimasi tinggi item virtualized.             |
| `PORTAL_Z_INDEX`           | `1060` | Layer portal dropdown.                        |

## Testing

Test terkait berada di:

- `src/components/dropdown/index.test.tsx`
- `src/components/dropdown/utils/dropdownUtils.test.ts`
- `src/components/dropdown/hooks/useDropdownVirtualization.test.tsx`
- `src/components/dropdown/hooks/useKeyboardNavigation.test.tsx`
- `src/components/dropdown/hooks/useHoverDetail.test.tsx`
- `src/components/dropdown/hooks/useScrollManagement.test.tsx`

Jalankan test lewat VitePlus:

```bash
AI_AGENT=codex vp test run --passWithNoTests src/components/dropdown
```

Untuk perubahan runtime atau tipe, jalankan check sesuai standar repo:

```bash
vp check --fix src/components/dropdown
```

Dokumentasi-only change tidak perlu menjalankan `vp check`.

## Implementation Guidelines

- Perlakukan `Dropdown` sebagai controlled component. Parent harus menyimpan `value` dan memperbaruinya dari `onChange`.
- Gunakan `DropdownOption.id` sebagai value stabil. Jangan pakai label sebagai id jika label bisa berubah.
- Gunakan `searchList={false}` untuk opsi enum kecil seperti status atau bulan/tahun.
- Gunakan `withRadio` untuk single-select yang secara visual perlu memperlihatkan pilihan aktif.
- Gunakan `withCheckbox` hanya jika parent memang menyimpan array id.
- Untuk required field yang perlu overlay error, pasang `required` dan `validate`.
- Untuk workflow add-new dengan modal, koordinasikan `onAddNew`, `persistOpen`, `freezePersistedMenu`, dan `onPersistOpenClear`.
- Jangan memasukkan network fetch langsung ke option render. Pakai `onFetchHoverDetail` agar fetch hanya terjadi ketika detail diminta.
- Hindari mengekspor helper baru dari file component React. Ikuti aturan Fast Refresh dengan memindahkan shared non-component export ke sibling module.
