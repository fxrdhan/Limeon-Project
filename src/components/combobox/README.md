# Combobox Component Documentation

## Overview

`@/components/combobox` provides the combobox/select implementation used by PharmaSys forms and data-entry flows. The module has a primitive layer and an app preset layer:

- Primitive: `Combobox`, a local compound component for custom combobox compositions.
- App presets: `PharmaComboboxSelect` for arbitrary item types and `PharmaEntityComboboxSelect` for common `{ id, name }` entity options.

The component supports single selection, controlled or uncontrolled open state, controlled or uncontrolled selected value, searchable option lists, keyboard navigation, hidden form submission, portal-based popup positioning, required-state feedback, create actions, and optional hover detail popovers.

Use the app presets for normal product screens. Use the primitive only when a screen needs a custom layout that the preset cannot express.

## Import

```tsx
import {
  Combobox,
  createTypedCombobox,
  PharmaComboboxSelect,
  PharmaEntityComboboxSelect,
} from '@/components/combobox';
```

Additional exports:

| Export                            | Description                                                   |
| --------------------------------- | ------------------------------------------------------------- |
| `ComboboxRootProps`               | Type for `Combobox.Root` props.                               |
| `ComboboxChangeEventDetails`      | Callback details for value, open, and input changes.          |
| `ComboboxHighlightEventDetails`   | Callback details for highlighted option changes.              |
| `PharmaComboboxSelectProps`       | Props for the generic app preset.                             |
| `PharmaComboboxOptionRenderState` | State passed to `renderOption` and `renderOptionMeta`.        |
| `PharmaEntityComboboxSelectProps` | Props for the entity preset.                                  |
| `createTypedCombobox`             | Typed primitive namespace for custom compositions.            |
| `findComboboxItemByValue`         | Helper for resolving an item from its submitted string value. |

## Recommended Usage

Use `PharmaEntityComboboxSelect` for database-backed selects where the submitted value is an entity id.

```tsx
type Category = {
  id: string;
  name: string;
};

<PharmaEntityComboboxSelect<Category>
  label="Kategori"
  name="category_id"
  items={categories}
  valueId={formData.category_id}
  onValueIdChange={valueId => updateField('category_id', valueId)}
  placeholder="Pilih Kategori"
  required
/>;
```

Use `selectedItem` when the saved id can exist before the option list has finished loading.

```tsx
<PharmaEntityComboboxSelect
  label="Supplier"
  name="supplier_id"
  items={supplierOptions}
  valueId={supplierId}
  selectedItem={selectedSupplier}
  onValueIdChange={(valueId, item) => {
    setSupplierId(valueId);
    setSelectedSupplier(item);
  }}
/>
```

Use `PharmaComboboxSelect` when values are not standard `{ id, name }` entities or when the caller needs custom label/value conversion.

```tsx
type Supplier = {
  code: string;
  id: string;
  name: string;
};

<PharmaComboboxSelect<Supplier>
  label="Supplier"
  name="supplier_id"
  items={suppliers}
  value={selectedSupplier}
  onValueChange={setSelectedSupplier}
  itemToStringLabel={supplier => supplier.name}
  itemToStringValue={supplier => supplier.id}
  isItemEqualToValue={(item, value) => item.id === value.id}
  renderOptionMeta={supplier => supplier.code}
/>;
```

For enum or string-list selects, pass scalar values directly.

```tsx
const statusOptions = ['active', 'inactive'] as const;
type Status = (typeof statusOptions)[number];

const statusLabels: Record<Status, string> = {
  active: 'Aktif',
  inactive: 'Tidak Aktif',
};

<PharmaComboboxSelect<Status>
  label="Status"
  name="status"
  items={[...statusOptions]}
  value={status}
  onValueChange={setStatus}
  itemToStringLabel={value => statusLabels[value]}
  itemToStringValue={value => value}
  searchable={false}
  indicator="radio"
  required
/>;
```

Use the primitive directly only for custom UI composition.

