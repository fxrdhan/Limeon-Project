# Combobox

`@/components/combobox` exports the official Base UI combobox primitive:

```tsx
import { Combobox } from '@/components/combobox';
```

The primitive is value-model agnostic and intentionally headless. Items can be strings, numbers, or objects. Visual styling, localized copy, validation overlays, add-new actions, and other PharmaSys-specific behavior live outside the primitive, usually through `PharmaComboboxSelect` from `./presets`.

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

Change callbacks receive Base UI event details with `reason` and `event`.

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
import { PharmaEntityComboboxSelect } from '@/components/combobox/entity-select';

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

Use the generic app preset directly when values are not `id`/`name` entities or
when the caller needs full control over object stringification and equality.

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

Do not add app-specific props to `Combobox.Root`. Compose app behavior around the primitive parts or extend the preset.
