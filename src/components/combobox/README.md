# Combobox

`@/components/combobox` exports the local PharmaSys combobox primitive plus app presets:

```tsx
import { Combobox, PharmaEntityComboboxSelect } from '@/components/combobox';
```

The primitive is a focused Base-UI-like engine owned by this repo. It covers the current PharmaSys needs: single-select values, controlled/uncontrolled open state, controlled search input, filtering, keyboard navigation, cancelable event details, hidden form values, and render-prop parts.

Popup placement is delegated to Floating UI through `Combobox.Positioner`. The combobox still owns value state, item highlighting, search, keyboard behavior, form integration, and the app preset animations.

## Primitive Parts

```tsx
<Combobox.Root
  items={suppliers}
  value={selectedSupplier}
  onValueChange={setSelectedSupplier}
  itemToStringLabel={supplier => supplier.name}
  itemToStringValue={supplier => supplier.id}
  name="supplier_id"
  autoHighlight
>
  <Combobox.Label>Supplier</Combobox.Label>
  <Combobox.Trigger>
    <Combobox.Value placeholder="-- Pilih Supplier --" />
  </Combobox.Trigger>
  <Combobox.Portal>
    <Combobox.Positioner>
      <Combobox.Popup>
        <Combobox.Input placeholder="Cari..." />
        <Combobox.List<(typeof suppliers)[number]>>
          {(supplier, index) => (
            <Combobox.Item key={supplier.id} value={supplier} index={index}>
              {supplier.name}
            </Combobox.Item>
          )}
        </Combobox.List>
        <Combobox.Empty>Tidak ada data</Combobox.Empty>
      </Combobox.Popup>
    </Combobox.Positioner>
  </Combobox.Portal>
</Combobox.Root>
```

Available parts:

- `Combobox.Root`
- `Combobox.Label`
- `Combobox.Trigger`
- `Combobox.Value`
- `Combobox.Portal`
- `Combobox.Positioner`
- `Combobox.Popup`
- `Combobox.Input`
- `Combobox.List`
- `Combobox.Collection`
- `Combobox.Item`
- `Combobox.ItemIndicator`
- `Combobox.Empty`
- `Combobox.Status`

## Root API

`Combobox.Root<Value>` supports the local subset used by PharmaSys:

- `items`, `filteredItems`
- `value`, `defaultValue`, `onValueChange`
- `open`, `defaultOpen`, `onOpenChange`
- `inputValue`, `defaultInputValue`, `onInputValueChange`, `autoComplete`
- `highlightedIndex`, `defaultHighlightedIndex`, `onHighlightedIndexChange`
- `onItemHighlighted`
- `filter`
- `itemToStringLabel`, `itemToStringValue`, `isItemEqualToValue`, `isItemDisabled`
- `labelId`
- `name`, `form`, `disabled`, `readOnly`, `required`
- `autoHighlight`, `highlightItemOnHover`

Change callbacks receive cancelable event details with `reason`, `event`, `cancel()`, and `isCanceled`.

When a popup is open, pressing outside both the trigger and the portaled popup requests close with reason `outside-press`. Controlled `open` callers and `details.cancel()` still decide whether that close request takes effect.

`autoComplete` sets the default native `autocomplete` attribute for `Combobox.Input`. A direct `autoComplete` prop on `Combobox.Input` wins over the root default.

`name` and `form` render a hidden input for submission. `required` is primitive state consumed by the app preset and validation integrations; it is not implemented through native hidden-input constraint validation. Use `PharmaComboboxSelect` validation for required user feedback.

The local primitive intentionally does not aim to mirror every upstream combobox feature. Add behavior only when a real PharmaSys call-site needs it.

## Render Props

DOM-rendering parts accept `render={element}` or `render={(props, state) => element}`. Internal ARIA attributes, refs, handlers, class names, styles, and children are passed through the render props.

```tsx
<Combobox.Trigger
  render={(props, state) => (
    <button {...props} data-open={state.open}>
      <Combobox.Value placeholder="Choose" />
    </button>
  )}
/>
```

Stable local `data-*` states include `data-selected`, `data-highlighted`, `data-disabled`, and `data-placeholder` where relevant.

`Combobox.Popup initialFocus` focuses the first focusable popup control only when explicitly enabled.

`highlightedIndex` controls the primitive highlighted option declaratively. Use it for advanced compositions that need to synchronize visual and semantic highlight state.

## App Preset

Use the entity preset when a standard id-backed PharmaSys select is needed:

```tsx
<PharmaEntityComboboxSelect
  label="Kategori"
  name="category_id"
  items={categories}
  valueId={formData.category_id}
  onValueIdChange={value => updateField('category_id', value)}
  placeholder="Pilih Kategori"
  required
  validation={{ enabled: true, autoHide: true, autoHideDelay: 3000 }}
  createAction={{ onCreate: openCategoryModal, label: 'Tambah baru' }}
/>
```

If the selected id can outlive the current option list, pass `selectedItem` when available. The scalar `valueId` is still preserved for hidden form submission and required validation while options are loading; `selectedItem` keeps the trigger label human-readable during that gap.