```tsx
type Supplier = {
  id: string;
  name: string;
};

<Combobox.Root<Supplier>
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
    <Combobox.Value placeholder="Pilih Supplier" />
  </Combobox.Trigger>
  <Combobox.Portal>
    <Combobox.Positioner sideOffset={4}>
      <Combobox.Popup>
        <Combobox.Input aria-label="Cari supplier" placeholder="Cari..." />
        <Combobox.List<Supplier>>
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
</Combobox.Root>;
```

For larger custom compositions, create a typed primitive namespace once so
`Root`, `List`, `Collection`, and `Item` share the same value type.

```tsx
const SupplierCombobox = createTypedCombobox<Supplier>();

<SupplierCombobox.Root
  items={suppliers}
  value={selectedSupplier}
  onValueChange={setSelectedSupplier}
>
  <SupplierCombobox.List>
    {(supplier, index) => (
      <SupplierCombobox.Item key={supplier.id} value={supplier} index={index}>
        {supplier.name}
      </SupplierCombobox.Item>
    )}
  </SupplierCombobox.List>
</SupplierCombobox.Root>;
```

## App Presets

### `PharmaEntityComboboxSelect`

`PharmaEntityComboboxSelect` is the preferred preset for id-backed entity fields. It accepts items with at least this shape:

```ts
type EntityComboboxItem = {
  id: string;
  name: string;
};
```

| Prop                 | Type                               | Description                                                         |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| `items`              | `Item[]`                           | Available options.                                                  |
| `valueId`            | `string`                           | Current submitted id. Use `''` for empty selection.                 |
| `onValueIdChange`    | `(valueId, item, details) => void` | Called when selection changes.                                      |
| `selectedItem`       | `Item \| null`                     | Optional item for the current id when it is not present in `items`. |
| `itemToStringLabel`  | `(item) => string`                 | Optional label formatter. Defaults to `item.name`.                  |
| `itemToStringValue`  | `(item) => string`                 | Optional submitted-value formatter. Defaults to `item.id`.          |
| `isItemEqualToValue` | `(item, value) => boolean`         | Optional equality check. Defaults to matching submitted values.     |

If `valueId` is not empty and neither `items` nor `selectedItem` can resolve it, the preset keeps the hidden form value intact and displays a neutral fallback label.

### `PharmaComboboxSelect`

`PharmaComboboxSelect` is the generic app preset. It should be used when the selected value is an object or scalar that needs custom string conversion.

