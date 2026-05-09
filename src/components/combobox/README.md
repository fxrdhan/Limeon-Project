# Combobox

`@/components/combobox` exports the official Base UI combobox primitive:

```tsx
import { Combobox } from '@/components/combobox';
```

The primitive is value-model agnostic and intentionally headless. Items can be strings, numbers, or objects. Visual styling, localized copy, validation overlays, add-new actions, and other PharmaSys-specific behavior live outside the primitive, usually through `PharmaComboboxSelect` or `PharmaEntityComboboxSelect` from this public entrypoint.

## Primitive Parts

```tsx
<Combobox.Root
  items={suppliers}
  value={selectedSupplier}
  onValueChange={setSelectedSupplier}
  itemToStringLabel={supplier => supplier.name}
  itemToStringValue={supplier => supplier.id}
  name="supplier_id"
>
  <Combobox.Label>Supplier</Combobox.Label>
  <Combobox.Trigger>
    <Combobox.Value placeholder="-- Pilih Supplier --" />
  </Combobox.Trigger>
  <Combobox.Portal>
    <Combobox.Positioner>
      <Combobox.Popup>
        <Combobox.Input placeholder="Cari..." />
        <Combobox.List>
          <Combobox.Collection>
            {(supplier, index) => (
              <Combobox.Item key={supplier.id} value={supplier} index={index}>
                {supplier.name}
              </Combobox.Item>
            )}
          </Combobox.Collection>
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

`Combobox.Root<Value, Multiple>` supports:

- `items`, `filteredItems`
- `value`, `defaultValue`, `onValueChange`
- `multiple`
- `open`, `defaultOpen`, `onOpenChange`
- `inputValue`, `defaultInputValue`, `onInputValueChange`
- `onItemHighlighted`
- `filter`
- `itemToStringLabel`, `itemToStringValue`, `isItemEqualToValue`
- `name`, `form`, `disabled`, `readOnly`, `required`
- `modal`, `autoHighlight`, `highlightItemOnHover`

Change callbacks receive the native Base UI event details, including `reason`,
`event`, `cancel()`, and `allowPropagation()`.

`autoHighlight` defaults to `false` in the primitive. Presets can opt into select-like behavior explicitly. Item values are not inspected for app-specific flags by default; use `Combobox.Item disabled` when an item should not be selectable.

`Combobox.Positioner` is the official Base UI positioner and keeps collision-aware placement, sizing, and popup anchoring inside the primitive.

## Render Props

DOM-rendering parts accept `render={element}` or `render={(props, state) => element}`. Internal ARIA attributes, data states, refs, handlers, class names, styles, and children are merged into element renders.

```tsx
<Combobox.Trigger
  render={(props, state) => (
    <button {...props} data-open={state.open}>
      <Combobox.Value placeholder="Choose" />
    </button>
  )}
/>
```

Stable `data-*` states come from Base UI, including `data-selected`, `data-highlighted`, `data-disabled`, `data-readonly`, `data-required`, `data-placeholder`, and `data-empty` where relevant.

## App Preset

Use the entity preset when a standard id-backed PharmaSys select is needed:

```tsx
import { PharmaEntityComboboxSelect } from '@/components/combobox';

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
/>;
```

If the selected id can outlive the current option list, pass `selectedItem`.
This keeps the trigger label, hidden form value, and required validation tied to
the selected entity while options are still loading or temporarily filtered by the
caller.

```tsx
<PharmaEntityComboboxSelect
  name="supplier_id"
  items={supplierOptions}
  valueId={supplierId}
  selectedItem={selectedSupplier}
  onValueIdChange={setSupplierId}
/>
```

Use the generic app preset directly when values are not `id`/`name` entities or
when the caller needs full control over object stringification and equality.
The preset also exposes `isItemDisabled` and `itemToHoverDetailData` so item
availability and hover metadata stay explicit at the call site when the item
shape is not `ComboboxOption`.

The preset exposes typed rendering hooks for option content without requiring
callers to replace the Base UI item DOM:

```tsx
<PharmaComboboxSelect
  name="supplier_id"
  items={suppliers}
  value={selectedSupplier}
  onValueChange={setSelectedSupplier}
  itemToStringLabel={supplier => supplier.name}
  itemToStringValue={supplier => supplier.id}
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

When the preset is not wrapped by `FormField` or another visible label, pass
`label`. The trigger uses that label plus the current value for its accessible
name while keeping the same visual output.

When wrapped by `FormField`, including through layout wrappers, the preset
inherits the field label automatically.

If a scalar select uses a non-null empty sentinel such as `''`, pass
`isValueEmpty` so required validation and Base UI selection state still treat it
as empty:

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

`onOpenChange` receives the same Base UI event details as the primitive, so
callers can inspect close reasons or cancel an open-state transition when they
own the surrounding workflow.

## Preset Behavior Contract

- Base UI owns item selection, event details, ARIA roles, hidden form values,
  interactive highlighted item state, keyboard navigation, and popup open
  requests.
- The preset owns only app UX around Base UI: search query state, visual styling,
  validation overlay, create action, entity ID bridging, and hover detail.
- `value`/`valueId` is the selected value source of truth. `inputValue` is only
  the transient search query and is cleared when the popup actually closes.
- Controlled `open` callers own whether a close request takes effect. The preset
  must not run close cleanup when `onOpenChange(false)` fires but `open` remains
  `true`.
- `details.cancel()` from Base UI callbacks prevents preset side effects for
  that transition.
- Hover detail must never change selection, focus, or submitted value.
- The preset may preserve the visual active background for continuity, but that
  background must not drive selection, focus, submitted value, keyboard
  navigation, or ARIA attributes.

Do not add app-specific props to `Combobox.Root`. Compose app behavior around the primitive parts or extend the preset.
