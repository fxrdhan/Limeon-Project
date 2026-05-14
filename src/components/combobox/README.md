# Combobox Component Documentation

## Overview

`@/components/combobox` provides the combobox/select implementation used by PharmaSys forms and data-entry flows. The module has a primitive layer and an app preset layer:

- Typed primitive: `createTypedCombobox`, a local compound component factory for custom combobox compositions.
- App presets: `PharmaComboboxSelect` for arbitrary item types and `PharmaEntityComboboxSelect` for common `{ id, name }` entity options.

The component supports single selection, controlled or uncontrolled open state, controlled or uncontrolled selected value, searchable option lists, keyboard navigation, hidden form submission, portal-based popup positioning, required-state feedback, create actions, and optional hover detail popovers.

Use the app presets for normal product screens. Use the typed primitive only when a screen needs a custom layout that the preset cannot express.

## Import

```tsx
import {
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
  items={categories}
  valueId={formData.category_id}
  onValueIdChange={valueId => updateField('category_id', valueId)}
  field={{
    label: 'Kategori',
    name: 'category_id',
    required: true,
  }}
  display={{
    placeholder: 'Pilih Kategori',
  }}
/>;
```

Use `selectedItem` when the saved id can exist before the option list has finished loading.

```tsx
<PharmaEntityComboboxSelect
  items={supplierOptions}
  valueId={supplierId}
  selectedItem={selectedSupplier}
  onValueIdChange={(valueId, item) => {
    setSupplierId(valueId);
    setSelectedSupplier(item);
  }}
  field={{
    label: 'Supplier',
    name: 'supplier_id',
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
  items={suppliers}
  value={selectedSupplier}
  onValueChange={setSelectedSupplier}
  item={{
    toLabel: supplier => supplier.name,
    toValue: supplier => supplier.id,
    isEqualToValue: (item, value) => item.id === value.id,
  }}
  field={{
    label: 'Supplier',
    name: 'supplier_id',
  }}
  display={{
    renderOptionMeta: supplier => supplier.code,
  }}
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
  items={[...statusOptions]}
  value={status}
  onValueChange={setStatus}
  item={{
    toLabel: value => statusLabels[value],
    toValue: value => value,
  }}
  field={{
    label: 'Status',
    name: 'status',
    required: true,
  }}
  display={{
    indicator: 'radio',
  }}
  search={{
    enabled: false,
  }}
/>;
```

Use `createTypedCombobox` only when a screen needs custom UI composition that
the presets cannot express. The raw primitive is internal; public custom
composition should use a typed namespace so `Root`, `List`, `Collection`, and
`Item` share the same value type.

For typed primitive compositions, declare disabled options on
`Root.isItemDisabled`. The typed `Item` intentionally does not expose a
`disabled` prop, so keyboard navigation, ARIA state, and rendered option state
share one canonical disabled source.

```tsx
type Supplier = {
  id: string;
  name: string;
};

const SupplierCombobox = createTypedCombobox<Supplier>();

<SupplierCombobox.Root
  items={suppliers}
  value={selectedSupplier}
  onValueChange={setSelectedSupplier}
  itemToStringLabel={supplier => supplier.name}
  itemToStringValue={supplier => supplier.id}
  name="supplier_id"
  autoHighlight
>
  <SupplierCombobox.Label>Supplier</SupplierCombobox.Label>
  <SupplierCombobox.Trigger>
    <SupplierCombobox.Value placeholder="Pilih Supplier" />
  </SupplierCombobox.Trigger>
  <SupplierCombobox.Portal>
    <SupplierCombobox.Positioner sideOffset={4}>
      <SupplierCombobox.Popup>
        <SupplierCombobox.Input
          aria-label="Cari supplier"
          placeholder="Cari..."
        />
        <SupplierCombobox.List>
          {supplier => (
            <SupplierCombobox.Item key={supplier.id}>
              {supplier.name}
            </SupplierCombobox.Item>
          )}
        </SupplierCombobox.List>
        <SupplierCombobox.Empty>Tidak ada data</SupplierCombobox.Empty>
      </SupplierCombobox.Popup>
    </SupplierCombobox.Positioner>
  </SupplierCombobox.Portal>
</SupplierCombobox.Root>;
```

## State Boundary Between Primitive and Presets

The primitive layer owns generic combobox mechanics. `Combobox.Root` is
responsible for the selected `value`, popup `open` state, search `inputValue`,
`highlightedIndex`, option registration, item selection, form submission,
registered labels, ARIA ids, outside-press dismissal, focus-out dismissal, and
native form reset behavior.

Each primitive state slot can be controlled or uncontrolled:

| State slot         | Controlled props                   | Uncontrolled props                         |
| ------------------ | ---------------------------------- | ------------------------------------------ |
| Selected value     | `value`, `onValueChange`           | `defaultValue`                             |
| Popup visibility   | `open`, `onOpenChange`             | `defaultOpen`                              |
| Search input       | `inputValue`, `onInputValueChange` | `defaultInputValue`                        |
| Highlighted option | `highlightedIndex`, callbacks      | `defaultHighlightedIndex`, `autoHighlight` |
| Filtered options   | `filteredItems`, `filter={null}`   | `items`, optional `filter`                 |

Callbacks receive cancelable details. If a callback calls `details.cancel()`,
the primitive does not apply its internal transition. Controlled callers still
own the final state and must update their controlled props when they accept a
requested transition.

The app preset is a controlled consumer of the primitive, not a second
independent combobox implementation. `PharmaComboboxSelect` computes
PharmaSys-specific state before it reaches `Combobox.Root`: ranked search
results, visible item limits, the effective highlighted index, validation
feedback, focus restore intent, selected-option scrolling, keyboard scroll
frames, hover detail state, and create-action availability.

Because the preset owns ranked search, it passes `filteredItems={visibleItems}`
and `filter={null}` to the primitive. Because the preset owns the search box
lifecycle, it passes controlled `inputValue` and clears that value after close or
after an uncanceled selection. Because the preset owns visual highlight policy,
it passes controlled `highlightedIndex` while the primitive still owns option
registration, ARIA active-descendant wiring, and selection commits.

Selection remains a primitive transition. The preset can observe and decorate
selection, but `Combobox.Item` and `Combobox.Root` still perform the actual
commit, emit `onValueChange`, close the popup, and serialize the hidden form
value through `itemToStringValue`. After an uncanceled value change, the preset
resets search, hover detail, keyboard-hover suppression, and search-navigation
focus.

`PharmaEntityComboboxSelect` is only an id adapter over
`PharmaComboboxSelect`. It resolves `valueId` to an item, preserves unavailable
saved ids with a neutral fallback value, and maps selected items back to ids. It
does not own popup, keyboard, search, validation, or hover behavior.

When adding behavior, use this boundary:

- Put generic, layout-agnostic combobox mechanics in the primitive.
- Put PharmaSys UI policy in the preset, including ranked search, validation
  overlays, animated highlights, hover detail, create actions, and virtual-list
  scroll coordination.
- Keep entity id resolution in `PharmaEntityComboboxSelect`.
- Avoid mirroring the same state in both layers unless the preset is
  intentionally controlling a primitive state slot.

## App Presets

### `PharmaEntityComboboxSelect`

`PharmaEntityComboboxSelect` is the preferred preset for id-backed entity fields. It accepts items with at least this shape:

```ts
type EntityComboboxItem = {
  id: string;
  name: string;
};
```

| Prop              | Type                               | Description                                                                                                                        |
| ----------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `items`           | `readonly Item[]`                  | Available options.                                                                                                                 |
| `valueId`         | `string`                           | Current submitted id. Use `''` for empty selection.                                                                                |
| `onValueIdChange` | `(valueId, item, details) => void` | Called when selection changes.                                                                                                     |
| `selectedItem`    | `Item \| null`                     | Optional item for the current id when it is not present in `items`.                                                                |
| `item`            | Entity item conversion config      | Optional overrides for label, submitted value, equality, disabled, empty, and hover-detail data behavior. Defaults to `name`/`id`. |
| `field`           | Field metadata config              | Label, id, name, form, required state, and ARIA overrides.                                                                         |
| `interaction`     | Interaction config                 | Disabled, read-only, tab order, and controlled open-state behavior.                                                                |
| `display`         | Display config                     | Placeholder, empty text, root class, indicator, and option renderers.                                                              |
| `search`          | Search config                      | Search enablement, placeholder, and visible item limit.                                                                            |
| `popup`           | Popup config                       | Popup class, portal container, and width matching.                                                                                 |
| `validation`      | Validation config                  | Required-field validation overlay configuration.                                                                                   |
| `creation`        | Create action config               | Create action rendered when no exact option exists.                                                                                |
| `hoverDetail`     | Hover-detail config                | Hover-detail behavior, async fetch, and fetch-error handling.                                                                      |

If `valueId` is not empty and neither `items` nor `selectedItem` can resolve it, the preset keeps the hidden form value intact and displays a neutral fallback label.

### `PharmaComboboxSelect`

`PharmaComboboxSelect` is the generic app preset. It should be used when the selected value is an object or scalar that needs custom string conversion.