| Prop                      | Type                                                                | Description                                                                             |
| ------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `items`                   | `Item[]`                                                            | Options displayed by the select.                                                        |
| `value`                   | `Item \| null`                                                      | Selected item.                                                                          |
| `onValueChange`           | `(item, details) => void`                                           | Called after the selected item changes.                                                 |
| `itemToStringLabel`       | `(item) => string`                                                  | Human-readable option label.                                                            |
| `itemToStringValue`       | `(item) => string`                                                  | Stable submitted value. Must be unique within the option list.                          |
| `isItemEqualToValue`      | `(item, value) => boolean`                                          | Equality check for object values that can be different references.                      |
| `isItemDisabled`          | `(item) => boolean`                                                 | Disables individual options. Defaults to reading `item.disabled` on object items.       |
| `isValueEmpty`            | `(item) => boolean`                                                 | Defines custom empty sentinels such as `''`.                                            |
| `id`                      | `string`                                                            | Trigger/control id. Inherits `FormField` control id when available.                     |
| `label`                   | `string`                                                            | Visible or accessible label. Inherits `FormField` label when available.                 |
| `name`                    | `string`                                                            | Hidden input name for form submission.                                                  |
| `form`                    | `string`                                                            | Associates the hidden input with a form id.                                             |
| `placeholder`             | `string`                                                            | Trigger placeholder. Defaults to `'-- Pilih --'`.                                       |
| `searchPlaceholder`       | `string`                                                            | Search input placeholder. Defaults to `'Cari...'`.                                      |
| `emptyText`               | `string`                                                            | Empty-state text. Defaults to `'Tidak ada data'`.                                       |
| `searchable`              | `boolean`                                                           | Enables the popup search input. Defaults to `true`.                                     |
| `visibleItemLimit`        | `number`                                                            | Optional render cap for large lists. Defaults to a bounded large-list cap when omitted. |
| `indicator`               | `'none' \| 'check' \| 'radio' \| 'checkbox'`                        | Selection indicator style.                                                              |
| `required`                | `boolean`                                                           | Enables required-state semantics and preset validation.                                 |
| `disabled`                | `boolean`                                                           | Disables the control.                                                                   |
| `readOnly`                | `boolean`                                                           | Prevents selection changes while keeping the current value readable.                    |
| `tabIndex`                | `number`                                                            | Trigger tab order.                                                                      |
| `className`               | `string`                                                            | Root container class.                                                                   |
| `popupClassName`          | `string`                                                            | Popup surface class.                                                                    |
| `popupMatchAnchorWidth`   | `boolean`                                                           | Whether the popup width follows the trigger width. Defaults to `true`.                  |
| `validation`              | `{ enabled?: boolean; autoHide?: boolean; autoHideDelay?: number }` | Required-field validation overlay configuration.                                        |
| `createAction`            | `{ label?: string; onCreate: (searchTerm?: string) => void }`       | Create action rendered when no exact option exists.                                     |
| `hoverDetail`             | `{ enabled?: boolean; delay?: number }`                             | Hover-detail behavior configuration.                                                    |
| `itemToHoverDetailData`   | `(item) => Partial<HoverDetailData>`                                | Maps an item to local hover-detail data.                                                |
| `onFetchHoverDetail`      | `(id) => Promise<HoverDetailData \| null>`                          | Loads hover-detail data asynchronously.                                                 |
| `onFetchHoverDetailError` | `(error, id) => void`                                               | Handles hover-detail fetch failures.                                                    |
| `renderOption`            | `(item, state) => ReactNode`                                        | Custom option content.                                                                  |
| `renderOptionMeta`        | `(item, state) => ReactNode`                                        | Secondary option metadata.                                                              |
| `open`                    | `boolean`                                                           | Controlled popup state.                                                                 |
| `onOpenChange`            | `(open, details) => void`                                           | Called when the primitive requests an open-state change.                                |
| `aria-label`              | `string`                                                            | Accessible name override.                                                               |
| `aria-labelledby`         | `string`                                                            | Accessible label reference override.                                                    |
| `aria-describedby`        | `string`                                                            | Accessible description reference.                                                       |

When `required` is set, preset validation is enabled by default. Set
`validation.enabled` to `false` to opt out.

Required preset fields also render a separate native validation proxy. The
submitted hidden input remains a plain submitted value, while the proxy lets
browser form validation block empty required comboboxes and route focus back to
the trigger.

## Primitive API

### Compound Parts

| Part                     | Description                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `Combobox.Root`          | State provider for value, input, open state, filtering, highlighting, and hidden form value. |
| `Combobox.Label`         | Label element registered with the trigger, input, and listbox.                               |
| `Combobox.Trigger`       | Button that opens the popup and exposes combobox ARIA attributes.                            |
| `Combobox.Value`         | Displays the selected item label or a placeholder.                                           |
| `Combobox.Portal`        | Renders popup content into `document.body` by default.                                       |
| `Combobox.Positioner`    | Positions popup content relative to the trigger.                                             |
| `Combobox.Popup`         | Popup container and optional initial focus manager.                                          |
| `Combobox.Input`         | Search input controlled by `Combobox.Root`.                                                  |
| `Combobox.List`          | Listbox wrapper. Can map `filteredItems` through a render function.                          |
| `Combobox.Collection`    | Render-only mapper for `filteredItems`.                                                      |
| `Combobox.Item`          | Selectable option.                                                                           |
| `Combobox.ItemIndicator` | Optional indicator element inside an option.                                                 |
| `Combobox.Empty`         | Status element rendered only when there are no filtered items.                               |
| `Combobox.Status`        | Generic status element.                                                                      |