```tsx
<PharmaEntityComboboxSelect
  name="supplier_id"
  items={supplierOptions}
  valueId={supplierId}
  selectedItem={selectedSupplier}
  onValueIdChange={setSupplierId}
/>
```

Use the generic app preset directly when values are not `id`/`name` entities or when the caller needs full control over stringification and equality. For object values, pass `isItemEqualToValue` when selected values can be different references with the same semantic id.

```tsx
<PharmaComboboxSelect
  name="supplier_id"
  items={suppliers}
  value={selectedSupplier}
  onValueChange={setSelectedSupplier}
  itemToStringLabel={supplier => supplier.name}
  itemToStringValue={supplier => supplier.id}
  isItemEqualToValue={(item, value) => item.id === value.id}
  renderOption={(supplier, state) => <span>{state.label}</span>}
  renderOptionMeta={supplier => supplier.code}
/>
```

Enum/list-only selects should pass primitive values directly:

```tsx
<PharmaComboboxSelect
  name="payment_status"
  items={['unpaid', 'partial', 'paid']}
  value={status}
  onValueChange={value => value && setStatus(value)}
  itemToStringLabel={value => labels[value]}
  itemToStringValue={value => value}
  searchable={false}
  indicator="radio"
/>
```

When the preset is not wrapped by `FormField` or another visible label, pass `label`. The trigger uses that label plus the current value for its accessible name while keeping the same visual output.

When wrapped by `FormField`, including through layout wrappers, the preset inherits the field label automatically.

If a scalar select uses a non-null empty sentinel such as `''`, pass `isValueEmpty` so required validation and selection state still treat it as empty:

```tsx
<PharmaComboboxSelect
  name="status"
  items={['active', 'inactive']}
  value={status}
  onValueChange={value => setStatus(value ?? '')}
  itemToStringLabel={value => labels[value] ?? value}
  itemToStringValue={value => value}
  isValueEmpty={value => value === ''}
  required
/>
```

## Preset Behavior Contract

`PharmaComboboxSelect` is the production app adapter. The local primitive owns ARIA roles, focus/reference wiring, option registry, keyboard navigation, highlighted option state, selected value state, hidden form value, filtered item rendering, and cancelable callback details.

The preset owns:

- Search query state and filtered item lists passed into the primitive through `filteredItems`.
- Entity ID bridging, required validation overlay, create action, localized copy, visual styling, and hover detail.
- The animated visual highlight background, including hover continuity, keyboard scroll pinning, wrap-to-edge scroll behavior, stationary-pointer suppression, and the selected/default visual anchor after search is cleared.
- The popup search input's visual active state. Arrow navigation may keep DOM focus on the input, but it must not make the search field look actively focused unless the user is typing or pointing at the input.

The shared boundary is item highlighting. The primitive owns the semantic highlighted index. The preset controls that index declaratively through `highlightedIndex` and renders the existing animated visual background from it. Non-searchable selects preserve the legacy first-arrow keyboard behavior while keeping highlight syncing declarative in production.

Rules for maintaining this boundary:

- Do not let the visual background directly change submitted value or selection. Selection must still happen through primitive item press or keyboard handling.
- Searchable preset keyboard navigation must continue from the visible highlight anchor through the primitive controlled highlighted index.
- Clearing search must restore the visual highlight to the selected enabled item when it is visible, otherwise to the first enabled visible item.
- Keyboard scroll and pointer hover must remain arbitrated by the preset so a stationary cursor does not steal highlight while Arrow navigation scrolls the list.
- `value`/`valueId` is the selected value source of truth. `inputValue` is only the transient search query and is cleared when the popup actually closes.
- Outside pointer dismissal is primitive-owned and must ignore presses inside the trigger or portaled popup.
- Controlled `open` callers own whether a close request takes effect. The preset must not run close cleanup when `onOpenChange(false)` fires but `open` remains `true`.
- `details.cancel()` from primitive callbacks prevents preset side effects for that transition.
- Hover detail must never change selection, focus, or submitted value.

Do not add app-specific props to `Combobox.Root`. Compose app behavior around the primitive parts or extend the preset.

## Test Coverage

Combobox regression coverage is intentionally split by what each runner can prove:

- Vitest with Testing Library covers primitive and preset behavior in `src/components/combobox/index.test.tsx`: value changes, search/filtering, keyboard selection, disabled items, hidden form values, label/id wiring, cancelable event details, controlled open behavior, visual highlight state, and animation behavior contracts.
- `@testing-library/user-event` is used for user-facing click/type flows where realistic event order matters. Lower-level `fireEvent` remains acceptable for targeted primitive and edge-case transitions.
- Playwright covers browser-only layout behavior in `tests/playwright/combobox.spec.ts`: the combobox fixture renders the real components, verifies search/select still works in Chromium, and verifies Floating UI flips/clamps the portaled fixed popup near the viewport edge.

Useful commands:

```bash
AI_AGENT=codex vp test run --passWithNoTests src/components/combobox/index.test.tsx
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 bun run test:e2e -- tests/playwright/combobox.spec.ts
```

The Playwright tests require an already-running VitePlus server. Install the browser binary once with `bunx playwright install chromium` if Playwright reports a missing executable.
