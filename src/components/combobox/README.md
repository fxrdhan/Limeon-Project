# Combobox

`@/components/combobox` exports a BaseUI-like compound primitive:

```tsx
import { Combobox } from '@/components/combobox';
```

The primitive is value-model agnostic. Items can be strings, numbers, or objects. App styling, validation overlays, add-new actions, and other PharmaSys-specific behavior live outside the primitive, usually through `PharmaComboboxSelect` from `./presets`.

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
  <Combobox.Trigger placeholder="-- Pilih Supplier --" />
  <Combobox.Portal>
    <Combobox.Positioner>
      <Combobox.Popup>
        <Combobox.SearchInput placeholder="Cari..." />
        <Combobox.List />
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
- `Combobox.SearchInput`
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
- `highlightedItem`, `onItemHighlighted`
- `filter`, `limit`, `locale`
- `itemToStringLabel`, `itemToStringValue`, `isItemEqualToValue`
- `name`, `form`, `disabled`, `readOnly`, `required`
- `modal`, `autoHighlight`, `highlightItemOnHover`, `loopFocus`

Change callbacks receive BaseUI-style details with `reason`, `event`, `trigger`, `cancel()`, and propagation state. Calling `cancel()` prevents the primitive from committing that state change.

`Combobox.Positioner` defaults to collision-aware positioning. It opens below the trigger when there is room, flips above when the lower viewport space is constrained, and exposes `data-side="top | bottom"` on the positioner and popup. Use `side="top"` or `side="bottom"` only when a fixed side is required.

## Render Props

DOM-rendering parts accept `render={element}` or `render={(props, state) => element}`. Internal ARIA attributes, data states, refs, handlers, class names, styles, and children are merged into element renders.

```tsx
<Combobox.Trigger
  render={(props, state) => (
    <button {...props} data-open={state.open}>
      {state.selectedLabel || 'Choose'}
    </button>
  )}
/>
```

Stable `data-*` states include `data-state`, `data-selected`, `data-highlighted`, `data-disabled`, `data-readonly`, `data-required`, `data-placeholder`, and `data-empty` where relevant.

## App Preset

Use the app preset when a standard PharmaSys select is needed:

```tsx
import {
  findComboboxItemByValue,
  PharmaComboboxSelect,
} from '@/components/combobox/presets';

<PharmaComboboxSelect
  name="category_id"
  items={categories}
  value={findComboboxItemByValue(
    categories,
    formData.category_id,
    item => item.id
  )}
  onValueChange={item => updateField('category_id', item?.id ?? '')}
  itemToStringLabel={item => item.name}
  itemToStringValue={item => item.id}
  placeholder="Pilih Kategori"
  required
  validation={{ enabled: true, autoHide: true, autoHideDelay: 3000 }}
  createAction={{ onCreate: openCategoryModal, label: 'Tambah baru' }}
/>;
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

Do not add app-specific props to `Combobox.Root`. Compose app behavior around the primitive parts or extend the preset.