### `Combobox.Root`

| Prop                                           | Type                                     | Description                                                       |
| ---------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `items`                                        | `readonly Value[]`                       | Full option list.                                                 |
| `filteredItems`                                | `readonly Value[]`                       | Controlled filtered list. Overrides root filtering when provided. |
| `value` / `defaultValue`                       | `Value \| null`                          | Controlled or uncontrolled selected value.                        |
| `onValueChange`                                | `(value, details) => void`               | Called when selection changes.                                    |
| `open` / `defaultOpen`                         | `boolean`                                | Controlled or uncontrolled popup state.                           |
| `onOpenChange`                                 | `(open, details) => void`                | Called when open state is requested to change.                    |
| `inputValue` / `defaultInputValue`             | `string`                                 | Controlled or uncontrolled search value.                          |
| `onInputValueChange`                           | `(inputValue, details) => void`          | Called when the search input changes.                             |
| `highlightedIndex` / `defaultHighlightedIndex` | `number \| null`                         | Controlled or uncontrolled highlighted option index.              |
| `onHighlightedIndexChange`                     | `(index, details) => void`               | Called when highlight changes.                                    |
| `onItemHighlighted`                            | `(item, details) => void`                | Called with the highlighted item.                                 |
| `filter`                                       | `(item, query, itemToString) => boolean` | Custom filter. Pass `null` to disable filtering.                  |
| `itemToStringLabel`                            | `(item) => string`                       | Option label formatter.                                           |
| `itemToStringValue`                            | `(item) => string`                       | Hidden input value formatter. Must return stable unique values.   |
| `isItemEqualToValue`                           | `(item, value) => boolean`               | Equality check. Defaults to `Object.is`.                          |
| `isItemDisabled`                               | `(item) => boolean`                      | Disables options.                                                 |
| `name`                                         | `string`                                 | Enables hidden input submission.                                  |
| `form`                                         | `string`                                 | Native form id for the hidden input.                              |
| `disabled`                                     | `boolean`                                | Disables the control.                                             |
| `readOnly`                                     | `boolean`                                | Prevents user changes.                                            |
| `required`                                     | `boolean`                                | Adds required semantics for consumers.                            |
| `labelId`                                      | `string`                                 | External label id.                                                |
| `autoComplete`                                 | `string`                                 | Default native `autocomplete` for `Combobox.Input`.               |
| `autoHighlight`                                | `boolean`                                | Highlights the first enabled item when opening or filtering.      |
| `highlightItemOnHover`                         | `boolean`                                | Enables pointer-driven highlighting. Defaults to `true`.          |

### Event Details

Change and highlight callbacks receive a details object:

```ts
type ComboboxEventDetails = {
  cancel: () => void;
  event?: Event;
  isCanceled: boolean;
  reason:
    | 'escape-key'
    | 'focus-out'
    | 'form-reset'
    | 'input-change'
    | 'item-press'
    | 'keyboard'
    | 'none'
    | 'outside-press'
    | 'pointer'
    | 'trigger-press';
};
```

Call `details.cancel()` to prevent the primitive from applying the requested transition. Controlled callers still own the final external state.

### Popup Positioning

`Combobox.Portal` renders into `document.body` unless `container` is provided.

`Combobox.Positioner` defaults to `placement="bottom-start"` and `matchAnchorWidth={true}`. Set `matchAnchorWidth={false}` when popup content needs a custom width while keeping the popup at least as wide as the trigger.

### Render Props

`Combobox.Trigger` and `Combobox.Item` accept `render={element}` or `render={(props, state) => element}`. The generated props include ARIA attributes, event handlers, refs, class names, styles, and data attributes.

```tsx
<Combobox.Trigger
  render={(props, state) => (
    <button {...props} data-open={state.open}>
      <Combobox.Value placeholder="Pilih data" />
    </button>
  )}
/>
```