| Prop            | Type                      | Description                                                                                                                                                  |
| --------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `items`         | `readonly Item[]`         | Options displayed by the select.                                                                                                                             |
| `value`         | `Item \| null`            | Selected item.                                                                                                                                               |
| `onValueChange` | `(item, details) => void` | Called after the selected item changes.                                                                                                                      |
| `item`          | Item conversion config    | `toLabel`, `toValue`, optional equality, disabled, empty-value, and hover-detail data mapping. `toValue` should be stable and unique within the option list. |
| `field`         | Field metadata config     | Trigger id, label, hidden input name, form id, required state, and ARIA overrides.                                                                           |
| `interaction`   | Interaction config        | Disabled, read-only, tab order, controlled popup state, and open-state callback.                                                                             |
| `display`       | Display config            | Root class, placeholder, empty text, indicator, custom option content, and option metadata.                                                                  |
| `search`        | Search config             | Search enablement, search placeholder, and visible item limit.                                                                                               |
| `popup`         | Popup config              | Popup surface class, portal container ref, and anchor-width matching.                                                                                        |
| `validation`    | Validation config         | Required-field validation overlay configuration.                                                                                                             |
| `creation`      | Create action config      | Create action rendered when no exact option exists.                                                                                                          |
| `hoverDetail`   | Hover-detail config       | Hover-detail enablement, delay, async data fetch, and fetch-error callback.                                                                                  |

When `required` is set, preset validation is enabled by default. Set
`validation.enabled` to `false` to opt out of preset overlay feedback and
`aria-invalid` state.

Required preset fields also render a separate native validation proxy. The
submitted hidden input remains a plain submitted value, while the proxy lets
browser form validation block empty required comboboxes and route focus back to
the trigger. This native required proxy remains active when `required` is true,
even if `validation.enabled` is `false`.

## Typed Primitive API

The `Combobox` name below refers to a typed namespace returned by
`createTypedCombobox<Value>()`, not a public raw export.

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
| `Combobox.Item`          | Selectable option scoped to a `List` or `Collection` item callback.                          |
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

`Combobox.Portal` renders into `document.body` unless `container` or
`containerRef` is provided. Prefer `containerRef` when the portal host is
created by React in the same render tree; the primitive resolves the ref after
the host mounts instead of snapshotting `ref.current` during render.

`Combobox.Positioner` defaults to `placement="bottom-start"` and `matchAnchorWidth={true}`. Set `matchAnchorWidth={false}` when popup content needs a custom width while keeping the popup at least as wide as the trigger.

### Render Props

`Combobox.Trigger` and `Combobox.Item` accept `render={element}` or `render={(props, state) => element}`. The generated props include ARIA attributes, event handlers, refs, class names, styles, and data attributes. In the typed primitive, `Combobox.Item` receives its value and index from the surrounding `List` or `Collection` callback; do not pass `value` or `index`.

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

Passing `field.name` renders a hidden input. Its value comes from `item.toValue(selectedItem)`. For entity selects, the hidden value is the selected id.

For form-bound presets, every `item.toValue` result must be unique. Duplicate
submitted values are rejected because the hidden input would otherwise be
ambiguous.

`field.required` is used for accessibility and preset validation state. It is not native hidden-input constraint validation.

Native form reset restores uncontrolled combobox state to the corresponding
`defaultValue`, `defaultInputValue`, `defaultHighlightedIndex`, and
`defaultOpen` props. Controlled callers receive `form-reset` change callbacks
and must update their controlled state when they want native reset buttons to
change the combobox value.

### Accessibility

The primitive wires the trigger, input, listbox, option ids, active descendant, selected state, disabled state, and registered labels. When a preset is not wrapped by `FormField`, pass `field.label`, `field.aria.label`, or `field.aria.labelledBy` so the control has an accessible name.

### Controlled Open State

When `open` is controlled, `onOpenChange(false, details)` is only a close request. The caller must update `open` for the popup to close. If `details.cancel()` is called, preset side effects for that transition should not run.

## File Structure

| File                      | Responsibility                                                                 |
| ------------------------- | ------------------------------------------------------------------------------ |
| `index.ts`                | Public exports.                                                                |
| `internal/primitive.tsx`  | Internal compound namespace and root provider shell.                           |
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
- Keep `item.toValue` stable and unique for every option in the same list.
- Prefer `selectedItem` over placeholder-only workarounds when a saved id is loaded before its option list.
- Add primitive behavior only when a real PharmaSys call site needs it.
- Keep visual highlight behavior in the preset and submitted value changes in the primitive selection flow.