Stable data attributes include `data-selected`, `data-highlighted`, `data-disabled`, and `data-placeholder` where applicable.

## Behavior Notes

### Search

`Combobox.Input` gets its value from `Combobox.Root` through `inputValue` or `defaultInputValue`. Do not pass `value` or `defaultValue` directly to `Combobox.Input`.

The app preset keeps search in memory. Results are ranked by exact match, prefix match, word prefix match, substring match, acronym/consonant/subsequence match, and typo-tolerant fallback. Typo-tolerant matches are used only when deterministic matches do not produce results.

### Keyboard

The trigger supports:

- `ArrowUp` / `ArrowDown`: open and move highlight.
- `Home` / `End`: move to first or last enabled option.
- `PageUp` / `PageDown`: move highlight by page.
- `Enter` / `Space`: select the highlighted option when available.
- `Escape`: close the popup.
- Printable characters: typeahead while the popup is open.

The popup search input supports:

- `ArrowUp` / `ArrowDown`: move highlight.
- `PageUp` / `PageDown`: move highlight by page.
- `Enter`: select the highlighted option.
- `Escape`: close the popup.

### Forms

Passing `name` renders a hidden input. Its value comes from `itemToStringValue(selectedItem)`. For entity selects, the hidden value is the selected id.

`required` is used for accessibility and preset validation state. It is not native hidden-input constraint validation.

Native form reset restores uncontrolled combobox state to the corresponding
`defaultValue`, `defaultInputValue`, `defaultHighlightedIndex`, and
`defaultOpen` props. Controlled callers receive `form-reset` change callbacks
and must update their controlled state when they want native reset buttons to
change the combobox value.

### Accessibility

The primitive wires the trigger, input, listbox, option ids, active descendant, selected state, disabled state, and registered labels. When a preset is not wrapped by `FormField`, pass `label`, `aria-label`, or `aria-labelledby` so the control has an accessible name.

### Controlled Open State

When `open` is controlled, `onOpenChange(false, details)` is only a close request. The caller must update `open` for the popup to close. If `details.cancel()` is called, preset side effects for that transition should not run.

## File Structure

| File                      | Responsibility                                                                 |
| ------------------------- | ------------------------------------------------------------------------------ |
| `index.ts`                | Public exports.                                                                |
| `primitive.tsx`           | Public compound namespace and root provider shell.                             |
| `primitive-root-state.ts` | Root state, filtering, option registry, callbacks, and hidden input state.     |
| `primitive-label.tsx`     | Label registration and label association.                                      |
| `primitive-trigger.tsx`   | Trigger ARIA, open behavior, keyboard navigation, and typeahead.               |
| `primitive-value.tsx`     | Selected label and placeholder rendering.                                      |
| `primitive-input.tsx`     | Search input ownership and search-list keyboard handling.                      |
| `primitive-items.tsx`     | Listbox, options, item registration, empty state, and status parts.            |
| `primitive-popup.tsx`     | Portal, popup container, and positioner integration.                           |
| `presets.tsx`             | Standard PharmaSys select composition.                                         |
| `entity-select.tsx`       | Entity id adapter.                                                             |
| `presets-types.ts`        | Public preset types.                                                           |
| `hooks/*`                 | Preset state, search, highlight, validation, focus, and hover-detail behavior. |
| `components/*`            | Preset visual subcomponents.                                                   |
| `utils/*`                 | Primitive and preset utilities.                                                |

## Maintenance Guidelines

- Keep app screens on `PharmaEntityComboboxSelect` or `PharmaComboboxSelect` unless custom markup is required.
- Keep `itemToStringValue` stable and unique for every option in the same list.
- Prefer `selectedItem` over placeholder-only workarounds when a saved id is loaded before its option list.
- Add primitive behavior only when a real PharmaSys call site needs it.
- Keep visual highlight behavior in the preset and submitted value changes in the primitive selection flow.
